import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { verifyAdminRequest } from '@/lib/auth';
import { RegistrationKeyUpdateSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.isAuth || !auth.admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
  }

  const { admin } = auth;
  const departmentId = admin.collegeDepartmentId || admin.collegeDepartment?.id;

  if (!departmentId) {
    return NextResponse.json(
      {
        success: false,
        message: 'No specific department assigned to your admin account.',
      },
      { status: 400 }
    );
  }

  try {
    const department = await dataService.getDepartmentById(departmentId);
    if (!department) {
      return NextResponse.json(
        { success: false, message: 'Assigned department could not be found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      department: {
        id: department.id,
        departmentName: department.departmentName,
        registrationKey: department.registrationKey,
        collegeId: department.collegeId,
        college: department.college ? {
          id: department.college.id,
          name: department.college.name,
          identifier: department.college.identifier,
        } : null,
      },
    });
  } catch (err: any) {
    console.error('Error fetching admin registration key:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.isAuth || !auth.admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
  }

  const { admin } = auth;
  const departmentId = admin.collegeDepartmentId || admin.collegeDepartment?.id;

  if (!departmentId) {
    return NextResponse.json(
      {
        success: false,
        message: 'No specific department assigned to your admin account to manage registration keys.',
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = RegistrationKeyUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.errors[0]?.message || 'Invalid registration key.' },
        { status: 400 }
      );
    }

    const { registrationKey } = parsed.data;
    const updated = await dataService.updateRegistrationKey(departmentId, registrationKey);

    return NextResponse.json({
      success: true,
      message: 'Registration key updated successfully! Existing registered students remain unaffected.',
      department: {
        id: updated.id,
        departmentName: updated.departmentName,
        registrationKey: updated.registrationKey,
        college: updated.college ? {
          id: updated.college.id,
          name: updated.college.name,
          identifier: updated.college.identifier,
        } : null,
      },
    });
  } catch (err: any) {
    console.error('Error updating admin registration key:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to update registration key.' },
      { status: 400 }
    );
  }
}
