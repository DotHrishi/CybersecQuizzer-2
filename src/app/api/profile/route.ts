import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { ProfileSchema } from '@/lib/validation';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(ip, 60);
  if (!rl.isAllowed) return rateLimitResponse();

  try {
    const { searchParams } = new URL(req.url);
    const nickname = searchParams.get('nickname');

    if (!nickname) {
      return NextResponse.json(
        { success: false, error: 'MISSING_NICKNAME', message: 'Nickname is required to fetch profile.' },
        { status: 400 }
      );
    }

    const profile = await dataService.getUserProfile(nickname);

    return NextResponse.json({
      success: true,
      profile: profile || null,
    });
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rl = checkRateLimit(ip, 30);
  if (!rl.isAllowed) return rateLimitResponse();

  try {
    const body = await req.json();
    const validation = ProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const profileData = validation.data;
    const savedProfile = await dataService.upsertUserProfile(profileData);

    return NextResponse.json({
      success: true,
      message: 'Profile saved successfully!',
      profile: savedProfile,
    });
  } catch (error: any) {
    console.error('Error saving user profile:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: error.message || 'Failed to save profile' },
      { status: 500 }
    );
  }
}
