import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { ProfileSchema } from '@/lib/validation';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import {
  getStudentGracePeriodStatus,
  validateStudentPassword,
} from '@/lib/collegeNormalization';
import { hashPassword } from '@/lib/auth';

const QUIZ_TOPICS = [
  'General Security',
  'Disaster Recovery',
  'Malware',
  'Security Operations',
  'Cloud Security',
  'Threat Intelligence',
  'Security Tools',
  'Incident Response',
  'Social Engineering',
  'IAM & Governance',
  'Network Security',
  'Secure Coding',
  'Data Security',
  'Compliance & Standards',
  'Cryptography',
  'Identity & Access Management',
  'Security Architecture',
  'Network Attacks',
  'Physical Security',
  'Web Security',
];

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
    const attempts = await dataService.getUserAttempts(nickname);
    const categoryCountsMap = await dataService.getQuestionsCategoryCounts();
    const totalBankQuestions = Math.max(
      1,
      Object.values(categoryCountsMap).reduce((acc: number, count: number) => acc + (count || 0), 0)
    );
    const totalSolved = attempts.length;
    const correctCount = attempts.filter((a: any) => a.isCorrect).length;

    // Grace period calculations
    const graceStatus = getStudentGracePeriodStatus(profile);
    const hasDepartment = Boolean(profile?.collegeDepartmentId || profile?.collegeDepartment?.id);
    const hasPassword = Boolean(profile?.passwordHash);
    const requiresRegistrationKeySetup = graceStatus.isBeyondGracePeriod && (!hasDepartment || !hasPassword);

    // Calculate 7-day consecutive streak
    const uniqueDates = Array.from(
      new Set(
        attempts
          .map((a: any) => {
            if (a.quizDate) return a.quizDate;
            if (a.createdAt) return new Date(a.createdAt).toISOString().split('T')[0];
            return null;
          })
          .filter(Boolean)
      )
    ).sort();

    let maxStreak = uniqueDates.length > 0 ? 1 : 0;
    let currentStreak = uniqueDates.length > 0 ? 1 : 0;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] as string);
      const curr = new Date(uniqueDates[i] as string);
      const diffTime = curr.getTime() - prev.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
    }

    const badge7DayStreak = {
      id: 'badge-7-day-streak',
      title: '7-Day Streak',
      subtitle: 'Consistent Learner',
      description: 'Awarded for attempting daily quiz challenges for 7 consecutive days.',
      image: '/badges/badge-7-day-streak.png',
      requiredQuestions: 7,
      currentCount: Math.min(7, Math.max(currentStreak, maxStreak)),
      isUnlocked: maxStreak >= 7,
      badgeType: 'milestone' as const,
    };

    const badge25Questions = {
      id: 'badge-25-questions',
      title: '25 Questions Achiever',
      subtitle: 'Daily Quiz Achiever',
      description: 'Awarded for solving 25 cybersecurity daily quiz questions.',
      image: '/badges/badge-25-questions.png',
      requiredQuestions: 25,
      currentCount: totalSolved,
      isUnlocked: totalSolved >= 25,
      badgeType: 'milestone' as const,
    };

    const badge50Questions = {
      id: 'badge-50-questions',
      title: '50 Questions Completed',
      subtitle: 'Cyber Expert In Training',
      description: 'Awarded for solving 50 cybersecurity daily quiz questions.',
      image: '/badges/badge-50-questions.png',
      requiredQuestions: 50,
      currentCount: totalSolved,
      isUnlocked: totalSolved >= 50,
      badgeType: 'milestone' as const,
    };

    const badgeAllQuestions = {
      id: 'badge-all-questions',
      title: 'Cyber Master',
      subtitle: 'Mastered All Topics',
      description: `Ultimate honour awarded for solving all ${totalBankQuestions} questions in the cybersecurity challenge curriculum.`,
      image: '/badges/badge-all-questions.png',
      requiredQuestions: totalBankQuestions,
      currentCount: Math.min(totalSolved, totalBankQuestions),
      isUnlocked: totalSolved >= totalBankQuestions,
      badgeType: 'milestone' as const,
    };

    const topicBadges = QUIZ_TOPICS.map((topic) => {
      const topicBank = categoryCountsMap[topic] || 5;
      const attemptsInTopic = attempts.filter((a: any) => (a.category || 'General Security') === topic).length;
      const isUnlocked = attemptsInTopic >= topicBank && topicBank > 0;
      return {
        id: `badge-topic-${topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        title: topic,
        subtitle: 'Topic Specialist',
        description: `Awarded for completing all ${topicBank} questions in ${topic}.`,
        image: '/badges/badge-topic-specialist.png',
        requiredQuestions: topicBank,
        currentCount: Math.min(attemptsInTopic, topicBank),
        isUnlocked,
        category: topic,
        badgeType: 'topic' as const,
      };
    });

    const unlockedTopicCount = topicBadges.filter((b) => b.isUnlocked).length;

    const safeProfile = profile ? {
      id: profile.id,
      fullName: profile.fullName,
      nickname: profile.nickname,
      isNicknameSame: profile.isNicknameSame,
      email: profile.email,
      emailType: profile.emailType,
      collegeId: profile.collegeId,
      collegeDepartmentId: profile.collegeDepartmentId,
      college: profile.college || profile.collegeDepartment?.college ? {
        id: profile.collegeDepartment?.college?.id || profile.college?.id,
        name: profile.collegeDepartment?.college?.name || profile.college?.name,
        identifier: profile.collegeDepartment?.college?.identifier || profile.college?.identifier,
      } : null,
      collegeDepartment: profile.collegeDepartment ? {
        id: profile.collegeDepartment.id,
        departmentName: profile.collegeDepartment.departmentName,
        registrationKey: profile.collegeDepartment.registrationKey,
      } : null,
      collegeName: profile.collegeDepartment?.college?.name || profile.college?.name || null,
      departmentName: profile.collegeDepartment?.departmentName || null,
      hasPassword,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    } : null;

    return NextResponse.json({
      success: true,
      profile: safeProfile,
      gracePeriod: {
        isBeyondGracePeriod: graceStatus.isBeyondGracePeriod,
        daysRemaining: graceStatus.daysRemaining,
        hoursRemaining: graceStatus.hoursRemaining,
        requiresRegistrationKeySetup,
        requiresCollegeUpdate: requiresRegistrationKeySetup,
        requiresPassword: graceStatus.isBeyondGracePeriod && !hasPassword,
      },
      stats: {
        totalSolved,
        correctCount,
        totalBankQuestions,
        totalTopics: QUIZ_TOPICS.length,
        unlockedTopicCount,
        currentStreak,
        maxStreak,
      },
      milestoneBadges: [badge7DayStreak, badge25Questions, badge50Questions, badgeAllQuestions],
      topicBadges,
      badges: [badge7DayStreak, badge25Questions, badge50Questions, badgeAllQuestions, ...topicBadges],
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

    const { fullName, nickname, isNicknameSame, email, emailType, registrationKey, password } = validation.data;
    const cleanNickname = (isNicknameSame ? fullName : nickname).trim();

    // Check existing profile to evaluate grace period and existing password
    const existingProfile = await dataService.getUserProfile(cleanNickname);
    const graceStatus = getStudentGracePeriodStatus(existingProfile);

    // Registration Key Validation & Department Resolution
    const cleanRegKey = (registrationKey || '').trim();
    if (cleanRegKey) {
      const dept = await dataService.findDepartmentByRegistrationKey(cleanRegKey);
      if (!dept) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_REGISTRATION_KEY',
            message: 'Invalid registration key. Please enter a valid key provided by your administrator.',
          },
          { status: 400 }
        );
      }
    } else {
      // If registration key not provided in this update request
      if (existingProfile?.collegeDepartmentId) {
        // Keep existing permanent department association!
      } else if (graceStatus.isBeyondGracePeriod) {
        return NextResponse.json(
          {
            success: false,
            error: 'REGISTRATION_KEY_REQUIRED',
            message: 'A valid registration key is required to continue after the 5-day grace period.',
          },
          { status: 400 }
        );
      }
    }

    // Password Validation & Hashing
    let passwordHash: string | undefined = undefined;
    if (password && password.trim()) {
      const pwdValidation = validateStudentPassword(password.trim());
      if (!pwdValidation.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_PASSWORD',
            message: pwdValidation.message || 'Password does not meet requirements.',
          },
          { status: 400 }
        );
      }
      passwordHash = hashPassword(password.trim());
    } else {
      if (graceStatus.isBeyondGracePeriod && !existingProfile?.passwordHash) {
        return NextResponse.json(
          {
            success: false,
            error: 'PASSWORD_REQUIRED',
            message: 'A password is required to continue after the 5-day grace period. (Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number).',
          },
          { status: 400 }
        );
      }
      if (existingProfile?.passwordHash) {
        passwordHash = existingProfile.passwordHash;
      }
    }

    const savedProfile = await dataService.upsertUserProfile({
      fullName,
      nickname: cleanNickname,
      isNicknameSame,
      email,
      emailType,
      registrationKey: cleanRegKey || undefined,
      passwordHash,
    });

    const safeProfile = {
      id: savedProfile.id,
      fullName: savedProfile.fullName,
      nickname: savedProfile.nickname,
      isNicknameSame: savedProfile.isNicknameSame,
      email: savedProfile.email,
      emailType: savedProfile.emailType,
      collegeId: savedProfile.collegeId,
      collegeDepartmentId: savedProfile.collegeDepartmentId,
      college: savedProfile.college || savedProfile.collegeDepartment?.college ? {
        id: savedProfile.collegeDepartment?.college?.id || savedProfile.college?.id,
        name: savedProfile.collegeDepartment?.college?.name || savedProfile.college?.name,
        identifier: savedProfile.collegeDepartment?.college?.identifier || savedProfile.college?.identifier,
      } : null,
      collegeDepartment: savedProfile.collegeDepartment ? {
        id: savedProfile.collegeDepartment.id,
        departmentName: savedProfile.collegeDepartment.departmentName,
      } : null,
      collegeName: savedProfile.collegeDepartment?.college?.name || savedProfile.college?.name || null,
      departmentName: savedProfile.collegeDepartment?.departmentName || null,
      hasPassword: Boolean(savedProfile.passwordHash),
      createdAt: savedProfile.createdAt,
      updatedAt: savedProfile.updatedAt,
    };

    return NextResponse.json({
      success: true,
      message: 'Profile saved successfully!',
      profile: safeProfile,
    });
  } catch (error: any) {
    console.error('Error saving user profile:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: error.message || 'Failed to save profile' },
      { status: 500 }
    );
  }
}
