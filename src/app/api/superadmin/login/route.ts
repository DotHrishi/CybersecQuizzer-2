import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminPassword, signSuperAdminToken } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(`superadmin_login:${ip}`, 10);
  if (!rl.isAllowed) return rateLimitResponse();

  try {
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Super Admin password is required.' },
        { status: 400 }
      );
    }

    if (!verifySuperAdminPassword(password)) {
      return NextResponse.json(
        { success: false, message: 'Invalid Super Admin password.' },
        { status: 401 }
      );
    }

    const token = signSuperAdminToken();
    return NextResponse.json({
      success: true,
      token,
      message: 'Super Admin access granted.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
