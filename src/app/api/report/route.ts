import { NextRequest, NextResponse } from 'next/server';
import { dataService } from '@/lib/dataService';
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
  const rl = checkRateLimit(ip, 30);
  if (!rl.isAllowed) return rateLimitResponse();

  const { searchParams } = new URL(req.url);
  const userName = searchParams.get('userName');

  if (!userName || userName.trim().length < 2) {
    return NextResponse.json(
      { success: false, message: 'Valid user name is required.' },
      { status: 400 }
    );
  }

  const cleanName = userName.trim();

  try {
    const attempts = await dataService.getUserAttempts(cleanName);
    const categoryCountsMap = await dataService.getQuestionsCategoryCounts();
    // Calculate total bank questions across all active categories in DB
    const totalBankQuestionsAll = Math.max(
      1,
      Object.values(categoryCountsMap).reduce((acc: number, count: number) => acc + (count || 0), 0)
    );


    if (attempts.length === 0) {
      // Build empty topicStats for all 20 categories
      const emptyTopicStats = QUIZ_TOPICS.map((category) => {
        const bankCount = categoryCountsMap[category] || 0;
        return {
          category,
          totalBankQuestions: bankCount,
          attemptsCount: 0,
          correctCount: 0,
          wrongCount: 0,
          accuracyPercentage: 0,
          completionProgress: 0,
          avgResponseTimeMs: 0,
          totalPoints: 0,
          masteryLevel: 'Not Started' as const,
        };
      });

      return NextResponse.json({
        success: true,
        stats: {
          userName: cleanName,
          totalAttempts: 0,
          correctAnswers: 0,
          wrongAnswers: 0,
          accuracyPercentage: 0,
          avgResponseTimeMs: 0,
          totalPoints: 0,
          bestRank: 'N/A',
          totalBankQuestionsAll,
          overallCompletionProgress: 0,
          topicStats: emptyTopicStats,
          history: [],
        },
      });
    }

    const totalAttempts = attempts.length;
    const correctAnswers = attempts.filter((a: any) => a.isCorrect).length;
    const wrongAnswers = totalAttempts - correctAnswers;
    const accuracyPercentage = Math.round((correctAnswers / totalAttempts) * 100);
    const totalPoints = attempts.reduce((acc: number, curr: any) => acc + Number(curr.totalPoints || 0), 0);
    const totalTime = attempts.reduce((acc: number, curr: any) => acc + Number(curr.responseTimeMs || 0), 0);
    const avgResponseTimeMs = Math.round(totalTime / totalAttempts);

    // Calculate progress percentage accurately: 0 if 0 attempts, 100% if attempts >= bank, at least 1% if attempts > 0
    const calculateProgressPct = (attemptsCount: number, bankCount: number) => {
      if (attemptsCount === 0) return 0;
      if (bankCount <= 0 || attemptsCount >= bankCount) return 100;
      return Math.max(1, Math.round((attemptsCount / bankCount) * 100));
    };

    const overallCompletionProgress = calculateProgressPct(totalAttempts, totalBankQuestionsAll);

    // Group user attempts by category — preserve the actual stored category
    const categoryAttemptsMap: Record<string, any[]> = {};
    QUIZ_TOPICS.forEach((cat) => {
      categoryAttemptsMap[cat] = [];
    });

    attempts.forEach((att: any) => {
      const cat = (att.category && att.category.trim()) ? att.category.trim() : 'General Security';
      if (!categoryAttemptsMap[cat]) {
        categoryAttemptsMap[cat] = [];
      }
      categoryAttemptsMap[cat].push(att);
    });

    // Compute detailed topicStats for all 20 topics
    const topicStats = QUIZ_TOPICS.map((cat) => {
      const catAttempts = categoryAttemptsMap[cat] || [];
      const attemptsCount = catAttempts.length;
      const correctCount = catAttempts.filter((a: any) => a.isCorrect).length;
      const wrongCount = attemptsCount - correctCount;
      const topicAccuracy = attemptsCount > 0 ? Math.round((correctCount / attemptsCount) * 100) : 0;
      
      const dbBankCount = categoryCountsMap[cat] || 0;
      const bankTotal = Math.max(attemptsCount, dbBankCount);
      const completionProgress = calculateProgressPct(attemptsCount, bankTotal);

      const topicTimeSum = catAttempts.reduce((sum: number, a: any) => sum + Number(a.responseTimeMs || 0), 0);
      const catAvgTime = attemptsCount > 0 ? Math.round(topicTimeSum / attemptsCount) : 0;
      const catPts = catAttempts.reduce((sum: number, a: any) => sum + Number(a.totalPoints || 0), 0);


      let masteryLevel: 'Mastered' | 'Proficient' | 'Developing' | 'Not Started' = 'Not Started';
      if (attemptsCount > 0) {
        if (topicAccuracy >= 80) masteryLevel = 'Mastered';
        else if (topicAccuracy >= 60) masteryLevel = 'Proficient';
        else masteryLevel = 'Developing';
      }

      return {
        category: cat,
        totalBankQuestions: bankTotal,
        attemptsCount,
        correctCount,
        wrongCount,
        accuracyPercentage: topicAccuracy,
        completionProgress,
        avgResponseTimeMs: catAvgTime,
        totalPoints: catPts,
        masteryLevel,
      };
    });


    // Calculate best rank across all users
    const allAttempts = await dataService.getAllAttempts();
    const userTotalsMap = new Map<string, { totalPoints: number; totalTime: number; count: number }>();

    for (const att of allAttempts) {
      const existing = userTotalsMap.get(att.userName) || { totalPoints: 0, totalTime: 0, count: 0 };
      existing.totalPoints += Number(att.totalPoints || 0);
      existing.totalTime += Number(att.responseTimeMs || 0);
      existing.count += 1;
      userTotalsMap.set(att.userName, existing);
    }

    const aggregatedUsers = Array.from(userTotalsMap.entries()).map(([name, data]) => ({
      userName: name,
      pts: data.totalPoints,
      avgTime: Math.round(data.totalTime / data.count),
    }));

    aggregatedUsers.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      return a.avgTime - b.avgTime;
    });

    const userRankIndex = aggregatedUsers.findIndex(
      (u) => u.userName.toLowerCase() === cleanName.toLowerCase()
    );
    const bestRank = userRankIndex !== -1 ? userRankIndex + 1 : 'N/A';

    return NextResponse.json({
      success: true,
      stats: {
        userName: cleanName,
        totalAttempts,
        correctAnswers,
        wrongAnswers,
        accuracyPercentage,
        avgResponseTimeMs,
        totalPoints,
        bestRank,
        totalBankQuestionsAll,
        overallCompletionProgress,
        topicStats,

        history: attempts.map((a: any) => ({
          quizDate: a.quizDate,
          isCorrect: a.isCorrect,
          score: a.score,
          bonusPoints: a.bonusPoints,
          totalPoints: a.totalPoints,
          responseTimeMs: a.responseTimeMs,
          category: a.category || 'General Security',
          createdAt: new Date(a.createdAt).toISOString(),
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
