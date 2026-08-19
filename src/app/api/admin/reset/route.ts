import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { verifyAdminRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { isAuth } = await verifyAdminRequest(req);
  if (!isAuth) {
    return NextResponse.json({ success: false, message: 'Unauthorized admin request.' }, { status: 401 });
  }

  try {
    const { target } = await req.json();

    if (target === 'leaderboard') {
      await dataService.resetLeaderboard();
      return NextResponse.json({ success: true, message: 'All user attempt records cleared. Leaderboards reset.' });
    }

    return NextResponse.json({ success: false, message: 'Invalid reset target specified.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
