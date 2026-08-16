'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Lock, Plus, Edit2, Trash2, Download, Upload, AlertTriangle,
  X, Eye, EyeOff, RefreshCw, ShieldCheck, BarChart2,
  Users, BookOpen, Activity, Save, Search, MoreVertical,
  ChevronDown, ChevronUp, SlidersHorizontal,
  CheckSquare, Square, Minus, AlertCircle, Loader2,
  CheckCircle2, ArrowRight, BarChart3, FileText,
  Trophy, Clock, Target, TrendingUp, Hash, ChevronsUpDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Types ─────────────────────────────────────────────── */
interface Question {
  id: number; questionText: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctOption: string; category: string; difficulty: string;
  active: boolean; createdAt: string; updatedAt?: string;
}
interface Stats {
  totalQuestions: number; activeQuestions: number;
  totalAttempts: number; totalUsers: number; todayAttempts: number;
}
interface LeaderboardEntry {
  rank: number; userName: string; attempts: number;
  correctAnswers: number; totalPoints: number;
  avgResponseTimeMs: number; lastAttemptDate: string;
}

type AdminTab = 'questions' | 'reports';
type ReportTab = 'overview' | 'students' | 'attempts' | 'qbank';
type BulkAction = 'enable' | 'disable' | 'delete' | 'export';
type BulkStep = 'select' | 'configure' | 'confirm' | 'processing' | 'result';
type FilterDifficulty = 'All' | 'Easy' | 'Medium' | 'Hard';
type FilterStatus = 'All' | 'Active' | 'Disabled';

const defaultForm = {
  questionText: '',
  optionA: '', optionB: '', optionC: '', optionD: '',
  correctOption: 'A' as 'A'|'B'|'C'|'D',
  category: 'General Security',
  difficulty: 'Medium' as 'Easy'|'Medium'|'Hard',
  active: true,
};

const SAVED_VIEWS = [
  { id: 'all',      label: 'All Questions',  difficulty: 'All'  as FilterDifficulty, status: 'All'      as FilterStatus },
  { id: 'active',   label: 'Active Only',    difficulty: 'All'  as FilterDifficulty, status: 'Active'   as FilterStatus },
  { id: 'disabled', label: 'Disabled',       difficulty: 'All'  as FilterDifficulty, status: 'Disabled' as FilterStatus },
  { id: 'hard',     label: 'Hard Questions', difficulty: 'Hard' as FilterDifficulty, status: 'All'      as FilterStatus },
];

/* ─── Small shared helpers ───────────────────────────────── */
function SkeletonRows({ cols = 8 }: { cols?: number }) {
  return <>{Array.from({ length: 6 }).map((_, i) => (
    <tr key={i} className="border-b border-slate-100 dark:border-slate-800 animate-pulse">
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j} className="py-3.5 px-4">
          <div className="skeleton h-4 rounded" style={{ width: j === 1 ? '180px' : '60px' }} />
        </td>
      ))}
    </tr>
  ))}</>;
}

function DiffBadge({ d }: { d: string }) {
  const cls = d === 'Easy' ? 'badge-green' : d === 'Hard' ? 'badge-red' : 'badge-amber';
  return <span className={`badge ${cls}`}>{d}</span>;
}

