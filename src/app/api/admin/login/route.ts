import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { verifyPassword, signAdminToken } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const LEGACY_ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'cyberadmin123').trim();

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(`admin_login:${ip}`, 15);
  if (!rl.isAllowed) return rateLimitResponse();

  try {
    const body = await req.json();
    const { email, username, identifier, password } = body;
    const rawIdentifier = (identifier || username || email || '').trim();

    if (!rawIdentifier || typeof rawIdentifier !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Both username/email and password are required.' },
        { status: 400 }
      );
    }

    const cleanIdentifier = rawIdentifier.toLowerCase();

    // 1. Check database for created Admin User
    const admin = await dataService.getAdminByEmail(cleanIdentifier);


    if (admin) {
      if (!admin.active) {
        return NextResponse.json(
          { success: false, message: 'This admin account has been disabled. Please contact the Super Admin.' },
          { status: 403 }
        );
      }

      const isValid = verifyPassword(password, admin.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'Invalid email or password.' },
          { status: 401 }
        );
      }

      const token = signAdminToken({
        id: admin.id,
        email: admin.email,
        name: admin.name,
      });

      return NextResponse.json({
        success: true,
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name || admin.email,
        },
        message: 'Admin authenticated successfully.',
      });
    }

    // 2. Default/Legacy mode: username 'admin' with password 'cyberadmin123' (or env ADMIN_PASSWORD)
    if (
      (cleanIdentifier === 'admin' || cleanIdentifier === 'admin@system' || cleanIdentifier === 'admin@school.edu') &&
      (password.trim() === 'cyberadmin123' || password.trim() === LEGACY_ADMIN_PASSWORD)
    ) {
      const token = signAdminToken({
        id: -1,
        email: 'admin',
        name: 'Administrator',
      });

      return NextResponse.json({
        success: true,
        token,
        admin: {
          id: -1,
          email: 'admin',
          name: 'Administrator',
        },
        message: 'Admin authenticated successfully.',
      });
    }


    return NextResponse.json(
      { success: false, message: 'Invalid email or password.' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
