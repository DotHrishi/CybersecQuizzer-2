import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { verifyAdminRequest, hashPassword } from '@/lib/auth';
import { validateStudentPassword } from '@/lib/collegeNormalization';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

// GET: List students belonging to the authenticated admin's college
export async function GET(req: NextRequest) {
  const { isAuth, admin } = await verifyAdminRequest(req);
  if (!isAuth || !admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized admin access.' }, { status: 401 });
  }

  try {
    const collegeId = admin.isSuperAdmin ? null : admin.collegeId;
    const students = await dataService.getStudentsByCollege(collegeId);

    // Fetch attempts to attach stats to each student
    const attempts = await dataService.getAttemptsByCollege(collegeId);
    const attemptsByStudent = new Map<string, any[]>();

    for (const a of attempts) {
      const key = a.userName.trim().toLowerCase();
      if (!attemptsByStudent.has(key)) attemptsByStudent.set(key, []);
      attemptsByStudent.get(key)!.push(a);
    }

    const studentsWithStats = students.map(s => {
      const sAttempts = attemptsByStudent.get(s.nickname.trim().toLowerCase()) || [];
      const totalAttempts = sAttempts.length;
      const correctCount = sAttempts.filter((a: any) => a.isCorrect).length;
      const totalPoints = sAttempts.reduce((sum: number, a: any) => sum + Number(a.totalPoints || 0), 0);
      const totalTime = sAttempts.reduce((sum: number, a: any) => sum + Number(a.responseTimeMs || 0), 0);
      const avgResponseTimeMs = totalAttempts > 0 ? Math.round(totalTime / totalAttempts) : 0;

      return {
        id: s.id,
        fullName: s.fullName,
        nickname: s.nickname,
        email: s.email,
        emailType: s.emailType,
        collegeId: s.collegeId,
        college: s.college ? {
          id: s.college.id,
          name: s.college.name,
          identifier: s.college.identifier,
        } : null,
        hasPassword: Boolean(s.passwordHash),
        createdAt: s.createdAt,
        totalAttempts,
        correctCount,
        totalPoints: Number(totalPoints.toFixed(2)),
        avgResponseTimeMs,
      };
    });

    return NextResponse.json({
      success: true,
      collegeId: admin.collegeId,
      college: admin.college,
      students: studentsWithStats,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Reset a student's password
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(`admin_reset_student:${ip}`, 30);
  if (!rl.isAllowed) return rateLimitResponse();

  const { isAuth, admin } = await verifyAdminRequest(req);
  if (!isAuth || !admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized admin access.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { nickname, newPassword } = body;

    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json({ success: false, message: 'Student nickname is required.' }, { status: 400 });
    }

    const cleanNick = nickname.trim();
    const student = await dataService.getUserProfile(cleanNick);

    if (!student) {
      return NextResponse.json({ success: false, message: `Student "${cleanNick}" not found.` }, { status: 404 });
    }

    // Security Check: Verify admin has authorization for this student's college
    if (!admin.isSuperAdmin && admin.collegeId && student.collegeId !== admin.collegeId) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden: You do not have permission to manage students outside your college.',
      }, { status: 403 });
    }

    let passwordToSet = newPassword;
    if (!passwordToSet || typeof passwordToSet !== 'string' || !passwordToSet.trim()) {
      // Auto-generate strong compliant password
      const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const lower = 'abcdefghijkmnopqrstuvwxyz';
      const numbers = '23456789';
      passwordToSet = upper.charAt(Math.floor(Math.random() * upper.length)) +
                      lower.charAt(Math.floor(Math.random() * lower.length)) +
                      numbers.charAt(Math.floor(Math.random() * numbers.length)) +
                      'Pass' + Math.floor(100 + Math.random() * 900);
    } else {
      const validation = validateStudentPassword(passwordToSet.trim());
      if (!validation.isValid) {
        return NextResponse.json({ success: false, message: validation.message }, { status: 400 });
      }
      passwordToSet = passwordToSet.trim();
    }

    const pwdHash = hashPassword(passwordToSet);
    await dataService.resetStudentPassword(cleanNick, pwdHash);

    return NextResponse.json({
      success: true,
      message: `Password for student "${student.fullName || cleanNick}" has been reset successfully.`,
      nickname: cleanNick,
      temporaryPassword: passwordToSet,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