function ExpandedRow({ q }: { q: Question }) {
  return (
    <tr className="bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
      <td colSpan={8} className="px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {(['A','B','C','D'] as const).map(opt => (
            <div key={opt} className={`p-3 rounded-lg border ${q.correctOption === opt ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' : 'card-sunken'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${q.correctOption === opt ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{opt}</span>
                {q.correctOption === opt && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Correct</span>}
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-snug">{q[`option${opt}` as keyof Question] as string}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Created: {new Date(q.createdAt).toLocaleString()}
          {q.updatedAt && ` · Updated: ${new Date(q.updatedAt).toLocaleString()}`}
        </p>
      </td>
    </tr>
  );
}

function LoginScreen({ onLogin, isLoading }: { onLogin: (pwd: string) => void; isLoading: boolean }) {
  const [password, setPassword] = useState('');
  return (
    <div className="max-w-md mx-auto my-16 card p-8 text-center space-y-6">
      <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
        <Lock className="w-6 h-6 text-slate-700 dark:text-slate-300" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Authentication</h2>
        <p className="text-xs text-slate-500 mt-1">Enter your admin password to manage the question bank</p>
      </div>
      <form onSubmit={e => { e.preventDefault(); if (password.trim()) onLogin(password); }} className="space-y-4">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter admin password..." autoFocus className="field-input pl-9" />
        </div>
        <button type="submit" disabled={isLoading || !password.trim()} className="btn btn-primary btn-md w-full justify-center gap-2">
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Authenticating...</> : <><ShieldCheck className="w-4 h-4" />Unlock Admin Panel</>}
        </button>
      </form>
    </div>
  );
}

/* ─── Question modal ─────────────────────────────────────── */
function QuestionModal({ editingId, formData, setFormData, onSave, onClose, saving }: {
  editingId: number | null; formData: typeof defaultForm;
  setFormData: React.Dispatch<React.SetStateAction<typeof defaultForm>>;
  onSave: (e: React.FormEvent) => void; onClose: () => void; saving: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel max-w-[560px]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{editingId ? `Edit Question #${editingId}` : 'Add New Question'}</h3>
          <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={onSave} className="p-6 space-y-4">
          <div>
            <label className="field-label">Question Text <span className="text-rose-500">*</span></label>
            <textarea rows={3} value={formData.questionText} onChange={e => setFormData(f => ({ ...f, questionText: e.target.value }))} placeholder="Enter the full question text..." className="field-input resize-none" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['A','B','C','D'] as const).map(opt => (
              <div key={opt}>
                <label className="field-label flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold ${formData.correctOption === opt ? 'bg-[#0f172a] text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{opt}</span>
                  Option {opt}
                </label>
                <input type="text" value={formData[`option${opt}` as 'optionA'|'optionB'|'optionC'|'optionD']} onChange={e => setFormData(f => ({ ...f, [`option${opt}`]: e.target.value }))} placeholder={`Option ${opt}...`} className="field-input" required />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="field-label">Correct Answer</label>
              <select value={formData.correctOption} onChange={e => setFormData(f => ({ ...f, correctOption: e.target.value as 'A'|'B'|'C'|'D' }))} className="field-input">
                {(['A','B','C','D'] as const).map(o => <option key={o} value={o}>Option {o}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Category</label>
              <input type="text" value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value }))} className="field-input" required />
            </div>
            <div>
              <label className="field-label">Difficulty</label>
              <select value={formData.difficulty} onChange={e => setFormData(f => ({ ...f, difficulty: e.target.value as 'Easy'|'Medium'|'Hard' }))} className="field-input">
                <option>Easy</option><option>Medium</option><option>Hard</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-3 p-3 rounded-lg card-sunken cursor-pointer select-none">
            <button type="button" onClick={() => setFormData(f => ({ ...f, active: !f.active }))} className={`toggle shrink-0 ${formData.active ? 'bg-[#0f172a] dark:bg-white' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <span className={`toggle-thumb ${formData.active ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">{formData.active ? 'Active' : 'Disabled'}</p>
              <p className="text-[11px] text-slate-400">{formData.active ? 'Included in random quiz pool' : 'Hidden from quiz pool'}</p>
            </div>
          </label>
          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm flex-1 justify-center gap-1.5">
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : <><Save className="w-3.5 h-3.5" />{editingId ? 'Update' : 'Save Question'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete modal ───────────────────────────────────────── */
function DeleteModal({ item, onConfirm, onCancel }: { item: { id: number; questionText: string }; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="modal-panel max-w-[420px]">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Question?</h3>
            <p className="text-xs text-slate-500 mt-1">This action is permanent and cannot be undone.</p>
          </div>
          <div className="p-3 rounded-lg card-sunken">
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 italic">&ldquo;{item.questionText}&rdquo;</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="btn btn-secondary btn-sm flex-1 justify-center">Cancel</button>
            <button onClick={onConfirm} className="btn btn-destructive btn-sm flex-1 justify-center gap-1.5"><Trash2 className="w-3.5 h-3.5" />Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Bulk modal ─────────────────────────────────────────── */
function BulkModal({ step, action, count, eligible, results, onAction, onConfirm, onCancel, onClose }: {
  step: BulkStep; action: BulkAction; count: number; eligible: number;
  results?: { success: number; failed: number };
  onAction: (a: BulkAction) => void; onConfirm: () => void; onCancel: () => void; onClose: () => void;
}) {
  const labels: Record<BulkAction, string> = { enable: 'Enable', disable: 'Disable', delete: 'Delete', export: 'Export JSON' };
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && step === 'result') onClose(); }}>
      <div className="modal-panel max-w-[460px]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bulk Operation · {count} selected</h3>
          {step === 'result' && <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>}
        </div>
        <div className="p-6 space-y-4">
          {(step === 'select' || step === 'configure') && (
            <>
              <p className="text-xs text-slate-500">Choose an action to apply to {count} question{count !== 1 ? 's' : ''}:</p>
              <div className="grid grid-cols-2 gap-2">
                {(['enable','disable','delete','export'] as BulkAction[]).map(a => (
                  <button key={a} onClick={() => onAction(a)} className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${action === a ? 'border-[#0f172a] dark:border-white bg-slate-50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'} ${a === 'delete' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>{labels[a]}</button>
                ))}
              </div>
              {action === 'delete' && <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>Deletion is permanent.</span></div>}
            </>
          )}
          {step === 'confirm' && (
            <div className="card-sunken rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Action</span><span className="font-bold">{labels[action]}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Selected</span><span className="font-bold">{count}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Eligible</span><span className="font-bold text-emerald-600">{eligible}</span></div>
              {eligible < count && <div className="flex justify-between"><span className="text-slate-500">Skipped</span><span className="font-bold text-amber-600">{count - eligible}</span></div>}
            </div>
          )}
          {step === 'processing' && <div className="flex flex-col items-center gap-3 py-4"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /><p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Processing…</p></div>}
          {step === 'result' && results && (
            <div className="space-y-3">
              <div className="flex justify-center"><div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-emerald-600" /></div></div>
              <div className="card-sunken rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Completed</span><span className="font-bold text-emerald-600">{results.success}</span></div>
                {results.failed > 0 && <div className="flex justify-between"><span className="text-slate-500">Failed</span><span className="font-bold text-rose-600">{results.failed}</span></div>}
              </div>
            </div>
          )}
        </div>
        {(step === 'configure' || step === 'select') && <div className="flex gap-2 px-6 pb-5"><button onClick={onCancel} className="btn btn-secondary btn-sm flex-1 justify-center">Cancel</button><button onClick={onConfirm} disabled={!action} className="btn btn-primary btn-sm flex-1 justify-center gap-1.5">Review <ArrowRight className="w-3.5 h-3.5 opacity-60" /></button></div>}
        {step === 'confirm' && <div className="flex gap-2 px-6 pb-5"><button onClick={onCancel} className="btn btn-secondary btn-sm flex-1 justify-center">Back</button><button onClick={onConfirm} className={`btn btn-sm flex-1 justify-center gap-1.5 ${action === 'delete' ? 'btn-destructive' : 'btn-primary'}`}>Confirm {labels[action]}</button></div>}
        {step === 'result' && <div className="px-6 pb-5"><button onClick={onClose} className="btn btn-primary btn-sm w-full justify-center">Done</button></div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   REPORT PANELS
═══════════════════════════════════════════════════════════ */

/* ─── Shared sortable column header ─────────────────────── */
function SortTh({
  label, sortKey, activeSortKey, sortDir, onSort, align = '',
}: {
  label: string;
  sortKey: string;
  activeSortKey: string;
  sortDir: 'asc' | 'desc';
  onSort: (k: string) => void;
  align?: string;
}) {
  const isActive = activeSortKey === sortKey;
  return (
    <th
      className={`table-th-sortable select-none ${align}`}
      onClick={() => onSort(sortKey)}
      aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive
          ? (sortDir === 'asc'
              ? <ChevronUp   className="w-3 h-3 text-slate-700 dark:text-slate-200 shrink-0" />
              : <ChevronDown className="w-3 h-3 text-slate-700 dark:text-slate-200 shrink-0" />)
          : <ChevronsUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
        }
      </span>
    </th>
  );
}
function exportCSV(filename: string, rows: string[][], headers: string[]) {
  const csv = [[...headers], ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'), { href: 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv), download: filename });
  document.body.appendChild(a); a.click(); a.remove();
}

function exportPDF(title: string, html: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { toast.error('Pop-up blocked — allow pop-ups and try again.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#0f172a;padding:32px 40px}h1{font-size:18pt;font-weight:800;margin-bottom:4px}p.sub{font-size:9pt;color:#64748b;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th{padding:7px 8px;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#475569;text-align:left;border-bottom:2px solid #e2e8f0;background:#f8fafc}td{padding:6px 8px;font-size:10pt;border-bottom:1px solid #e2e8f0}@media print{body{padding:20px}}</style></head><body>${html}</body></html>`);
  win.document.close(); win.focus();
  setTimeout(() => { win.print(); win.addEventListener('afterprint', () => win.close()); }, 400);
}

/* ── 1. Overview report ── */
function OverviewReport({ stats, questions, leaderboard }: { stats: Stats; questions: Question[]; leaderboard: LeaderboardEntry[] }) {
  const totalPoints     = leaderboard.reduce((s, u) => s + u.totalPoints, 0);
  const avgScore        = leaderboard.length ? (totalPoints / leaderboard.reduce((s, u) => s + u.attempts, 0)).toFixed(2) : '0.00';
  const highestScore    = leaderboard.length ? Math.max(...leaderboard.map(u => u.totalPoints)).toFixed(2) : '0.00';
  const avgTimeMs       = leaderboard.length ? Math.round(leaderboard.reduce((s, u) => s + u.avgResponseTimeMs, 0) / leaderboard.length) : 0;

  // Attempts by category derived from questions
  const catCounts: Record<string, number> = {};
  questions.forEach(q => { catCounts[q.category] = (catCounts[q.category] || 0) + 1; });
  const catRows = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);

  const kpis = [
    { label: 'Total Participants', value: stats.totalUsers,      icon: Users,    color: '' },
    { label: 'Quiz Attempts',      value: stats.totalAttempts,   icon: BookOpen, color: '' },
    { label: 'Today\'s Attempts',  value: stats.todayAttempts,   icon: Activity, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Avg Score / Attempt',value: avgScore + ' pts',     icon: Target,   color: '' },
    { label: 'Highest Score',      value: highestScore + ' pts', icon: Trophy,   color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Avg Response Time',  value: (avgTimeMs/1000).toFixed(2)+'s', icon: Clock, color: '' },
    { label: 'Active Questions',   value: stats.activeQuestions, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Total Questions',    value: stats.totalQuestions,  icon: Hash,     color: '' },
  ];

  const handleExport = () => {
    exportCSV('admin_overview.csv',
      kpis.map(k => [k.label, String(k.value)]),
      ['Metric', 'Value']
    );
    toast.success('Overview exported.');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">Programme-wide summary across all participants and questions.</p>
        </div>
        <button onClick={handleExport} className="btn btn-secondary btn-xs gap-1.5"><FileText className="w-3 h-3" />Export CSV</button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="kpi-card">
            <span className="kpi-label"><Icon className="w-3.5 h-3.5" />{label}</span>
            <span className={`kpi-value text-xl ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Category breakdown table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">Question Bank by Category</span>
        </div>
        <div className="table-wrapper">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Category</th>
                <th className="table-th text-center">Questions</th>
                <th className="table-th text-center">Active</th>
                <th className="table-th text-right">% of Bank</th>
              </tr>
            </thead>
            <tbody>
              {catRows.map(([cat, total]) => {
                const active = questions.filter(q => q.category === cat && q.active).length;
                const pct = questions.length ? ((total / questions.length) * 100).toFixed(1) : '0';
                return (
                  <tr key={cat} className="table-row">
                    <td className="table-td font-medium text-slate-800 dark:text-slate-200">{cat}</td>
                    <td className="table-td text-center">{total}</td>
                    <td className="table-td text-center text-emerald-600 dark:text-emerald-400 font-semibold">{active}</td>
                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                          <div className="h-full bg-[#0f172a] dark:bg-white rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── 2. Student Performance report ── */
function StudentReport({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState<string>('totalPoints');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const getVal = (u: LeaderboardEntry, k: string): number => {
    if (k === 'accuracy')  return u.attempts ? (u.correctAnswers / u.attempts) : 0;
    if (k === 'lastDate')  return new Date(u.lastAttemptDate).getTime();
    return (u[k as keyof LeaderboardEntry] as number) ?? 0;
  };

  const filtered = leaderboard
    .filter(u => !search || u.userName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === 'userName') {
        const cmp = a.userName.localeCompare(b.userName);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const av = getVal(a, sortKey), bv = getVal(b, sortKey);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const th = (label: string, key: string, align = '') => (
    <SortTh label={label} sortKey={key} activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} align={align} />
  );

  const handleExportCSV = () => {
    exportCSV('student_performance.csv',
      filtered.map(u => [u.userName, String(u.attempts), String(u.correctAnswers), u.totalPoints.toFixed(2), String(u.rank), (u.avgResponseTimeMs/1000).toFixed(2)+'s', new Date(u.lastAttemptDate).toLocaleDateString()]),
      ['Student','Attempts','Correct','Total Points','Rank','Avg Speed','Last Attempt']
    );
    toast.success('Student report exported.');
  };

  const handleExportPDF = () => {
    const rows = filtered.map(u => `<tr><td>${u.userName}</td><td>${u.attempts}</td><td>${u.correctAnswers}</td><td>${u.totalPoints.toFixed(2)} pts</td><td>#${u.rank}</td><td>${(u.avgResponseTimeMs/1000).toFixed(2)}s</td><td>${new Date(u.lastAttemptDate).toLocaleDateString()}</td></tr>`).join('');
    exportPDF('Student Performance Report', `<h1>Student Performance Report</h1><p class="sub">Generated: ${new Date().toLocaleString()}</p><table><thead><tr><th>Student</th><th>Attempts</th><th>Correct</th><th>Total Points</th><th>Rank</th><th>Avg Speed</th><th>Last Attempt</th></tr></thead><tbody>${rows}</tbody></table>`);
  };


  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Student Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">Per-student attempts, scores, rank, and speed — all time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="btn btn-secondary btn-xs gap-1.5"><FileText className="w-3 h-3" />CSV</button>
          <button onClick={handleExportPDF} className="btn btn-secondary btn-xs gap-1.5"><FileText className="w-3 h-3" />PDF</button>
        </div>
      </div>
      <div className="search-wrap">
        <Search className="search-icon" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="search-input" />
        {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-icon w-5 h-5"><X className="w-3.5 h-3.5" /></button>}
      </div>
      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                {th('Student', 'userName')}
                {th('Attempts', 'attempts', 'text-center')}
                {th('Correct', 'correctAnswers', 'text-center')}
                {th('Accuracy', 'accuracy', 'text-center')}
                {th('Total Points', 'totalPoints', 'text-center')}
                {th('Rank', 'rank', 'text-center')}
                {th('Avg Speed', 'avgResponseTimeMs', 'text-right')}
                {th('Last Attempt', 'lastDate', 'text-right')}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={8}><div className="empty-state py-10"><div className="empty-state-icon"><Users className="w-5 h-5" /></div><p className="text-sm font-bold text-slate-900 dark:text-white">No students found</p></div></td></tr>
                : filtered.map(u => {
                  const accuracy = u.attempts ? Math.round((u.correctAnswers / u.attempts) * 100) : 0;
                  return (
                    <tr key={u.userName} className="table-row">
                      <td className="table-td font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-extrabold text-slate-600 dark:text-slate-300 shrink-0">
                            {u.userName.substring(0,2).toUpperCase()}
                          </div>
                          {u.userName}
                        </div>
                      </td>
                      <td className="table-td text-center text-slate-500">{u.attempts}</td>
                      <td className="table-td text-center font-semibold text-emerald-600 dark:text-emerald-400">{u.correctAnswers}</td>
                      <td className="table-td text-center">
                        <span className={`text-xs font-bold ${accuracy >= 80 ? 'text-emerald-600 dark:text-emerald-400' : accuracy >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>{accuracy}%</span>
                      </td>
                      <td className="table-td text-center font-extrabold text-slate-900 dark:text-white">{u.totalPoints.toFixed(2)}</td>
                      <td className="table-td text-center text-slate-500 font-mono text-xs">#{u.rank}</td>
                      <td className="table-td text-right font-mono text-xs text-slate-500">{(u.avgResponseTimeMs/1000).toFixed(2)}s</td>
                      <td className="table-td text-right text-xs text-slate-400 whitespace-nowrap">
                        {new Date(u.lastAttemptDate).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true })}
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          {filtered.length} student{filtered.length !== 1 ? 's' : ''} · Click any column header to sort asc / desc
        </div>
      </div>
    </div>
  );
}

/* ── 3. Quiz Attempts / Activity report ── */
function AttemptsReport({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const [search, setSearch]       = useState('');
  const [dateFilter, setDateFilter] = useState<'all'|'today'|'week'|'month'>('all');
  const [sortKey, setSortKey]     = useState<string>('lastDate');
  const [sortDir, setSortDir]     = useState<'asc'|'desc'>('desc');

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const th = (label: string, key: string, align = '') => (
    <SortTh label={label} sortKey={key} activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} align={align} />
  );

  const getVal = (u: LeaderboardEntry, k: string): number => {
    if (k === 'lastDate')   return new Date(u.lastAttemptDate).getTime();
    if (k === 'statusRank') {
      const rate = u.attempts ? u.correctAnswers / u.attempts : 0;
      return rate >= 0.8 ? 3 : rate >= 0.4 ? 2 : u.attempts > 0 ? 1 : 0;
    }
    return (u[k as keyof LeaderboardEntry] as number) ?? 0;
  };

  const todayStr  = new Date().toISOString().slice(0, 10);
  const weekAgo   = new Date(Date.now() - 7*24*3600*1000).toISOString().slice(0, 10);
  const monthAgo  = new Date(Date.now() - 30*24*3600*1000).toISOString().slice(0, 10);

  const filtered = leaderboard
    .filter(u => !search || u.userName.toLowerCase().includes(search.toLowerCase()))
    .filter(u => {
      if (dateFilter === 'all') return true;
      const d = u.lastAttemptDate.slice(0, 10);
      if (dateFilter === 'today')  return d === todayStr;
      if (dateFilter === 'week')   return d >= weekAgo;
      if (dateFilter === 'month')  return d >= monthAgo;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === 'userName') {
        const cmp = a.userName.localeCompare(b.userName);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const av = getVal(a, sortKey), bv = getVal(b, sortKey);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

  const handleExportCSV = () => {
    exportCSV('quiz_attempts.csv',
      filtered.map(u => [u.userName, String(u.attempts), String(u.correctAnswers), u.totalPoints.toFixed(2), (u.avgResponseTimeMs/1000).toFixed(2)+'s', new Date(u.lastAttemptDate).toLocaleString()]),
      ['Student','Total Attempts','Correct','Total Points','Avg Speed','Last Attempt']
    );
    toast.success('Attempts report exported.');
  };

  const handleExportPDF = () => {
    const rows = filtered.map(u => {
      const status = u.correctAnswers > 0 ? 'Completed' : 'Attempted';
      return `<tr><td>${u.userName}</td><td>${u.attempts}</td><td>${u.correctAnswers}</td><td>${u.totalPoints.toFixed(2)} pts</td><td>${(u.avgResponseTimeMs/1000).toFixed(2)}s</td><td style="color:${status==='Completed'?'#16a34a':'#64748b'}">${status}</td></tr>`;
    }).join('');
    exportPDF('Quiz Attempts Report', `<h1>Quiz Attempt / Activity Report</h1><p class="sub">Generated: ${new Date().toLocaleString()}</p><table><thead><tr><th>Student</th><th>Attempts</th><th>Correct</th><th>Points</th><th>Avg Speed</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`);
  };

  const statusBadge = (u: LeaderboardEntry) => {
    if (u.attempts === 0) return <span className="badge badge-slate">No Attempts</span>;
    const rate = u.correctAnswers / u.attempts;
    if (rate >= 0.8) return <span className="badge badge-green">Completed</span>;
    if (rate >= 0.4) return <span className="badge badge-amber">In Progress</span>;
    return <span className="badge badge-red">Needs Work</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Quiz Attempt Activity</h2>
          <p className="text-xs text-slate-500 mt-0.5">Per-student attempt counts, scores, and status.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="btn btn-secondary btn-xs gap-1.5"><FileText className="w-3 h-3" />CSV</button>
          <button onClick={handleExportPDF} className="btn btn-secondary btn-xs gap-1.5"><FileText className="w-3 h-3" />PDF</button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="search-wrap flex-1 min-w-[160px]">
          <Search className="search-icon" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="search-input" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-icon w-5 h-5"><X className="w-3.5 h-3.5" /></button>}
        </div>
        {(['all','today','week','month'] as const).map(f => (
          <button key={f} onClick={() => setDateFilter(f)} className={`filter-chip capitalize ${dateFilter === f ? 'filter-chip-active' : ''}`}>
            {f === 'all' ? 'All Time' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                {th('Student',      'userName')}
                {th('Attempts',     'attempts',     'text-center')}
                {th('Correct',      'correctAnswers','text-center')}
                {th('Points',       'totalPoints',   'text-center')}
                {th('Avg Speed',    'avgResponseTimeMs','text-right')}
                {th('Status',       'statusRank',    'text-center')}
                {th('Last Attempt', 'lastDate',      'text-right')}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7}><div className="empty-state py-10"><div className="empty-state-icon"><Activity className="w-5 h-5" /></div><p className="text-sm font-bold text-slate-900 dark:text-white">No attempts match filters</p></div></td></tr>
                : filtered.map(u => (
                  <tr key={u.userName} className="table-row">
                    <td className="table-td font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-extrabold text-slate-500 shrink-0">
                          {u.userName.substring(0,2).toUpperCase()}
                        </div>
                        {u.userName}
                      </div>
                    </td>
                    <td className="table-td text-center text-slate-500">{u.attempts}</td>
                    <td className="table-td text-center font-semibold text-emerald-600 dark:text-emerald-400">{u.correctAnswers}</td>
                    <td className="table-td text-center font-extrabold text-slate-900 dark:text-white">{u.totalPoints.toFixed(2)}</td>
                    <td className="table-td text-right font-mono text-xs text-slate-500">{(u.avgResponseTimeMs/1000).toFixed(2)}s</td>
                    <td className="table-td text-center">{statusBadge(u)}</td>
                    <td className="table-td text-right text-xs text-slate-400 whitespace-nowrap">
                      {new Date(u.lastAttemptDate).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit', hour12:true })}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>{filtered.length} records</span>
          <span>Statuses: <span className="text-emerald-600 font-medium">Completed</span> · <span className="text-amber-600 font-medium">In Progress</span> · <span className="text-rose-600 font-medium">Needs Work</span></span>
        </div>
      </div>
    </div>
  );
}

/* ── 4. Question Bank analysis report ── */
function QuestionBankReport({ questions }: { questions: Question[] }) {
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterDiff, setFilterDiff] = useState<'All'|'Easy'|'Medium'|'Hard'>('All');
  const [sortKey, setSortKey]     = useState<string>('id');
  const [sortDir, setSortDir]     = useState<'asc'|'desc'>('asc');

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  const th = (label: string, key: string, align = '') => (
    <SortTh label={label} sortKey={key} activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} align={align} />
  );

  const DIFF_ORDER: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
  const STATUS_ORDER: Record<string, number> = { Active: 2, Disabled: 1 };

  const categories = ['All', ...Array.from(new Set(questions.map(q => q.category)))];

  const filtered = questions.filter(q => {
    if (search && !q.questionText.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== 'All' && q.category !== filterCat) return false;
    if (filterDiff !== 'All' && q.difficulty !== filterDiff) return false;
    return true;
  }).sort((a, b) => {
    let av: string | number, bv: string | number;
    if (sortKey === 'id')         { av = a.id;          bv = b.id; }
    else if (sortKey === 'question') { av = a.questionText.toLowerCase(); bv = b.questionText.toLowerCase(); }
    else if (sortKey === 'category') { av = a.category.toLowerCase();     bv = b.category.toLowerCase(); }
    else if (sortKey === 'difficulty') { av = DIFF_ORDER[a.difficulty] ?? 2; bv = DIFF_ORDER[b.difficulty] ?? 2; }
    else if (sortKey === 'answer')   { av = a.correctOption; bv = b.correctOption; }
    else if (sortKey === 'status')   { av = STATUS_ORDER[a.active ? 'Active' : 'Disabled'] ?? 0; bv = STATUS_ORDER[b.active ? 'Active' : 'Disabled'] ?? 0; }
    else if (sortKey === 'created')  { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); }
    else { av = 0; bv = 0; }
    if (typeof av === 'string' && typeof bv === 'string') {
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const handleExportCSV = () => {
    exportCSV('question_bank_report.csv',
      filtered.map(q => [String(q.id), q.questionText.replace(/\n/g,' '), q.category, q.difficulty, q.correctOption, q.active ? 'Active' : 'Disabled', new Date(q.createdAt).toLocaleDateString()]),
      ['ID','Question','Category','Difficulty','Answer','Status','Created']
    );
    toast.success('Question bank exported.');
  };

  const diffCount = (d: string) => questions.filter(q => q.difficulty === d).length;
  const summary = [
    { label: 'Total',    value: questions.length,                                        color: '' },
    { label: 'Active',   value: questions.filter(q => q.active).length,                  color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Disabled', value: questions.filter(q => !q.active).length,                 color: 'text-slate-400' },
    { label: 'Easy',     value: diffCount('Easy'),                                        color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Medium',   value: diffCount('Medium'),                                      color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Hard',     value: diffCount('Hard'),                                        color: 'text-rose-600 dark:text-rose-400' },
    { label: 'Categories', value: Array.from(new Set(questions.map(q => q.category))).length, color: '' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Question Bank Analysis</h2>
          <p className="text-xs text-slate-500 mt-0.5">Full question inventory with category and difficulty breakdown.</p>
        </div>
        <button onClick={handleExportCSV} className="btn btn-secondary btn-xs gap-1.5"><FileText className="w-3 h-3" />Export CSV</button>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-4 px-1">
        {summary.map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{label}</span>
            <strong className={`text-slate-900 dark:text-white ${color}`}>{value}</strong>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="search-wrap flex-1 min-w-[160px]">
          <Search className="search-icon" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..." className="search-input" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-icon w-5 h-5"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="field-input w-auto py-2 text-xs">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(['All','Easy','Medium','Hard'] as const).map(d => (
          <button key={d} onClick={() => setFilterDiff(d)} className={`filter-chip ${filterDiff === d ? 'filter-chip-active' : ''}`}>{d}</button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th w-12">ID</th>
                <th className="table-th">Question</th>
                <th className="table-th">Category</th>
                <th className="table-th">Difficulty</th>
                <th className="table-th text-center">Answer</th>
                <th className="table-th text-center">Status</th>
                <th className="table-th text-right">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7}><div className="empty-state py-10"><div className="empty-state-icon"><BookOpen className="w-5 h-5" /></div><p className="text-sm font-bold text-slate-900 dark:text-white">No questions match</p></div></td></tr>
                : filtered.map(q => (
                  <tr key={q.id} className={`table-row ${!q.active ? 'opacity-50' : ''}`}>
                    <td className="table-td font-mono text-slate-400 text-[11px]">#{q.id}</td>
                    <td className="table-td max-w-xs"><span className="line-clamp-2 text-xs text-slate-800 dark:text-slate-200">{q.questionText}</span></td>
                    <td className="table-td"><span className="badge badge-slate">{q.category}</span></td>
                    <td className="table-td"><DiffBadge d={q.difficulty} /></td>
                    <td className="table-td text-center font-bold text-slate-900 dark:text-white">{q.correctOption}</td>
                    <td className="table-td text-center">
                      <span className={`badge ${q.active ? 'badge-green' : 'badge-slate'}`}>{q.active ? 'Active' : 'Disabled'}</span>
                    </td>
                    <td className="table-td text-right text-xs text-slate-400 whitespace-nowrap">
                      {new Date(q.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' })}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          {filtered.length} of {questions.length} questions
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN ADMIN DASHBOARD
═══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [password, setPassword]           = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [questions, setQuestions]         = useState<Question[]>([]);
  const [stats, setStats]                 = useState<Stats | null>(null);
  const [leaderboard, setLeaderboard]     = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading]         = useState(false);

  /* Tab state */
  const [adminTab, setAdminTab]           = useState<AdminTab>('questions');
  const [reportTab, setReportTab]         = useState<ReportTab>('overview');

  /* Question Bank filter state */
  const [searchTerm, setSearchTerm]       = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDifficulty, setFilterDifficulty] = useState<FilterDifficulty>('All');
  const [filterStatus, setFilterStatus]   = useState<FilterStatus>('All');
  const [activeView, setActiveView]       = useState('all');

  /* Selection */
  const [selectedIds, setSelectedIds]     = useState<Set<number>>(new Set());

  /* Row expansion */
  const [expandedId, setExpandedId]       = useState<number | null>(null);

  /* Context menu */
  const [menuOpenId, setMenuOpenId]       = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Modals */
  const [modalOpen, setModalOpen]         = useState(false);
  const [editingId, setEditingId]         = useState<number | null>(null);
  const [formData, setFormData]           = useState({ ...defaultForm });
  const [formSaving, setFormSaving]       = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState<{ id: number; questionText: string } | null>(null);

  /* Bulk */
  const [bulkOpen, setBulkOpen]           = useState(false);
  const [bulkAction, setBulkAction]       = useState<BulkAction>('enable');
  const [bulkStep, setBulkStep]           = useState<BulkStep>('select');
  const [bulkResults, setBulkResults]     = useState<{ success: number; failed: number } | undefined>();

  /* Close context menu on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── Fetch admin data ── */
  const fetchAdminData = useCallback(async (pwd: string) => {
    setIsLoading(true);
    try {
      const [qRes, sRes, lRes] = await Promise.all([
        fetch('/api/admin/questions', { headers: { 'x-admin-password': pwd } }),
        fetch('/api/admin/stats',     { headers: { 'x-admin-password': pwd } }),
        fetch('/api/leaderboard?period=all-time'),
      ]);
      if (qRes.status === 401) { toast.error('Invalid admin password.'); setIsAuthenticated(false); return; }
      const [qData, sData, lData] = await Promise.all([qRes.json(), sRes.json(), lRes.json()]);
      if (qData.success && sData.success) {
        setQuestions(qData.questions || []);
        setStats(sData.stats);
        setLeaderboard(lData.leaderboard || []);
        setIsAuthenticated(true);
      } else {
        toast.error(qData.message || 'Error loading admin data.');
      }
    } catch { toast.error('Network error.'); }
    finally { setIsLoading(false); }
  }, []);

  const handleLogin = (pwd: string) => { setPassword(pwd); fetchAdminData(pwd); };
  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} isLoading={isLoading} />;

  /* ── Derived question filter ── */
  const categories = ['All', ...Array.from(new Set(questions.map(q => q.category)))];
  const filtered = questions.filter(q => {
    if (searchTerm && !q.questionText.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory !== 'All' && q.category !== filterCategory) return false;
    if (filterDifficulty !== 'All' && q.difficulty !== filterDifficulty) return false;
    if (filterStatus === 'Active' && !q.active) return false;
    if (filterStatus === 'Disabled' && q.active) return false;
    return true;
  });

  const activeFilterCount = (filterCategory !== 'All' ? 1 : 0) + (filterDifficulty !== 'All' ? 1 : 0) + (filterStatus !== 'All' ? 1 : 0) + (searchTerm ? 1 : 0);
  const allFilteredSelected = filtered.length > 0 && filtered.every(q => selectedIds.has(q.id));
  const someSelected = selectedIds.size > 0;

  /* ── Handlers ── */
  const openAddModal  = () => { setEditingId(null); setFormData({ ...defaultForm }); setModalOpen(true); };
  const openEditModal = (q: Question) => {
    setEditingId(q.id);
    setFormData({ questionText: q.questionText, optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD, correctOption: q.correctOption as any, category: q.category, difficulty: q.difficulty as any, active: q.active });
    setModalOpen(true); setMenuOpenId(null);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.questionText.trim().length < 10) { toast.error('Question must be at least 10 characters.'); return; }
    if (!formData.optionA || !formData.optionB || !formData.optionC || !formData.optionD) { toast.error('All four options are required.'); return; }
    setFormSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body   = editingId ? { id: editingId, ...formData } : formData;
      const res    = await fetch('/api/admin/questions', { method, headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify(body) });
      const data   = await res.json();
      if (data.success) { toast.success(editingId ? 'Question updated!' : 'Question added!'); setModalOpen(false); fetchAdminData(password); }
      else toast.error(data.message || 'Save failed.');
    } catch { toast.error('Failed to save.'); }
    finally { setFormSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget; setDeleteTarget(null);
    try {
      const res  = await fetch(`/api/admin/questions?id=${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } });
      const data = await res.json();
      if (data.success) { toast.success(`Question #${id} deleted.`); fetchAdminData(password); setSelectedIds(p => { const n = new Set(p); n.delete(id); return n; }); }
      else toast.error(data.message);
    } catch { toast.error('Delete failed.'); }
  };

  const handleToggleActive = async (q: Question) => {
    try {
      const res  = await fetch('/api/admin/questions', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify({ id: q.id, active: !q.active }) });
      const data = await res.json();
      if (data.success) { toast.success(`Question ${!q.active ? 'enabled' : 'disabled'}.`); setQuestions(p => p.map(i => i.id === q.id ? { ...i, active: !q.active } : i)); }
      else toast.error(data.message);
    } catch { toast.error('Toggle failed.'); }
    setMenuOpenId(null);
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) setSelectedIds(p => { const n = new Set(p); filtered.forEach(q => n.delete(q.id)); return n; });
    else setSelectedIds(p => { const n = new Set(p); filtered.forEach(q => n.add(q.id)); return n; });
  };
  const toggleSelect = (id: number) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const applyView = (v: typeof SAVED_VIEWS[0]) => { setActiveView(v.id); setFilterDifficulty(v.difficulty); setFilterStatus(v.status); setFilterCategory('All'); setSearchTerm(''); };

  const handleExportJSON = () => {
    const data = JSON.stringify(questions, null, 2);
    const a = Object.assign(document.createElement('a'), { href: 'data:text/json;charset=utf-8,' + encodeURIComponent(data), download: `question_bank_${Date.now()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    toast.success('Question bank exported.');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed)) { toast.error('JSON must be an array.'); return; }
        const res  = await fetch('/api/admin/questions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify(parsed) });
        const data = await res.json();
        if (data.success) { toast.success(data.message); fetchAdminData(password); } else toast.error(data.message);
      } catch { toast.error('Invalid JSON file.'); }
    };
    reader.readAsText(e.target.files[0], 'UTF-8');
    e.target.value = '';
  };

  const handleResetLeaderboard = async () => {
    if (!window.confirm('CAUTION: This will delete ALL user attempt history. Cannot be undone.')) return;
    try {
      const res  = await fetch('/api/admin/reset', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify({ target: 'leaderboard' }) });
      const data = await res.json();
      if (data.success) { toast.success(data.message); fetchAdminData(password); } else toast.error(data.message);
    } catch { toast.error('Reset failed.'); }
  };

  const executeBulk = async () => {
    setBulkStep('processing');
    const ids = Array.from(selectedIds);
    let success = 0, failed = 0;
    if (bulkAction === 'export') {
      const rows = questions.filter(q => selectedIds.has(q.id));
      const data = JSON.stringify(rows, null, 2);
      const a = Object.assign(document.createElement('a'), { href: 'data:text/json;charset=utf-8,' + encodeURIComponent(data), download: `selected_questions_${Date.now()}.json` });
      document.body.appendChild(a); a.click(); a.remove();
      success = rows.length;
    } else {
      for (const id of ids) {
        try {
          if (bulkAction === 'delete') {
            const r = await fetch(`/api/admin/questions?id=${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } });
            (await r.json()).success ? success++ : failed++;
          } else {
            const active = bulkAction === 'enable';
            const r = await fetch('/api/admin/questions', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify({ id, active }) });
            (await r.json()).success ? success++ : failed++;
          }
        } catch { failed++; }
      }
      fetchAdminData(password);
    }
    setSelectedIds(new Set());
    setBulkResults({ success, failed });
    setBulkStep('result');
    toast.success(`Bulk ${bulkAction}: ${success} done${failed ? `, ${failed} failed` : ''}`);
  };

  /* ═══════════════════════════════════
     RENDER
  ══════════════════════════════════ */
  return (
    <>
    <div className="max-w-7xl mx-auto my-6 space-y-5">

      {/* Page header */}
      <div className="page-header mb-0">
        <div className="breadcrumb"><span>Admin</span><span className="breadcrumb-sep">/</span><span className="breadcrumb-current">{adminTab === 'questions' ? 'Question Bank' : 'Reports'}</span></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Admin Panel</h1>
            <p className="page-subtitle">Manage questions, monitor activity, and view programme reports.</p>
          </div>
          {adminTab === 'questions' && (
            <div className="flex flex-wrap gap-2">
              <button onClick={openAddModal} className="btn btn-primary btn-sm gap-1.5"><Plus className="w-3.5 h-3.5" />Add Question</button>
              <button onClick={handleExportJSON} className="btn btn-secondary btn-sm gap-1.5"><Download className="w-3.5 h-3.5" />Export</button>
              <label className="btn btn-secondary btn-sm gap-1.5 cursor-pointer"><Upload className="w-3.5 h-3.5" />Import<input type="file" accept=".json" onChange={handleImportJSON} className="hidden" /></label>
              <button onClick={handleResetLeaderboard} className="btn btn-sm gap-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/50"><AlertTriangle className="w-3.5 h-3.5" />Reset LB</button>
            </div>
          )}
          {adminTab === 'reports' && (
            <button onClick={() => fetchAdminData(password)} className="btn btn-secondary btn-sm gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</button>
          )}
        </div>
      </div>

      {/* KPI strip — always visible */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total',    value: stats.totalQuestions,  icon: BookOpen,    sub: 'questions', accent: '' },
            { label: 'Active',   value: stats.activeQuestions, icon: Activity,    sub: 'in pool',   accent: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Attempts', value: stats.totalAttempts,   icon: BarChart2,   sub: 'all time',  accent: '' },
            { label: 'Users',    value: stats.totalUsers,      icon: Users,       sub: 'unique',    accent: '' },
            { label: 'Today',    value: stats.todayAttempts,   icon: TrendingUp,  sub: 'attempts',  accent: 'text-amber-600 dark:text-amber-400' },
          ].map(({ label, value, icon: Icon, sub, accent }) => (
            <div key={label} className="kpi-card">
              <span className="kpi-label"><Icon className="w-3.5 h-3.5" />{label}</span>
              <span className={`kpi-value ${accent}`}>{value}</span>
              <span className="kpi-sub">{sub}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main tabs */}
      <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
        {([
          { id: 'questions', label: 'Question Bank', icon: BookOpen },
          { id: 'reports',   label: 'Reports',       icon: BarChart3 },
        ] as { id: AdminTab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setAdminTab(id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${adminTab === id ? 'bg-[#0f172a] text-white dark:bg-white dark:text-black shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════
          QUESTION BANK TAB
      ════════════════════════════════ */}
      {adminTab === 'questions' && (
        <>
          {/* Saved views */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Views:</span>
            {SAVED_VIEWS.map(v => (
              <button key={v.id} onClick={() => applyView(v)} className={`filter-chip ${activeView === v.id ? 'filter-chip-active' : ''}`}>{v.label}</button>
            ))}
          </div>

          {/* Filter bar */}
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="search-wrap flex-1 min-w-[200px]">
                <Search className="search-icon" />
                <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setActiveView(''); }} placeholder="Search questions..." className="search-input" />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-icon w-5 h-5"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setActiveView(''); }} className="field-input w-auto py-2 text-xs">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="hidden sm:flex items-center gap-1">
                {(['All','Easy','Medium','Hard'] as FilterDifficulty[]).map(d => (
                  <button key={d} onClick={() => { setFilterDifficulty(d); setActiveView(''); }} className={`filter-chip ${filterDifficulty === d ? 'filter-chip-active' : ''}`}>{d}</button>
                ))}
              </div>
              <div className="hidden sm:flex items-center gap-1">
                {(['All','Active','Disabled'] as FilterStatus[]).map(s => (
                  <button key={s} onClick={() => { setFilterStatus(s); setActiveView(''); }} className={`filter-chip ${filterStatus === s ? 'filter-chip-active' : ''}`}>{s}</button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> / {questions.length}
                {activeFilterCount > 0 && <button onClick={() => { setSearchTerm(''); setFilterCategory('All'); setFilterDifficulty('All'); setFilterStatus('All'); setActiveView('all'); }} className="btn btn-ghost btn-xs gap-1"><X className="w-3 h-3" />Clear</button>}
              </div>
            </div>

            {/* Bulk bar */}
            {someSelected && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0f172a] dark:bg-slate-100 border-b border-[#0f172a] dark:border-slate-200">
                <span className="text-white dark:text-slate-900 text-xs font-bold">{selectedIds.size} selected</span>
                <button onClick={() => { setBulkOpen(true); setBulkStep('select'); setBulkResults(undefined); }} className="btn btn-xs gap-1.5 bg-white/15 dark:bg-slate-900/15 text-white dark:text-slate-900 border border-white/20 dark:border-slate-900/20 hover:bg-white/25 dark:hover:bg-slate-900/25">
                  <SlidersHorizontal className="w-3 h-3" />Bulk Actions
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="ml-auto btn-icon text-white/60 dark:text-slate-600 hover:text-white dark:hover:text-slate-900"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Table */}
            <div className="table-wrapper">
              <table className="table-base">
                <thead className="table-head">
                  <tr>
                    <th className="table-th w-10">
                      <button onClick={toggleSelectAll} className="btn-icon w-5 h-5">
                        {allFilteredSelected ? <CheckSquare className="w-4 h-4 text-[#0f172a] dark:text-white" /> : someSelected ? <Minus className="w-4 h-4 text-slate-400" /> : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                      </button>
                    </th>
                    <th className="table-th w-12">ID</th>
                    <th className="table-th">Question</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Difficulty</th>
                    <th className="table-th text-center">Answer</th>
                    <th className="table-th text-center">Status</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? <SkeletonRows cols={8} />
                    : filtered.length === 0
                    ? <tr><td colSpan={8}><div className="empty-state py-12"><div className="empty-state-icon"><Search className="w-5 h-5" /></div><p className="text-sm font-bold text-slate-900 dark:text-white">No questions found</p><p className="text-xs text-slate-500">Try adjusting your filters.</p></div></td></tr>
                    : filtered.map(q => (
                      <React.Fragment key={q.id}>
                        <tr className={`table-row ${!q.active ? 'opacity-50' : ''} ${selectedIds.has(q.id) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}>
                          <td className="table-td"><button onClick={() => toggleSelect(q.id)} className="btn-icon w-5 h-5">{selectedIds.has(q.id) ? <CheckSquare className="w-4 h-4 text-[#0f172a] dark:text-white" /> : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />}</button></td>
                          <td className="table-td font-mono text-slate-400 text-[11px] font-semibold">#{q.id}</td>
                          <td className="table-td max-w-xs">
                            <div className="flex items-start gap-2">
                              <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)} className="mt-0.5 btn-icon w-4 h-4 shrink-0 text-slate-300 hover:text-slate-600 dark:hover:text-slate-200">
                                {expandedId === q.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                              <span className="font-medium text-slate-900 dark:text-white line-clamp-2 text-xs leading-snug">{q.questionText}</span>
                            </div>
                          </td>
                          <td className="table-td"><span className="badge badge-slate">{q.category}</span></td>
                          <td className="table-td"><DiffBadge d={q.difficulty} /></td>
                          <td className="table-td text-center font-bold text-slate-900 dark:text-white">{q.correctOption}</td>
                          <td className="table-td text-center">
                            <button onClick={() => handleToggleActive(q)} className={`badge cursor-pointer transition-all ${q.active ? 'badge-green hover:badge-red' : 'badge-slate hover:badge-green'}`}>
                              {q.active ? <><Eye className="w-3 h-3" />Active</> : <><EyeOff className="w-3 h-3" />Off</>}
                            </button>
                          </td>
                          <td className="table-td text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openEditModal(q)} className="btn-icon" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                              <div className="relative" ref={menuOpenId === q.id ? menuRef : undefined}>
                                <button onClick={() => setMenuOpenId(menuOpenId === q.id ? null : q.id)} className="btn-icon" title="More"><MoreVertical className="w-3.5 h-3.5" /></button>
                                {menuOpenId === q.id && (
                                  <div className="absolute right-0 top-full mt-1 z-30 card-raised rounded-xl py-1.5 min-w-[160px]">
                                    <button onClick={() => openEditModal(q)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><Edit2 className="w-3.5 h-3.5 text-slate-400" />Edit</button>
                                    <button onClick={() => handleToggleActive(q)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                      {q.active ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}{q.active ? 'Disable' : 'Enable'}
                                    </button>
                                    <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2 my-1" />
                                    <button onClick={() => { setDeleteTarget({ id: q.id, questionText: q.questionText }); setMenuOpenId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"><Trash2 className="w-3.5 h-3.5" />Delete</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                        {expandedId === q.id && <ExpandedRow q={q} />}
                      </React.Fragment>
                    ))
                  }
                </tbody>
              </table>
            </div>
            {!isLoading && filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Showing <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> of <strong className="text-slate-900 dark:text-white">{questions.length}</strong></span>
                <span className="text-[11px] text-slate-400">{selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Click checkbox to select'}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════
          REPORTS TAB
      ════════════════════════════════ */}
      {adminTab === 'reports' && (
        <div className="space-y-4">
          {/* Report sub-tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {([
              { id: 'overview',  label: 'Overview',           icon: BarChart3 },
              { id: 'students',  label: 'Student Performance', icon: Users },
              { id: 'attempts',  label: 'Quiz Attempts',       icon: Activity },
              { id: 'qbank',     label: 'Question Bank',       icon: BookOpen },
            ] as { id: ReportTab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setReportTab(id)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${reportTab === id ? 'bg-[#0f172a] text-white dark:bg-white dark:text-black border-[#0f172a] dark:border-white shadow-sm' : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {/* Report content */}
          {stats && (
            <>
              {reportTab === 'overview'  && <OverviewReport     stats={stats}   questions={questions} leaderboard={leaderboard} />}
              {reportTab === 'students'  && <StudentReport      leaderboard={leaderboard} />}
              {reportTab === 'attempts'  && <AttemptsReport     leaderboard={leaderboard} />}
              {reportTab === 'qbank'     && <QuestionBankReport questions={questions} />}
            </>
          )}
        </div>
      )}
    </div>

    {/* Modals */}
    {modalOpen    && <QuestionModal editingId={editingId} formData={formData} setFormData={setFormData} onSave={handleSaveQuestion} onClose={() => setModalOpen(false)} saving={formSaving} />}
    {deleteTarget && <DeleteModal item={deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />}
    {bulkOpen     && <BulkModal step={bulkStep} action={bulkAction} count={selectedIds.size} eligible={selectedIds.size} results={bulkResults}
      onAction={a => { setBulkAction(a); setBulkStep('configure'); }}
      onConfirm={() => { if (bulkStep === 'configure' || bulkStep === 'select') setBulkStep('confirm'); else if (bulkStep === 'confirm') executeBulk(); }}
      onCancel={() => { if (bulkStep === 'confirm') setBulkStep('configure'); else { setBulkOpen(false); setBulkStep('select'); } }}
      onClose={() => { setBulkOpen(false); setBulkStep('select'); setBulkResults(undefined); }}
    />}
    </>
  );
}
