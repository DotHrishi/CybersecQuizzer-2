import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminRequest } from '@/lib/auth';
import { dataService } from '@/lib/dataService';
import { CollegeSchema } from '@/lib/validation';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { DUMMY_COLLEGE_IDENTIFIER, DUMMY_COLLEGE_NAME, normalizeCollegeName } from '@/lib/collegeNormalization';

// GET: Fetch all configured colleges with student and admin counts
export async function GET(req: NextRequest) {
  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized Super Admin access.' },
      { status: 401 }
    );
  }

  try {
    // Ensure dummy college exists
    await dataService.getOrCreateDummyCollege();
    const colleges = await dataService.getAllColleges();
    return NextResponse.json({ success: true, colleges });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to retrieve colleges.' },
      { status: 500 }
    );
  }
}

// POST: Configure a new college / school
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(`superadmin_colleges:${ip}`, 30);
  if (!rl.isAllowed) return rateLimitResponse();

  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized Super Admin access.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const validation = CollegeSchema.safeParse(body);

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

    const { name, identifier } = validation.data;
    const normName = normalizeCollegeName(name);
    const cleanIdentifier = identifier.trim().toUpperCase();

    // Check if college name already exists
    const existingName = await dataService.findCollegeByName(normName);
    if (existingName) {
      return NextResponse.json(
        { success: false, message: `A college with name "${existingName.name}" already exists.` },
        { status: 409 }
      );
    }

    // Check if identifier already exists
    const existingIdentifier = await dataService.getCollegeByIdentifier(cleanIdentifier);
    if (existingIdentifier) {
      return NextResponse.json(
        { success: false, message: `A college with identifier "${cleanIdentifier}" already exists.` },
        { status: 409 }
      );
    }

    const college = await dataService.createCollege({
      name: normName,
      identifier: cleanIdentifier,
    });

    return NextResponse.json({
      success: true,
      message: `College "${college.name}" created successfully.`,
      college,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create college.' },
      { status: 500 }
    );
  }
}

// PUT: Update an existing college
export async function PUT(req: NextRequest) {
  if (!verifySuperAdminRequest(req)) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized Super Admin access.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { id, name, identifier } = body;

    const collegeId = Number(id);
    if (!collegeId || isNaN(collegeId)) {
      return NextResponse.json(
        { success: false, message: 'Valid college ID is required.' },
        { status: 400 }
      );
    }

    const existing = await dataService.getCollegeById(collegeId);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'College not found.' },
        { status: 404 }
      );
    }

    if (existing.identifier === DUMMY_COLLEGE_IDENTIFIER || existing.name === DUMMY_COLLEGE_NAME) {
      return NextResponse.json(
        { success: false, message: 'System placeholder dummy college cannot be edited.' },
        { status: 400 }
      );
    }

    const updatePayload: { name?: string; identifier?: string } = {};

    if (name) {
      const normName = normalizeCollegeName(name);
      if (normName !== existing.name) {
        const match = await dataService.findCollegeByName(normName);
        if (match && match.id !== collegeId) {
          return NextResponse.json(
            { success: false, message: `Another college with name "${match.name}" already exists.` },
            { status: 409 }
          );
        }
        updatePayload.name = normName;
      }
    }

    if (identifier) {
      const cleanIdentifier = identifier.trim().toUpperCase();
      if (cleanIdentifier !== existing.identifier) {
        const match = await dataService.getCollegeByIdentifier(cleanIdentifier);
        if (match && match.id !== collegeId) {
          return NextResponse.json(
            { success: false, message: `Another college with identifier "${cleanIdentifier}" already exists.` },
            { status: 409 }
          );
        }
        updatePayload.identifier = cleanIdentifier;
      }
    }

    const updated = await dataService.updateCollege(collegeId, updatePayload);

    return NextResponse.json({
      success: true,
      message: 'College updated successfully.',
      college: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update college.' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a college
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
        { success: false, message: 'Valid college ID is required.' },
        { status: 400 }
      );
    }

    const existing = await dataService.getCollegeById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'College not found.' },
        { status: 404 }
      );
    }

    if (existing.identifier === DUMMY_COLLEGE_IDENTIFIER || existing.name === DUMMY_COLLEGE_NAME) {
      return NextResponse.json(
        { success: false, message: 'System placeholder dummy college cannot be deleted.' },
        { status: 400 }
      );
    }

    await dataService.deleteCollege(id);

    return NextResponse.json({
      success: true,
      message: `College "${existing.name}" deleted successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete college.' },
      { status: 500 }
    );
  }
}
