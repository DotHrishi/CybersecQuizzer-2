import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { getDynamicQuizGuardStatus } from '@/lib/quizGuard';
import { getDynamicGuardMessage } from '@/lib/groqMessageGenerator';
import { UserNameSchema } from '@/lib/validation';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

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
