import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { verifyAdminRequest } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(ip, 30);
  if (!rl.isAllowed) return rateLimitResponse();

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get('period') || 'daily').toLowerCase().replace('-', '');

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  try {
    // Check if authenticated admin
    const { isAuth, admin } = await verifyAdminRequest(req);
    const collegeId = isAuth && admin && !admin.isSuperAdmin ? admin.collegeId : null;

    const leaderboard = await dataService.getLeaderboardByCollege(collegeId, period);

    return NextResponse.json({
      success: true,
      period,
      quizDate: todayStr,
      collegeId,
      leaderboard,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

