import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminRequest, hashPassword } from '@/lib/auth';
import { dataService } from '@/lib/dataService';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

// GET: Fetch all admin credentials
export async function GET(req: NextRequest) {
  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized Super Admin access.' },
      { status: 401 }
    );
  }

  try {
    const admins = await dataService.getAllAdmins();
    return NextResponse.json({ success: true, admins });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to retrieve admins.' },
      { status: 500 }
    );
  }
}

// POST: Add new admin account
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(`superadmin_admins:${ip}`, 30);
  if (!rl.isAllowed) return rateLimitResponse();

  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized Super Admin access.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { email, username, password, name, active } = body;

    // Validate identifier (username or email)
    const rawIdentifier = (username || email || '').trim();
    if (!rawIdentifier || typeof rawIdentifier !== 'string' || rawIdentifier.length < 3) {
      return NextResponse.json(
        { success: false, message: 'Valid username or email address (at least 3 characters) is required.' },
        { status: 400 }
      );
    }
    const cleanIdentifier = rawIdentifier.toLowerCase();

    // Validate password
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // Check if username/email already registered
    const existing = await dataService.getAdminByEmail(cleanIdentifier);
    if (existing) {
      return NextResponse.json(
        { success: false, message: `An admin account for "${cleanIdentifier}" already exists.` },
        { status: 409 }
      );
    }

    // Hash password and store
    const passwordHash = hashPassword(password);
    const newAdmin = await dataService.createAdmin({
      email: cleanIdentifier,
      passwordHash,
      name: typeof name === 'string' ? name.trim() : undefined,
      active: active !== undefined ? Boolean(active) : true,
    });

    return NextResponse.json({
      success: true,
      message: `Admin account for "${cleanIdentifier}" created successfully.`,
      admin: newAdmin,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create admin.' },
      { status: 500 }
    );
  }
}

// PUT: Update admin account status, name, or password
export async function PUT(req: NextRequest) {
  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized Super Admin access.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { id, active, name, password } = body;

    const adminId = Number(id);
    if (!adminId || isNaN(adminId)) {
      return NextResponse.json(
        { success: false, message: 'Valid admin ID is required.' },
        { status: 400 }
      );
    }

    const updatePayload: { name?: string; active?: boolean; passwordHash?: string } = {};

    if (active !== undefined) {
      updatePayload.active = Boolean(active);
    }
    if (name !== undefined) {
      updatePayload.name = String(name).trim();
    }
    if (password) {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json(
          { success: false, message: 'Password must be at least 6 characters long.' },
          { status: 400 }
        );
      }
      updatePayload.passwordHash = hashPassword(password);
    }

    const updated = await dataService.updateAdmin(adminId, updatePayload);

    return NextResponse.json({
      success: true,
      message: 'Admin account updated successfully.',
      admin: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update admin.' },
      { status: 500 }
    );
  }
}

// DELETE: Remove admin account
export async function DELETE(req: NextRequest) {
  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized Super Admin access.' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { success: false, message: 'Valid admin ID is required.' },
        { status: 400 }
      );
    }

    const deleted = await dataService.deleteAdmin(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Failed to delete admin.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Admin account #${id} deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete admin.' },
      { status: 500 }
    );
  }
}
