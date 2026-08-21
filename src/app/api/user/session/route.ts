import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { getDynamicQuizGuardStatus } from '@/lib/quizGuard';
import { getDynamicGuardMessage } from '@/lib/groqMessageGenerator';
import { UserNameSchema } from '@/lib/validation';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { getStudentGracePeriodStatus, isDummyCollege } from '@/lib/collegeNormalization';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(ip, 30);
  if (!rl.isAllowed) return rateLimitResponse();

  try {
    const body = await req.json();
    const validation = UserNameSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userName } = validation.data;
    const guard = await getDynamicQuizGuardStatus();

    // Check if user already attempted today — Strictly ONE QUESTION PER DAY
    const existingAttempt = await dataService.getUserAttemptToday(userName, guard.quizDate);

    if (existingAttempt) {
      const alreadyAttemptedMsg = await getDynamicGuardMessage('ALREADY_ATTEMPTED', "You have already attempted today's quiz. Come back tomorrow!");
      return NextResponse.json({
        success: true,
        userName,
        guardState: 'ALREADY_ATTEMPTED',
        isOpen: false,
        message: alreadyAttemptedMsg,

        attempt: {
          isCorrect: existingAttempt.isCorrect,
          score: existingAttempt.score,
          bonusPoints: existingAttempt.bonusPoints,
          totalPoints: existingAttempt.totalPoints,
          responseTimeMs: existingAttempt.responseTimeMs,
        },
      });
    }

    // Backend enforcement: Check 5-day grace period for valid registration key & password
    const cleanUser = userName.trim();
    const profile = await dataService.getUserProfile(cleanUser);

    if (profile) {
      const graceStatus = getStudentGracePeriodStatus(profile);
      if (graceStatus.isBeyondGracePeriod) {
        if (!profile.collegeDepartmentId) {
          return NextResponse.json({
            success: true,
            userName: cleanUser,
            guardState: 'REGISTRATION_KEY_REQUIRED',
            isOpen: false,
            message: 'A valid registration key is required to continue. Please complete your profile with the key provided by your college/department administrator.',
          });
        }
        if (!profile.passwordHash) {
          return NextResponse.json({
            success: true,
            userName: cleanUser,
            guardState: 'PASSWORD_REQUIRED',
            isOpen: false,
            message: 'Please set a secure password in your profile to continue using the application.',
          });
        }
      }
    } else {
      // If no profile record exists yet, check if student has historical attempts older than 5 days
      const userAttempts = await dataService.getUserAttempts(cleanUser);
      if (userAttempts && userAttempts.length > 0) {
        const earliest = userAttempts.reduce((earliest: Date, a: any) => {
          const d = new Date(a.createdAt || a.quizDate);
          return d < earliest ? d : earliest;
        }, new Date());
        const graceStatus = getStudentGracePeriodStatus(earliest);
        if (graceStatus.isBeyondGracePeriod) {
          return NextResponse.json({
            success: true,
            userName: cleanUser,
            guardState: 'PROFILE_INCOMPLETE',
            isOpen: false,
            message: 'Your 5-day grace period has expired. Please complete your student profile with your college registration key and password to continue.',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      userName,
      guardState: guard.state,
      isOpen: guard.isOpen,
      message: guard.message,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
}

