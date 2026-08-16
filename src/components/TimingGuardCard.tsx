'use client';

import React from 'react';
import Link from 'next/link';
import {
  Clock, Calendar, CheckCircle2, Trophy, BarChart2,
  ShieldAlert, Sparkles, ArrowRight, Timer, User, Shield,
} from 'lucide-react';
import { QuizStatusState } from '@/types/quiz';

interface TimingGuardCardProps {
  state: QuizStatusState;
  message: string;
  userName?: string;
  attempt?: {
    isCorrect: boolean;
    score: number;
    bonusPoints: number;
    totalPoints: number;
    responseTimeMs: number;
  };
}

/* ── State config map ──────────────────────────────────── */
const STATE_CONFIG: Record<
  Exclude<QuizStatusState, 'OPEN'>,
  {
    icon: React.ElementType;
    iconBg: string;
    badge: string;
    badgeText: string;
    title: string;
    subtitle: string;
    broadcastBg: string;
  }
> = {
  BEFORE_WINDOW: {
    icon: Clock,
    iconBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400',
    badge: 'badge-amber',
    badgeText: 'Not Yet Open',
    title: 'Quiz Window Closed',
    subtitle: 'Quiz access opens daily at 10:00 AM IST',
    broadcastBg: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200',
  },
  AFTER_WINDOW: {
    icon: ShieldAlert,
    iconBg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
    badge: 'badge-slate',
    badgeText: 'Session Closed',
    title: 'Daily Quiz Concluded',
    subtitle: 'Session closed at 9:00 PM IST',
    broadcastBg: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200',
  },
  WEEKEND: {
    icon: Calendar,
    iconBg: '',   // handled separately
    badge: 'badge-purple',
    badgeText: 'Weekend',
    title: 'Weekend Break!',
    subtitle: 'Take a break, relax, and come back ready to quiz.',
    broadcastBg: '',
  },
  ALREADY_ATTEMPTED: {
    icon: CheckCircle2,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    badge: 'badge-green',
    badgeText: 'Completed',
    title: 'Attempt Recorded',
    subtitle: 'Your response for today has been saved',
    broadcastBg: '',
  },
};

