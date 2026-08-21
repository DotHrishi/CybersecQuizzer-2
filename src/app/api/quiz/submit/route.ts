import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { calculateScore } from '@/lib/scoring';
import { getQuizGuardStatus } from '@/lib/quizGuard';
import { QuizSubmissionSchema } from '@/lib/validation';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { activeSessions } from '@/lib/sessionStore';
import { verifySubmissionAntiCheat } from '@/lib/antiCheat';
import { verifySessionToken } from '@/lib/sessionToken';
import { getStudentGracePeriodStatus, isDummyCollege } from '@/lib/collegeNormalization';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(ip, 20);
  if (!rl.isAllowed) return rateLimitResponse();

  try {
    const body = await req.json();
    const validation = QuizSubmissionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { sessionId, userName, selectedOption, selectedOptionText, sessionToken } = validation.data;
    let session = activeSessions.get(sessionId);

    // Serverless fallback: in-memory session may be missing on a different instance.
    // Recover session data from the cryptographically signed token instead.
    if (!session && sessionToken) {
      const tokenPayload = verifySessionToken(sessionToken);
      if (tokenPayload && tokenPayload.sessionId === sessionId && tokenPayload.userName.toLowerCase() === userName.toLowerCase()) {
        session = {
          questionId: tokenPayload.questionId,
          startTime: tokenPayload.startTime,
          userName: tokenPayload.userName,
          quizDate: tokenPayload.quizDate,
          expectedOptionKey: tokenPayload.expectedOptionKey,
        };
      }
    }

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired quiz session. Please start a new attempt.' },
        { status: 400 }
      );
    }

    if (session.userName.toLowerCase() !== userName.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: 'Session identity mismatch.' },
        { status: 403 }
      );
    }

    const guard = getQuizGuardStatus();
    if (!guard.isOpen) {
      return NextResponse.json(
        { success: false, state: guard.state, message: guard.message },
        { status: 403 }
      );
    }

    // Backend enforcement: Check 5-day grace period for valid registration key & password
    const cleanSessionUser = session.userName.trim();
    const profile = await dataService.getUserProfile(cleanSessionUser);

    if (profile) {
      const graceStatus = getStudentGracePeriodStatus(profile);
      if (graceStatus.isBeyondGracePeriod) {
        if (!profile.collegeDepartmentId) {
          activeSessions.delete(sessionId);
          return NextResponse.json(
            {
              success: false,
              state: 'REGISTRATION_KEY_REQUIRED',
              message: 'A valid registration key is required to continue. Please complete your profile with the key provided by your college/department administrator.',
            },
            { status: 403 }
          );
        }
        if (!profile.passwordHash) {
          activeSessions.delete(sessionId);
          return NextResponse.json(
            {
              success: false,
              state: 'PASSWORD_REQUIRED',
              message: 'Please set a secure password in your profile to continue using the application.',
            },
            { status: 403 }
          );
        }
      }
    } else {
      const userAttempts = await dataService.getUserAttempts(cleanSessionUser);
      if (userAttempts && userAttempts.length > 0) {
        const earliest = userAttempts.reduce((earliest: Date, a: any) => {
          const d = new Date(a.createdAt || a.quizDate);
          return d < earliest ? d : earliest;
        }, new Date());
        const graceStatus = getStudentGracePeriodStatus(earliest);
        if (graceStatus.isBeyondGracePeriod) {
          activeSessions.delete(sessionId);
          return NextResponse.json(
            {
              success: false,
              state: 'PROFILE_INCOMPLETE',
              message: 'Your 5-day grace period has expired. Please complete your student profile with your college registration key and password to continue.',
            },
            { status: 403 }
          );
        }
      }
    }

    // Check if attempt already exists in DB for this date — Strictly ONE QUESTION PER DAY
    const existingAttempt = await dataService.getUserAttemptToday(session.userName, session.quizDate);

    if (existingAttempt) {
      activeSessions.delete(sessionId);
      return NextResponse.json(
        { success: false, message: "You have already attempted today's quiz. Only one question per day is allowed." },
        { status: 409 }
      );
    }




    // Server-side anti-cheat verification
    const antiCheat = verifySubmissionAntiCheat(session.startTime);
    if (!antiCheat.isValid) {
      activeSessions.delete(sessionId);
      return NextResponse.json(
        { success: false, message: 'Suspiciously fast automated submission detected. Please answer naturally.' },
        { status: 400 }
      );
    }

    const responseTimeMs = antiCheat.verifiedResponseTimeMs;

    // Compare by answer TEXT (not position key) — works correctly regardless of option shuffling.
    // Fetch the question to get all option texts and determine the correct answer text.
    const question = await dataService.getQuestionById(session.questionId);
    if (!question) {
      activeSessions.delete(sessionId);
      return NextResponse.json({ success: false, message: 'Question not found.' }, { status: 404 });
    }

    const correctKey = String(question.correctOption || 'A').trim().toUpperCase();
    const optionMap: Record<string, string> = {
      A: (question as any).optionA || '',
      B: (question as any).optionB || '',
      C: (question as any).optionC || '',
      D: (question as any).optionD || '',
    };
    const correctOptionText = optionMap[correctKey] || '';
    const isCorrect = correctOptionText.trim().toLowerCase() === selectedOptionText.trim().toLowerCase();


    const now = new Date();
    const scoreResult = calculateScore(isCorrect, responseTimeMs, now);

    // Privacy Mandate: Store ONLY User Name, Quiz Date, Correct or Wrong, Score, Bonus Points, Total Points, Response Time, Timestamp.
    // DO NOT store question ID or selected option.
    const attemptRecord = await dataService.createUserAttempt({
      userName: session.userName,
      quizDate: session.quizDate,
      isCorrect: scoreResult.isCorrect,
      score: scoreResult.score,
      bonusPoints: scoreResult.bonusPoints,
      totalPoints: scoreResult.totalPoints,
      responseTimeMs: Math.round(scoreResult.responseTimeMs),
      category: (question as any).category || 'General Security',
    });


    // Invalidate active session to prevent double submission
    activeSessions.delete(sessionId);

    return NextResponse.json({
      success: true,
      isCorrect: attemptRecord.isCorrect,
      score: attemptRecord.score,
      bonusPoints: attemptRecord.bonusPoints,
      totalPoints: attemptRecord.totalPoints,
      responseTimeMs: attemptRecord.responseTimeMs,
      quizDate: attemptRecord.quizDate,
      message: isCorrect ? 'Correct! Well done!' : 'Better luck next time.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
