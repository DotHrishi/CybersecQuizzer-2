import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
import { ProfileSchema } from '@/lib/validation';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

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

    return NextResponse.json({
      success: true,
      profile: profile || null,
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
