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
      const cleanKey = (department.registrationKey && !department.registrationKey.startsWith('PENDING_KEY_'))
        ? department.registrationKey
        : '';

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
          registrationKey: cleanKey,
          collegeId: department.collegeId,
        },
        departments: [{
          id: department.id,
          departmentName: department.departmentName,
          registrationKey: cleanKey,
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
        department: departments.length === 1 ? {
          ...departments[0],
          registrationKey: (departments[0].registrationKey && !departments[0].registrationKey.startsWith('PENDING_KEY_')) ? departments[0].registrationKey : '',
        } : null,
        departments: departments.map(d => ({
          id: d.id,
          departmentName: d.departmentName,
          registrationKey: (d.registrationKey && !d.registrationKey.startsWith('PENDING_KEY_')) ? d.registrationKey : '',
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
        departments: allDepts.map(d => ({
          ...d,
          registrationKey: (d.registrationKey && !d.registrationKey.startsWith('PENDING_KEY_')) ? d.registrationKey : '',
        })),
      });
    }

    // 4. Default / Fallback Admin (e.g. Legacy admin or unassigned college admin)
    const allColleges = await dataService.getAllColleges();
    const fallbackCollege = allColleges[0] || null;
    const fallbackDepts = fallbackCollege ? await dataService.getDepartmentsByCollege(fallbackCollege.id) : await dataService.getAllDepartments();

    return NextResponse.json({
      success: true,
      isDepartmentAdmin: false,
      college: fallbackCollege ? {
        id: fallbackCollege.id,
        name: fallbackCollege.name,
        identifier: fallbackCollege.identifier,
      } : null,
      department: fallbackDepts.length === 1 ? {
        ...fallbackDepts[0],
        registrationKey: (fallbackDepts[0].registrationKey && !fallbackDepts[0].registrationKey.startsWith('PENDING_KEY_')) ? fallbackDepts[0].registrationKey : '',
      } : null,
      departments: fallbackDepts.map(d => ({
        id: d.id,
        departmentName: d.departmentName,
        registrationKey: (d.registrationKey && !d.registrationKey.startsWith('PENDING_KEY_')) ? d.registrationKey : '',
        collegeId: d.collegeId,
        studentCount: (d as any).studentCount || 0,
      })),
    });
  } catch (err: any) {
    console.error('Error fetching admin registration keys:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST: Create a new registration key under the authenticated admin's college
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
      return NextResponse.json({ success: false, message: 'Department / stream name is required.' }, { status: 400 });
    }

    const keyValidation = validateRegistrationKeyFormat(registrationKey);
    if (!keyValidation.isValid) {
      return NextResponse.json({ success: false, message: keyValidation.message }, { status: 400 });
    }

    const cleanKey = normalizeRegistrationKey(registrationKey);

    // Determine target college with fallback
    let targetCollegeId: number | undefined = undefined;
    if (admin.isSuperAdmin) {
      targetCollegeId = Number(collegeId || admin.collegeId);
    } else if (admin.collegeId) {
      targetCollegeId = admin.collegeId;
    } else if (admin.collegeDepartmentId) {
      const dept = await dataService.getDepartmentById(admin.collegeDepartmentId);
      if (dept) targetCollegeId = dept.collegeId;
    } else if (collegeId) {
      targetCollegeId = Number(collegeId);
    }

    if (!targetCollegeId) {
      const colleges = await dataService.getAllColleges();
      if (colleges.length > 0) {
        targetCollegeId = colleges[0].id;
      }
    }

    if (!targetCollegeId) {
      return NextResponse.json(
        { success: false, message: 'No college institution found to assign this registration key to.' },
        { status: 400 }
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
      message: `Registration key "${created.registrationKey}" created successfully!`,
      department: created,
    });
  } catch (err: any) {
    console.error('Error creating registration key:', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to create registration key.' },
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

// PATCH: Update College Identifier Code by the college admin
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.isAuth || !auth.admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized admin access.' }, { status: 401 });
  }

  const { admin } = auth;
  const targetCollegeId = admin.collegeId || (admin.collegeDepartmentId && admin.college?.id ? admin.college.id : null);

  if (!targetCollegeId && !admin.isSuperAdmin) {
    return NextResponse.json({ success: false, message: 'Forbidden: No assigned college found for your account.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { identifier } = body;

    if (!identifier || typeof identifier !== 'string' || identifier.trim().length < 2) {
      return NextResponse.json({ success: false, message: 'Identifier code must be at least 2 characters.' }, { status: 400 });
    }

    const cleanIdent = identifier.trim().toUpperCase().replace(/\s+/g, '-');

    // Check uniqueness
    const existing = await dataService.findCollegeByIdentifier(cleanIdent);
    if (existing && existing.id !== targetCollegeId) {
      return NextResponse.json({ success: false, message: `Identifier "${cleanIdent}" is already in use by another college.` }, { status: 400 });
    }

    const updated = await dataService.updateCollege(targetCollegeId!, { identifier: cleanIdent });

    return NextResponse.json({
      success: true,
      message: `College identifier updated to "${cleanIdent}" successfully!`,
      college: updated,
    });
  } catch (err: any) {
    console.error('Error updating college identifier:', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to update college identifier.' }, { status: 500 });
  }
}
