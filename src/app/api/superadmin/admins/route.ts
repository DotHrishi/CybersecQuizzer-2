import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminRequest, hashPassword } from '@/lib/auth';
import { dataService } from '@/lib/dataService';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { AdminCreateSchema } from '@/lib/validation';

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

// POST: Add new admin account associated with a college
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
    const validation = AdminCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error.errors[0]?.message || 'Validation error',
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, password, name, collegeId, active } = validation.data;
    const cleanEmail = email.trim().toLowerCase();

    // Verify college exists
    const college = await dataService.getCollegeById(collegeId);
    if (!college) {
      return NextResponse.json(
        { success: false, message: 'The selected college does not exist.' },
        { status: 400 }
      );
    }

    // Check if email already registered
    const existing = await dataService.getAdminByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json(
        { success: false, message: `An admin account for "${cleanEmail}" already exists.` },
        { status: 409 }
      );
    }

    // Hash password and store
    const passwordHash = hashPassword(password);
    const newAdmin = await dataService.createAdmin({
      email: cleanEmail,
      passwordHash,
      name: name?.trim() || undefined,
      collegeId: college.id,
      active: active ?? true,
    });

    return NextResponse.json({
      success: true,
      message: `Admin account for "${cleanEmail}" created successfully and assigned to ${college.name}.`,
      admin: newAdmin,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create admin.' },
      { status: 500 }
    );
  }
}

// PUT: Update admin account status, name, college, or password
export async function PUT(req: NextRequest) {
  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized Super Admin access.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { id, active, name, password, collegeId } = body;

    const adminId = Number(id);
    if (!adminId || isNaN(adminId)) {
      return NextResponse.json(
        { success: false, message: 'Valid admin ID is required.' },
        { status: 400 }
      );
    }

    const updatePayload: { name?: string; active?: boolean; passwordHash?: string; collegeId?: number } = {};

    if (active !== undefined) {
      updatePayload.active = Boolean(active);
    }
    if (name !== undefined) {
      updatePayload.name = String(name).trim();
    }
    if (collegeId !== undefined) {
      const colId = Number(collegeId);
      const col = await dataService.getCollegeById(colId);
      if (!col) {
        return NextResponse.json(
          { success: false, message: 'Selected college not found.' },
          { status: 400 }
        );
      }
      updatePayload.collegeId = col.id;
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

