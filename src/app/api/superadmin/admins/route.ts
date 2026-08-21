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

// POST: Add new admin account associated with a college/department
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

    const { email, password, name, collegeId, collegeName, collegeIdentifier, collegeDepartmentId, active } = validation.data;
    const cleanEmail = email.trim().toLowerCase();

    let targetCollegeId = collegeId;
    let targetDepartmentName: string | undefined;

    // Handle combined form: if collegeName is provided, find or create the college
    if (!targetCollegeId && (collegeName || collegeIdentifier)) {
      const cleanColName = (collegeName || '').trim();
      let cleanIdent = (collegeIdentifier || '').trim().toUpperCase();

      if (!cleanIdent && cleanColName) {
        const words = cleanColName.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
        if (words.length === 1) {
          cleanIdent = words[0].slice(0, 10).toUpperCase();
        } else {
          cleanIdent = words.map(w => w[0]).join('').slice(0, 8).toUpperCase();
        }
      }

      // Check if college exists by name or identifier
      let foundCollege = cleanColName ? await dataService.findCollegeByName(cleanColName) : null;
      if (!foundCollege && cleanIdent) {
        foundCollege = await dataService.findCollegeByIdentifier(cleanIdent);
      }

      if (foundCollege) {
        targetCollegeId = foundCollege.id;
      } else {
        // Ensure identifier uniqueness
        let finalIdent = cleanIdent || `COL-${Date.now().toString().slice(-4)}`;
        const existingIdent = await dataService.findCollegeByIdentifier(finalIdent);
        if (existingIdent) {
          finalIdent = `${finalIdent}-${Date.now().toString().slice(-4)}`;
        }

        const createdCollege = await dataService.createCollege({
          name: cleanColName,
          identifier: finalIdent,
        });
        targetCollegeId = createdCollege.id;
      }
    }

    if (collegeDepartmentId) {
      const dept = await dataService.getDepartmentById(collegeDepartmentId);
      if (!dept) {
        return NextResponse.json({ success: false, message: 'The selected department does not exist.' }, { status: 400 });
      }
      targetCollegeId = dept.collegeId;
      targetDepartmentName = dept.departmentName;
    }

    if (targetCollegeId) {
      const college = await dataService.getCollegeById(targetCollegeId);
      if (!college) {
        return NextResponse.json({ success: false, message: 'The selected college does not exist.' }, { status: 400 });
      }

      // Enforce strictly 1 admin per college
      const existingCollegeAdmins = await dataService.getAdminsByCollegeId(targetCollegeId);
      if (existingCollegeAdmins && existingCollegeAdmins.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `An admin account (${existingCollegeAdmins[0].email}) already exists for "${college.name}". Only one admin is permitted per college.`,
          },
          { status: 409 }
        );
      }
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
      collegeId: targetCollegeId,
      collegeDepartmentId,
      active: active ?? true,
    });

    const assignmentDesc = targetDepartmentName
      ? `assigned to ${newAdmin.college?.name || 'College'} (${targetDepartmentName})`
      : `assigned to ${newAdmin.college?.name || 'All Departments'}`;

    return NextResponse.json({
      success: true,
      message: `Admin account for "${cleanEmail}" created successfully and ${assignmentDesc}.`,
      admin: newAdmin,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create admin.' },
      { status: 500 }
    );
  }
}

// PUT: Update admin account status, name, college, department, or password
export async function PUT(req: NextRequest) {
  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized Super Admin access.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { id, active, name, password, collegeId, collegeDepartmentId } = body;

    const adminId = Number(id);
    if (!adminId || isNaN(adminId)) {
      return NextResponse.json(
        { success: false, message: 'Valid admin ID is required.' },
        { status: 400 }
      );
    }

    const updatePayload: {
      name?: string;
      active?: boolean;
      passwordHash?: string;
      collegeId?: number | null;
      collegeDepartmentId?: number | null;
    } = {};

    if (active !== undefined) {
      updatePayload.active = Boolean(active);
    }
    if (name !== undefined) {
      updatePayload.name = String(name).trim();
    }
    if (collegeDepartmentId !== undefined) {
      if (collegeDepartmentId === null) {
        updatePayload.collegeDepartmentId = null;
      } else {
        const deptId = Number(collegeDepartmentId);
        const dept = await dataService.getDepartmentById(deptId);
        if (!dept) {
          return NextResponse.json({ success: false, message: 'Selected department not found.' }, { status: 400 });
        }
        updatePayload.collegeDepartmentId = dept.id;
        updatePayload.collegeId = dept.collegeId;
      }
    } else if (collegeId !== undefined) {
      if (collegeId === null) {
        updatePayload.collegeId = null;
        updatePayload.collegeDepartmentId = null;
      } else {
        const colId = Number(collegeId);
        const col = await dataService.getCollegeById(colId);
        if (!col) {
          return NextResponse.json({ success: false, message: 'Selected college not found.' }, { status: 400 });
        }
        updatePayload.collegeId = col.id;
      }
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
