import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { verifySuperAdminRequest } from '@/lib/auth';
import { DepartmentSchema } from '@/lib/validation';

export async function GET(req: NextRequest) {
  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized Super Admin request.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const collegeIdStr = searchParams.get('collegeId');

    if (collegeIdStr) {
      const collegeId = parseInt(collegeIdStr, 10);
      if (isNaN(collegeId)) {
        return NextResponse.json({ success: false, message: 'Invalid college ID.' }, { status: 400 });
      }
      const departments = await dataService.getDepartmentsByCollege(collegeId);
      return NextResponse.json({ success: true, departments });
    }

    const departments = await dataService.getAllDepartments();
    return NextResponse.json({ success: true, departments });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized Super Admin request.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = DepartmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const department = await dataService.createDepartment(validation.data);
    return NextResponse.json({
      success: true,
      department,
      message: 'Department and registration key created successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized Super Admin request.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, departmentName, registrationKey } = body;

    if (!id || typeof id !== 'number') {
      return NextResponse.json({ success: false, message: 'Department ID is required.' }, { status: 400 });
    }

    const department = await dataService.updateDepartment(id, { departmentName, registrationKey });
    return NextResponse.json({
      success: true,
      department,
      message: 'Department updated successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized Super Admin request.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');

    if (!idStr) {
      return NextResponse.json({ success: false, message: 'Department ID is required.' }, { status: 400 });
    }

    const id = parseInt(idStr, 10);
    await dataService.deleteDepartment(id);

    return NextResponse.json({
      success: true,
      message: 'Department deleted successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
