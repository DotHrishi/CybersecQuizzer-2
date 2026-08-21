import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { verifyAdminRequest } from '@/lib/auth';
import { normalizeRegistrationKey, validateRegistrationKeyFormat } from '@/lib/collegeNormalization';

// GET: Fetch registration key(s) for the authenticated admin's scope
export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.isAuth || !auth.admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized admin access.' }, { status: 401 });
  }

  const { admin } = auth;

  try {
    // 1. Department-scoped Admin
    if (admin.collegeDepartmentId) {
      const department = await dataService.getDepartmentById(admin.collegeDepartmentId);
      if (!department) {
        return NextResponse.json(
          { success: false, message: 'Assigned department could not be found.' },
          { status: 404 }
        );
      }

      const college = department.college || (admin.collegeId ? await dataService.getCollegeById(admin.collegeId) : null);

      return NextResponse.json({
        success: true,
        isDepartmentAdmin: true,
        college: college ? {
          id: college.id,
          name: college.name,
          identifier: college.identifier,
        } : null,
        department: {
          id: department.id,
          departmentName: department.departmentName,
          registrationKey: department.registrationKey,
          collegeId: department.collegeId,
        },
        departments: [{
          id: department.id,
          departmentName: department.departmentName,
          registrationKey: department.registrationKey,
          collegeId: department.collegeId,
        }],
      });
    }

    // 2. College-scoped Admin (manages all departments for their college)
    if (admin.collegeId) {
      const college = await dataService.getCollegeById(admin.collegeId);
      const departments = await dataService.getDepartmentsByCollege(admin.collegeId);

      return NextResponse.json({
        success: true,
        isDepartmentAdmin: false,
        college: college ? {
          id: college.id,
          name: college.name,
          identifier: college.identifier,
        } : null,
        department: departments.length === 1 ? departments[0] : null,
        departments: departments.map(d => ({
          id: d.id,
          departmentName: d.departmentName,
          registrationKey: d.registrationKey,
          collegeId: d.collegeId,
          studentCount: (d as any).studentCount || 0,
        })),
      });
    }

    // 3. Super Admin
    if (admin.isSuperAdmin) {
      const allColleges = await dataService.getAllColleges();
      const allDepts = await dataService.getAllDepartments();

      return NextResponse.json({
        success: true,
        isSuperAdmin: true,
        colleges: allColleges,
        departments: allDepts,
      });
    }

    return NextResponse.json(
      { success: false, message: 'No college or department scope assigned to your admin account.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error fetching admin registration keys:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST: Create a new department with registration key under the authenticated admin's college
export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.isAuth || !auth.admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized admin access.' }, { status: 401 });
  }

  const { admin } = auth;

  try {
    const body = await req.json();
    const { departmentName, registrationKey, collegeId } = body;

    if (!departmentName || typeof departmentName !== 'string' || departmentName.trim().length === 0) {
      return NextResponse.json({ success: false, message: 'Department name is required.' }, { status: 400 });
    }

    const keyValidation = validateRegistrationKeyFormat(registrationKey);
    if (!keyValidation.isValid) {
      return NextResponse.json({ success: false, message: keyValidation.message }, { status: 400 });
    }

    const cleanKey = normalizeRegistrationKey(registrationKey);

    // Determine target college with strict authorization
    let targetCollegeId: number;
    if (admin.isSuperAdmin) {
      targetCollegeId = Number(collegeId || admin.collegeId);
      if (!targetCollegeId) {
        return NextResponse.json({ success: false, message: 'College ID is required.' }, { status: 400 });
      }
    } else if (admin.collegeId) {
      targetCollegeId = admin.collegeId;
      if (collegeId && Number(collegeId) !== admin.collegeId) {
        return NextResponse.json(
          { success: false, message: 'Forbidden: You cannot create departments for another college.' },
          { status: 403 }
        );
      }
    } else if (admin.collegeDepartmentId && admin.college?.id) {
      targetCollegeId = admin.college.id;
    } else {
      return NextResponse.json(
        { success: false, message: 'Forbidden: You do not have permission to create departments.' },
        { status: 403 }
      );
    }

    // Check duplicate key
    const existing = await dataService.findDepartmentByRegistrationKey(cleanKey);
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Registration key "${cleanKey}" is already in use. Please choose another key.` },
        { status: 400 }
      );
    }

    const created = await dataService.createDepartment({
      collegeId: targetCollegeId,
      departmentName: departmentName.trim(),
      registrationKey: cleanKey,
    });

    return NextResponse.json({
      success: true,
      message: `Department "${created.departmentName}" with key "${created.registrationKey}" created successfully!`,
      department: created,
    });
  } catch (err: any) {
    console.error('Error creating department registration key:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to create department registration key.' },
      { status: 400 }
    );
  }
}

// PUT: Update registration key for an authorized department
export async function PUT(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.isAuth || !auth.admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized admin access.' }, { status: 401 });
  }

  const { admin } = auth;

  try {
    const body = await req.json();
    const { departmentId, registrationKey } = body;

    const keyValidation = validateRegistrationKeyFormat(registrationKey);
    if (!keyValidation.isValid) {
      return NextResponse.json({ success: false, message: keyValidation.message }, { status: 400 });
    }

    const cleanKey = normalizeRegistrationKey(registrationKey);

    // Determine target department ID with strict authorization
    let targetDeptId: number;

    if (admin.isSuperAdmin) {
      if (!departmentId) {
        return NextResponse.json({ success: false, message: 'Department ID is required for Super Admin.' }, { status: 400 });
      }
      targetDeptId = Number(departmentId);
    } else if (admin.collegeDepartmentId) {
      // Department-scoped admin CANNOT modify other departments
      if (departmentId && Number(departmentId) !== admin.collegeDepartmentId) {
        return NextResponse.json(
          { success: false, message: 'Forbidden: You cannot modify registration keys for another department.' },
          { status: 403 }
        );
      }
      targetDeptId = admin.collegeDepartmentId;
    } else if (admin.collegeId) {
      // College-scoped admin can modify departments within their college
      if (!departmentId) {
        const collegeDepts = await dataService.getDepartmentsByCollege(admin.collegeId);
        if (collegeDepts.length === 1) {
          targetDeptId = collegeDepts[0].id;
        } else {
          return NextResponse.json({ success: false, message: 'Please specify which department key to update.' }, { status: 400 });
        }
      } else {
        targetDeptId = Number(departmentId);
      }

      // Verify the target department actually belongs to the admin's college
      const targetDept = await dataService.getDepartmentById(targetDeptId);
      if (!targetDept || Number(targetDept.collegeId) !== Number(admin.collegeId)) {
        return NextResponse.json(
          { success: false, message: 'Forbidden: You cannot modify departments outside your assigned college.' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: 'Forbidden: No authorized college or department found on your admin session.' },
        { status: 403 }
      );
    }

    // Check duplicate key
    const existing = await dataService.findDepartmentByRegistrationKey(cleanKey);
    if (existing && Number(existing.id) !== targetDeptId) {
      return NextResponse.json(
        { success: false, message: `Registration key "${cleanKey}" is already in use by another department. Please choose another key.` },
        { status: 400 }
      );
    }

    const updated = await dataService.updateRegistrationKey(targetDeptId, cleanKey);

    return NextResponse.json({
      success: true,
      message: `Registration key updated to "${updated.registrationKey}" successfully! Existing registered students remain permanently associated.`,
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
