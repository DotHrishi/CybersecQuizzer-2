import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { RegistrationKeyValidateSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegistrationKeyValidateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          valid: false,
          message: parsed.error.errors[0]?.message || 'Registration key is required.',
        },
        { status: 400 }
      );
    }

    const { registrationKey } = parsed.data;
    const department = await dataService.findDepartmentByRegistrationKey(registrationKey);

    if (!department || !department.college) {
      return NextResponse.json(
        {
          valid: false,
          message: 'Invalid registration key. Please check with your college/department administrator.',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      college: {
        id: department.college.id,
        name: department.college.name,
        identifier: department.college.identifier,
      },
      department: {
        id: department.id,
        name: department.departmentName,
      },
    });
  } catch (err: any) {
    console.error('Registration key validation error:', err);
    return NextResponse.json(
      {
        valid: false,
        message: 'Unable to validate registration key at this time.',
      },
      { status: 500 }
    );
  }
}
