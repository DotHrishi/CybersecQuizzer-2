import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { verifyAdminRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { isAuth, admin } = await verifyAdminRequest(req);
  if (!isAuth || !admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized admin request.' }, { status: 401 });
  }

  try {
    const scope = admin.isSuperAdmin
      ? {}
      : {
          collegeDepartmentId: admin.collegeDepartmentId || null,
          collegeId: admin.collegeId || null,
        };

    const stats = await dataService.getStatsByScope(scope);

    const rawDept = admin.collegeDepartment || null;
    const sanitizedDept = rawDept ? {
      ...rawDept,
      registrationKey: (rawDept.registrationKey && !rawDept.registrationKey.startsWith('PENDING_KEY_'))
        ? rawDept.registrationKey
        : '',
    } : null;

    return NextResponse.json({
      success: true,
      collegeId: admin.collegeId,
      collegeDepartmentId: admin.collegeDepartmentId,
      college: admin.college || admin.collegeDepartment?.college || null,
      collegeDepartment: sanitizedDept,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
