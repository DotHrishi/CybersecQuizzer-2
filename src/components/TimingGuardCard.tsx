'use client';

import React from 'react';
import Link from 'next/link';
import {
  Clock, Calendar, CheckCircle2, Trophy, BarChart2,
  ShieldAlert, Sparkles, ArrowRight, Timer, User
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
    iconBg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
    badge: 'badge-slate',
    badgeText: 'Weekend',
    title: 'Weekend Blackout',
    subtitle: 'Academic quiz window reopens on Monday',
    broadcastBg: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200',
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

export default function TimingGuardCard({ state, message, userName, attempt }: TimingGuardCardProps) {
  if (state === 'OPEN') return null;

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
          {/* Result summary card */}
          <div className="card-sunken rounded-xl p-4 space-y-3">

            {/* Participant row */}
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

            {/* Score rows */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Base Score</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {attempt.isCorrect ? `+${attempt.score.toFixed(2)} pts` : '0.00 pts'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Speed Bonus</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  +{attempt.bonusPoints.toFixed(2)} pts
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">Total Earned</span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {attempt.totalPoints.toFixed(2)} pts
                </span>
              </div>
            </div>

            {/* Response time */}
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
              <Timer className="w-3.5 h-3.5 shrink-0" />
              <span>Response time: <strong className="text-slate-500 dark:text-slate-400 font-semibold">{(attempt.responseTimeMs / 1000).toFixed(2)}s</strong></span>
            </div>
          </div>

          {/* Message */}
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{message}</p>
        </>
      )}

      {/* ── AI Broadcast message (non-attempted states) ── */}
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
          {state === 'WEEKEND' && 'Quiz sessions run Monday through Friday. Leaderboard & reports remain accessible 24/7.'}
        </p>
      )}

      {/* ── Action buttons ── */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2.5 justify-center">
        <Link
          href="/leaderboard"
          className="btn btn-primary btn-sm gap-2"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>View Leaderboard</span>
          <ArrowRight className="w-3.5 h-3.5 opacity-60" />
        </Link>
        <Link
          href="/report"
          className="btn btn-secondary btn-sm gap-2"
        >
          <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
          <span>My Report</span>
        </Link>
        <Link
          href="/profile"
          className="btn btn-ghost btn-sm gap-2"
        >
          <User className="w-3.5 h-3.5" />
          <span>Profile</span>
        </Link>
      </div>
    </div>
  );
}