/* ── Weekend card ──────────────────────────────────────── */
function WeekendCard({ message }: { message: string }) {
  return (
    <div className="max-w-xl mx-auto my-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="px-6 pt-8 pb-6 space-y-5">

        {/* Icon */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            {/* Soft glow ring */}
            <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
              <span className="text-4xl select-none" role="img" aria-label="Calendar with smile">📅</span>
            </div>
            {/* Decorative sparkles */}
            <span className="absolute -top-1 -right-1 text-lg select-none">✨</span>
            <span className="absolute top-0 -left-3 text-base select-none opacity-70">✦</span>
          </div>

          {/* Badge */}
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-[11px] font-bold uppercase tracking-widest border border-violet-200 dark:border-violet-800">
            WEEKEND
          </span>

          {/* Headline */}
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Weekend Break!&nbsp;<span className="text-violet-600 dark:text-violet-400">✦</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Take a break, relax, and come back ready to quiz.
            </p>
          </div>
        </div>

        {/* Resume time box */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          {/* Beach illustration replacement — emoji art */}
          <div className="shrink-0 text-4xl leading-none select-none hidden sm:block" aria-hidden="true">🏖️</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1">
              <Clock className="w-3.5 h-3.5" />
              QUIZ SESSIONS RESUME
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Monday at{' '}
              <span className="text-amber-500 dark:text-amber-400">10:00 AM IST</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {message || "We'll see you back on Monday. Keep learning, keep growing! 😊"}
            </p>
          </div>
        </div>

        {/* Info strip */}
        <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col items-center gap-1.5 text-center px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Quiz sessions run<br/>
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Monday – Friday</strong>
            </p>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center px-2 py-1 border-x border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Leaderboard &amp; reports<br/>
              <strong className="text-amber-600 dark:text-amber-400 font-semibold">available 24/7</strong>
            </p>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Your progress<br/>
              <strong className="text-blue-600 dark:text-blue-400 font-semibold">is always safe</strong>
            </p>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <Link
            href="/leaderboard"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#0f172a] dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold transition-colors shadow-sm"
          >
            <Trophy className="w-4 h-4 text-amber-400 dark:text-amber-500" />
            View Leaderboard
            <ArrowRight className="w-4 h-4 opacity-60" />
          </Link>
          <Link
            href="/report"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors"
          >
            <BarChart2 className="w-4 h-4 text-slate-400" />
            My Report
          </Link>
          <Link
            href="/profile"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold transition-colors"
          >
            <User className="w-4 h-4 text-slate-400" />
            Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════ */
export default function TimingGuardCard({ state, message, userName, attempt }: TimingGuardCardProps) {
  if (state === 'OPEN') return null;

  /* Weekend gets its own dedicated layout */
  if (state === 'WEEKEND') return <WeekendCard message={message} />;

  const cfg = STATE_CONFIG[state];
  const Icon = cfg.icon;
  const isAttempted = state === 'ALREADY_ATTEMPTED';

  return (
    <div className="max-w-xl mx-auto my-8 card p-6 sm:p-8 space-y-5">

      {/* ── Icon + Badge row ── */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${cfg.iconBg}`}>
          <Icon className="w-7 h-7" />
        </div>
        <span className={`badge ${cfg.badge} text-[11px]`}>{cfg.badgeText}</span>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{cfg.title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{cfg.subtitle}</p>
        </div>
      </div>

      {/* ── Attempt result breakdown (ALREADY_ATTEMPTED) ── */}
      {isAttempted && attempt && (
        <>
          <div className="card-sunken rounded-xl p-4 space-y-3">
            {userName && (
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[11px] font-extrabold text-slate-600 dark:text-slate-300 shrink-0">
                  {userName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Participant</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{userName}</p>
                </div>
                <span className={`ml-auto badge ${attempt.isCorrect ? 'badge-green' : 'badge-red'}`}>
                  {attempt.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
              </div>
            )}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Base Score</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {attempt.isCorrect ? `+${attempt.score.toFixed(2)} pts` : '0.00 pts'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Speed Bonus</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">+{attempt.bonusPoints.toFixed(2)} pts</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">Total Earned</span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white">{attempt.totalPoints.toFixed(2)} pts</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
              <Timer className="w-3.5 h-3.5 shrink-0" />
              <span>Response time: <strong className="font-semibold">{(attempt.responseTimeMs / 1000).toFixed(2)}s</strong></span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{message}</p>
        </>
      )}

      {/* ── AI Broadcast message (BEFORE / AFTER window) ── */}
      {!isAttempted && message && (
        <div className={`p-4 rounded-xl border space-y-1.5 ${cfg.broadcastBg}`}>
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Security Broadcast</span>
          </div>
          <p className="text-sm font-semibold leading-relaxed text-center">{message}</p>
        </div>
      )}

      {/* ── Schedule note ── */}
      {!isAttempted && (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center max-w-sm mx-auto">
          {state === 'BEFORE_WINDOW' && 'Quiz runs Mon–Fri between 10:00 AM – 9:00 PM IST. Complete before 11 AM for Early Bird bonus points.'}
          {state === 'AFTER_WINDOW' && "Today's session has ended. Return tomorrow at 10:00 AM IST for the next challenge."}
        </p>
      )}

      {/* ── Action buttons ── */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2.5 justify-center">
        <Link href="/leaderboard" className="btn btn-primary btn-sm gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>View Leaderboard</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-60" />
        </Link>
        <Link href="/report" className="btn btn-secondary btn-sm gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
          <span>My Report</span>
        </Link>
        <Link href="/profile" className="btn btn-ghost btn-sm gap-2">
          <User className="w-3.5 h-3.5" />
          <span>Profile</span>
        </Link>
      </div>
    </div>
  );
}
