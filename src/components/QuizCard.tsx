'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, CheckCircle2, ArrowRight, Loader2,
  ShieldCheck, Keyboard, AlertCircle
} from 'lucide-react';
import { QuestionClientDTO, OptionKey } from '@/types/quiz';
import { QuizSubmissionSchema } from '@/lib/validation';
import toast from 'react-hot-toast';

interface QuizCardProps {
  questionData: QuestionClientDTO;
  userName: string;
  onSubmitted: (result: any) => void;
}

/* Submission state machine */
type SubmitState = 'idle' | 'submitting' | 'error';

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];
const KEY_MAP: Record<string, OptionKey> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };

/* ─── Skeleton ───────────────────────────────────────────── */
export function QuizCardSkeleton() {
  return (
    <div className="max-w-2xl mx-auto my-6 card p-6 sm:p-8 space-y-6 animate-pulse">
      {/* Header row */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex gap-2">
          <div className="skeleton h-6 w-24 rounded-md" />
          <div className="skeleton h-6 w-16 rounded-md" />
        </div>
        <div className="skeleton h-6 w-16 rounded-lg" />
      </div>
      {/* Question text */}
      <div className="space-y-2">
        <div className="skeleton h-5 w-full rounded" />
        <div className="skeleton h-5 w-3/4 rounded" />
      </div>
      {/* Options */}
      <div className="space-y-2.5">
        {OPTION_KEYS.map(k => (
          <div key={k} className="skeleton h-14 w-full rounded-xl" />
        ))}
      </div>
      {/* Submit */}
      <div className="skeleton h-12 w-full rounded-lg pt-4" />
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */
export default function QuizCard({ questionData, userName, onSubmitted }: QuizCardProps) {
  const [selectedOption, setSelectedOption]   = useState<OptionKey | null>(null);
  const [submitState, setSubmitState]         = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg]               = useState('');
  const [elapsedMs, setElapsedMs]             = useState(0);
  const [showKeyHint, setShowKeyHint]         = useState(true);

  /* Live timer */
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => setElapsedMs(Date.now() - startTime), 50);
    return () => clearInterval(interval);
  }, []);

  /* Hide keyboard hint after 4s */
  useEffect(() => {
    const t = setTimeout(() => setShowKeyHint(false), 4000);
    return () => clearTimeout(t);
  }, []);

  /* Keyboard selection: 1-4 to pick option, Enter to submit */
  const handleKeyboardPick = useCallback((e: KeyboardEvent) => {
    /* Don't intercept when inside an input/textarea */
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

    const opt = KEY_MAP[e.key];
    if (opt) {
      setSelectedOption(opt);
      setShowKeyHint(false);
      return;
    }
    if (e.key === 'Enter') {
      document.getElementById('quiz-submit-btn')?.click();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardPick);
    return () => window.removeEventListener('keydown', handleKeyboardPick);
  }, [handleKeyboardPick]);

  /* Submit handler */
  const handleSubmit = async () => {
    if (!selectedOption || submitState === 'submitting') return;

    const validation = QuizSubmissionSchema.safeParse({
      sessionId: questionData.sessionId,
      userName,
      selectedOption,
      selectedOptionText: questionData.options[selectedOption],
    });

    if (!validation.success) {
      const msg = validation.error.errors[0].message;
      toast.error(msg);
      return;
    }

    setSubmitState('submitting');
    setErrorMsg('');

    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId:          questionData.sessionId,
          userName,
          selectedOption,
          selectedOptionText: questionData.options[selectedOption],
          sessionToken:       questionData.sessionToken,
        }),
      });

      let data: any = {};
      try { data = await response.json(); } catch {
        setSubmitState('error');
        setErrorMsg('Server returned an unexpected response. Please try again.');
        return;
      }

      if (response.status === 429) {
        setSubmitState('error');
        setErrorMsg(data.message || 'Too many requests. Please wait a moment.');
        toast.error(data.message || 'Rate limit reached.');
        return;
      }

      if (!response.ok || !data.success) {
        setSubmitState('error');
        setErrorMsg(data.message || 'Failed to submit answer.');
        toast.error(data.message || 'Submission failed.');
        return;
      }

      onSubmitted(data);

    } catch {
      setSubmitState('error');
      setErrorMsg('Network error. Check your connection and try again.');
      toast.error('Network error during submission.');
    }
  };

  const seconds    = (elapsedMs / 1000).toFixed(1);
  const isSlowZone = elapsedMs > 30_000;

  /* Difficulty colours */
  const difficultyStyle: Record<string, string> = {
    Easy:   'badge-green',
    Medium: 'badge-amber',
    Hard:   'badge-red',
  };

  return (
    <div className="max-w-2xl mx-auto my-6 card p-6 sm:p-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge badge-slate uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            {questionData.category}
          </span>
          <span className={`badge ${difficultyStyle[questionData.difficulty] ?? 'badge-slate'}`}>
            {questionData.difficulty}
          </span>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
          isSlowZone
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
        }`}>
          <Clock className={`w-3.5 h-3.5 ${isSlowZone ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
          <span>{seconds}s</span>
        </div>
      </div>

      {/* ── Question text ── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Question</p>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed">
          {questionData.questionText}
        </h2>
      </div>

      {/* ── Keyboard hint ── */}
      {showKeyHint && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
          <Keyboard className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span>Press <kbd className="px-1 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">1</kbd>–<kbd className="px-1 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">4</kbd> to select, <kbd className="px-1 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600">Enter</kbd> to submit</span>
        </div>
      )}

      {/* ── MCQ Options ── */}
      <div className="space-y-2.5" role="radiogroup" aria-label="Answer options">
        {OPTION_KEYS.map((key, idx) => {
          const isSelected  = selectedOption === key;
          const optionText  = questionData?.options?.[key];
          const keyNum      = String(idx + 1);

          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Option ${key}: ${optionText}`}
              onClick={() => setSelectedOption(key)}
              disabled={submitState === 'submitting'}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 flex items-center justify-between group cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a] dark:focus-visible:ring-white ${
                isSelected
                  ? 'bg-slate-50 dark:bg-slate-800 border-[#0f172a] dark:border-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3.5">
                {/* Option letter */}
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-[#0f172a] text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-900 dark:group-hover:text-white'
                }`}>
                  {key}
                </span>


                <span className="font-medium text-xs sm:text-sm leading-snug text-slate-800 dark:text-slate-200">
                  {optionText}
                </span>
              </div>

              {/* Selection indicator */}
              {isSelected
                ? <CheckCircle2 className="w-5 h-5 text-[#0f172a] dark:text-white shrink-0 ml-2" />
                : <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700 shrink-0 ml-2 group-hover:border-slate-400 dark:group-hover:border-slate-500 transition-colors" />
              }
            </button>
          );
        })}
      </div>

      {/* ── Error state ── */}
      {submitState === 'error' && errorMsg && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-700 dark:text-rose-300">{errorMsg}</p>
            <button
              onClick={() => { setSubmitState('idle'); setErrorMsg(''); }}
              className="text-rose-600 dark:text-rose-400 hover:underline mt-0.5 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Submit button ── */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* Selection required hint */}
        {!selectedOption && (
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mb-3">
            Select an option above to enable submission
          </p>
        )}

        <button
          id="quiz-submit-btn"
          type="button"
          disabled={!selectedOption || submitState === 'submitting'}
          onClick={handleSubmit}
          className="w-full py-3.5 px-6 rounded-xl bg-[#0f172a] dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0f172a]"
        >
          {submitState === 'submitting' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying answer...</span>
            </>
          ) : submitState === 'error' ? (
            <>
              <AlertCircle className="w-4 h-4" />
              <span>Try Again</span>
            </>
          ) : (
            <>
              <span>Confirm &amp; Submit Answer</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Submission context */}
        {selectedOption && submitState === 'idle' && (
          <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2.5">
            Submitting as <strong className="text-slate-600 dark:text-slate-300">{userName}</strong>
            {' · '}Option {selectedOption} selected
          </p>
        )}
      </div>
    </div>
  );
}
