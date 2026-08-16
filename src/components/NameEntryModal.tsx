'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, User, Info, ArrowRight, Clock, X } from 'lucide-react';
import { UserNameSchema } from '@/lib/validation';
import toast from 'react-hot-toast';

interface NameEntryModalProps {
  initialName?: string;
  onSave: (name: string) => void;
}

const MAX_RECENT = 5;

function getRecentNames(): string[] {
  try {
    return JSON.parse(localStorage.getItem('cyber_recent_names') || '[]');
  } catch {
    return [];
  }
}

function saveRecentName(name: string) {
  const prev = getRecentNames().filter(n => n !== name);
  const next = [name, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem('cyber_recent_names', JSON.stringify(next));
}

export default function NameEntryModal({ initialName = '', onSave }: NameEntryModalProps) {
  const [inputName, setInputName]       = useState(initialName);
  const [errorMsg, setErrorMsg]         = useState('');
  const [recentNames, setRecentNames]   = useState<string[]>([]);
  const [showRecent, setShowRecent]     = useState(false);
  const inputRef                        = useRef<HTMLInputElement>(null);
  const dropdownRef                     = useRef<HTMLDivElement>(null);

  /* Load saved data */
  useEffect(() => {
    const saved  = localStorage.getItem('cyber_quiz_username');
    const recent = getRecentNames();
    setRecentNames(recent);
    if (!initialName && saved) setInputName(saved);
    /* Show dropdown if there are recent names and input is empty */
    if (recent.length > 0 && !saved) setShowRecent(true);
  }, [initialName]);

  /* Focus input on mount */
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) setShowRecent(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const validation = UserNameSchema.safeParse({ userName: inputName });
    if (!validation.success) {
      const err = validation.error.errors[0].message;
      setErrorMsg(err);
      inputRef.current?.focus();
      return;
    }

    const cleanName = validation.data.userName;
    localStorage.setItem('cyber_quiz_username', cleanName);
    saveRecentName(cleanName);
    toast.success(`Welcome, ${cleanName}!`);
    onSave(cleanName);
  };

  const pickRecent = (name: string) => {
    setInputName(name);
    setShowRecent(false);
    setErrorMsg('');
    inputRef.current?.focus();
  };

  const clearRecent = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentNames.filter(n => n !== name);
    setRecentNames(updated);
    localStorage.setItem('cyber_recent_names', JSON.stringify(updated));
  };

  const hasInput = inputName.trim().length > 0;

  return (
    <div className="max-w-md mx-auto my-12 card p-6 sm:p-8 space-y-6">

      {/* ── Header ── */}
      <div className="text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Participant Identity
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter your name or nickname to begin today's quiz.
          </p>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>

        {/* Name field */}
        <div>
          <label htmlFor="participant-name" className="field-label">
            Display Name / Nickname <span className="text-rose-500" aria-hidden="true">*</span>
          </label>

          <div className="relative">
            {/* Input */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                id="participant-name"
                type="text"
                value={inputName}
                onChange={e => { setInputName(e.target.value); setErrorMsg(''); }}
                onFocus={() => { if (recentNames.length > 0 && !hasInput) setShowRecent(true); }}
                placeholder="e.g. Alex Morgan, CyberCadet"
                maxLength={30}
                autoComplete="off"
                aria-describedby={errorMsg ? 'name-error' : 'name-hint'}
                aria-invalid={!!errorMsg}
                className={`field-input pl-9 pr-8 ${errorMsg ? 'field-input-error' : ''}`}
              />
              {/* Clear button */}
              {hasInput && (
                <button
                  type="button"
                  onClick={() => { setInputName(''); setErrorMsg(''); inputRef.current?.focus(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Clear name"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Recent names dropdown */}
            {showRecent && recentNames.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 mt-1 card-raised rounded-xl overflow-hidden z-30"
                role="listbox"
                aria-label="Recent names"
              >
                <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <Clock className="w-3 h-3" />
                  Recent
                </div>
                {recentNames.map(name => (
                  <button
                    key={name}
                    type="button"
                    role="option"
                    aria-selected={inputName === name}
                    onClick={() => pickRecent(name)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] font-bold flex items-center justify-center text-slate-600 dark:text-slate-300">
                        {name.substring(0, 2).toUpperCase()}
                      </span>
                      {name}
                    </span>
                    <X
                      className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                      onClick={e => clearRecent(name, e)}
                      aria-label={`Remove ${name} from recent`}
                    />
                  </button>
                ))}
                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-3" />
                <button
                  type="button"
                  onClick={() => setShowRecent(false)}
                  className="w-full px-3 py-2 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-left"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Inline error */}
          {errorMsg && (
            <p id="name-error" role="alert" className="field-error flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-flex items-center justify-center text-white text-[8px] font-bold shrink-0">!</span>
              {errorMsg}
            </p>
          )}

          {/* Char counter */}
          <p className="field-helper text-right" aria-live="polite">
            {inputName.length} / 30
          </p>
        </div>

        {/* Info note */}
        <div
          id="name-hint"
          className="flex items-start gap-2.5 p-3 rounded-lg card-sunken text-[11px] text-slate-600 dark:text-slate-400"
        >
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">Use the same name every day</strong> to accumulate points accurately on the school leaderboard.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full btn btn-primary btn-md justify-center gap-2"
        >
          <span>Continue to Daily Quiz</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
