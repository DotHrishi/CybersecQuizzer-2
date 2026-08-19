import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { verifyAdminRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { isAuth, admin } = await verifyAdminRequest(req);
  if (!isAuth || !admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized admin request.' }, { status: 401 });
  }

  try {
    // Strictly derive collegeId from authenticated admin record
    const collegeId = admin.isSuperAdmin ? null : admin.collegeId;
    const stats = await dataService.getStatsByCollege(collegeId);

    return NextResponse.json({
      success: true,
      collegeId: admin.collegeId,
      college: admin.college,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

