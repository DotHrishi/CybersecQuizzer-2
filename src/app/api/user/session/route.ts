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

    // Backend enforcement: Check 5-day grace period for valid college & password
    const profile = await dataService.getUserProfile(userName);
    if (profile) {
      const graceStatus = getStudentGracePeriodStatus(profile.createdAt);
      if (graceStatus.isBeyondGracePeriod) {
        if (isDummyCollege(profile.college?.name)) {
          return NextResponse.json({
            success: true,
            userName,
            guardState: 'COLLEGE_REQUIRED',
            isOpen: false,
            message: 'Your college/school information is required to continue. Please update your profile with the exact name provided by your college administrator.',
          });
        }
        if (!profile.passwordHash) {
          return NextResponse.json({
            success: true,
            userName,
            guardState: 'PASSWORD_REQUIRED',
            isOpen: false,
            message: 'Please set a secure password in your profile to continue using the application.',
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

