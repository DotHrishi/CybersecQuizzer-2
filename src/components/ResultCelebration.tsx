'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy, CheckCircle2, Frown, ArrowRight,
  Award, Zap, BarChart2,
  Timer, Star
} from 'lucide-react';
import Link from 'next/link';

interface ResultCelebrationProps {
  isCorrect: boolean;
  score: number;
  bonusPoints: number;
  totalPoints: number;
  responseTimeMs: number;
  message: string;
  userName: string;
}

export default function ResultCelebration({
  isCorrect,
  score,
  bonusPoints,
  totalPoints,
  responseTimeMs,
  message,
  userName,
}: ResultCelebrationProps) {

  /* ── Confetti ── */
  useEffect(() => {
    if (!isCorrect) return;
    const count    = 200;
    const defaults = { origin: { y: 0.6 }, zIndex: 999 };
    const fire     = (ratio: number, opts: confetti.Options) =>
      confetti({ ...defaults, ...opts, particleCount: Math.floor(count * ratio) });

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2,  { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1,  { spread: 120, startVelocity: 45 });
  }, [isCorrect]);

  /* Speed tier label */
  const speedLabel =
    responseTimeMs < 5000   ? { label: 'Lightning Fast', color: 'text-amber-500' } :
    responseTimeMs < 15000  ? { label: 'Quick',          color: 'text-blue-500' } :
    responseTimeMs < 30000  ? { label: 'Steady',         color: 'text-slate-500' } :
                              { label: 'Deliberate',     color: 'text-slate-400' };

  return (
    <div className="max-w-xl mx-auto my-8 card p-6 sm:p-8 space-y-6">

      {isCorrect ? (
        <>
          {/* ── Correct: icon + headline ── */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <span className="badge badge-green text-[11px]">Success Verified</span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{message}</h2>
              <p className="text-xs text-slate-500 mt-1">
                Well done, <strong className="text-slate-700 dark:text-slate-300">{userName}</strong>!
              </p>
            </div>
          </div>

          {/* ── Score breakdown ── */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="kpi-card text-center">
              <span className="kpi-label justify-center">
                <Star className="w-3 h-3" /> Base
              </span>
              <span className="kpi-value text-xl">+{score.toFixed(2)}</span>
            </div>
            <div className="kpi-card text-center">
              <span className="kpi-label justify-center">
                <Zap className="w-3 h-3 text-amber-500" /> Speed
              </span>
              <span className="kpi-value text-xl">+{bonusPoints.toFixed(2)}</span>
            </div>
            <div className="kpi-card text-center bg-[#0f172a] dark:bg-white border-[#0f172a] dark:border-white">
              <span className="kpi-label text-slate-300 dark:text-slate-600 justify-center">
                <Trophy className="w-3 h-3 text-amber-400" /> Total
              </span>
              <span className="text-xl font-extrabold text-white dark:text-slate-900">
                {totalPoints.toFixed(2)}
              </span>
            </div>
          </div>

          {/* ── Response time ── */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl card-sunken text-xs">
            <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Timer className="w-4 h-4" />
              Response Time
            </span>
            <span className="flex items-center gap-2">
              <strong className="font-mono font-bold text-slate-900 dark:text-white">
                {(responseTimeMs / 1000).toFixed(2)}s
              </strong>
              <span className={`text-[11px] font-bold ${speedLabel.color}`}>
                {speedLabel.label}
              </span>
            </span>
          </div>
        </>
      ) : (
        <>
          {/* ── Incorrect: icon + headline ── */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <Frown className="w-8 h-8" />
            </div>
            <span className="badge badge-slate text-[11px]">Attempt Recorded</span>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{message}</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Keep building your security skills — try again tomorrow!
              </p>
            </div>
          </div>

          {/* ── Minimal result row ── */}
          <div className="card-sunken rounded-xl px-4 py-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Points earned today</span>
            <span className="font-bold text-slate-900 dark:text-white">0.00 pts</span>
          </div>
          <div className="card-sunken rounded-xl px-4 py-3 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Timer className="w-3.5 h-3.5" />
              Response time
            </span>
            <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
              {(responseTimeMs / 1000).toFixed(2)}s
            </span>
          </div>
        </>
      )}

      {/* ── CTA buttons ── */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2.5 justify-center">
        <Link href="/leaderboard" className="btn btn-primary btn-sm gap-2">
          <Award className="w-3.5 h-3.5" />
          <span>Check Leaderboard</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-60" />
        </Link>
        <Link href="/report" className="btn btn-secondary btn-sm gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
          <span>My Report</span>
        </Link>
      </div>
    </div>
  );
}

