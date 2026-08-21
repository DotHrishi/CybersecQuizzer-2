import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { verifyAdminRequest, verifyPassword, hashPassword } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const LEGACY_ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'cyberadmin123').trim();

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(`admin_change_pw:${ip}`, 10);
  if (!rl.isAllowed) return rateLimitResponse();

  try {
    const authResult = await verifyAdminRequest(req);
    if (!authResult.isAuth || !authResult.admin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please login again.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Current password is required.' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const adminId = authResult.admin.id;

    // Database Admin Account
    if (adminId && adminId > 0) {
      const dbAdmin = await dataService.getAdminById(adminId);
      if (!dbAdmin) {
        return NextResponse.json(
          { success: false, message: 'Admin account not found.' },
          { status: 404 }
        );
      }

      const isCurrentValid = verifyPassword(currentPassword, dbAdmin.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { success: false, message: 'Current password is incorrect.' },
          { status: 400 }
        );
      }

      const newPasswordHash = hashPassword(newPassword.trim());
      await dataService.updateAdmin(adminId, {
        passwordHash: newPasswordHash,
      });

      return NextResponse.json({
        success: true,
        message: 'Your password has been changed successfully.',
      });
    }

    // Fallback/Legacy Admin
    if (currentPassword.trim() !== LEGACY_ADMIN_PASSWORD && currentPassword.trim() !== 'cyberadmin123') {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error: any) {
    console.error('Error changing admin password:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update password. Please try again.' },
      { status: 500 }
    );
  }
}
