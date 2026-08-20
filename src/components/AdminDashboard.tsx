'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Lock, Plus, Edit2, Trash2, Download, Upload, AlertTriangle,
  X, Eye, EyeOff, RefreshCw, ShieldCheck, BarChart2,
  Users, BookOpen, Activity, Save, Search, MoreVertical,
  ChevronDown, ChevronUp, SlidersHorizontal,
  CheckSquare, Square, Minus, AlertCircle, Loader2,
  CheckCircle2, ArrowRight, BarChart3, FileText,
  Trophy, Clock, Target, TrendingUp, Hash, ChevronsUpDown, Award,
  ShieldAlert, Layers, CalendarDays, Flame,
  AlertOctagon, CheckCircle, XCircle, TrendingDown,
  Mail, LogOut, Key, User, Building2, Check, Copy, KeyRound, Edit3,
} from 'lucide-react';


import toast from 'react-hot-toast';

/* ─── Types ─────────────────────────────────────────────── */
interface Question {
  id: number;
  scenario?: string | null;
  questionText: string;
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
type ReportTab = 'overview' | 'students' | 'attempts' | 'qbank' | 'risk' | 'category' | 'engagement' | 'trend';
type BulkAction = 'enable' | 'disable' | 'delete' | 'export';
type BulkStep = 'select' | 'configure' | 'confirm' | 'processing' | 'result';
type FilterDifficulty = 'All' | 'Easy' | 'Medium' | 'Hard';
type FilterStatus = 'All' | 'Active' | 'Disabled';

const defaultForm = {
  scenario: '',
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
      <td colSpan={8} className="px-4 py-4 space-y-3">
        {q.scenario && (
          <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs">
            <span className="font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider text-[10px] block mb-1">
              Case Scenario:
            </span>
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{q.scenario}</p>
          </div>
        )}
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
        <p className="text-[11px] text-slate-400 mt-1">
          Created: {new Date(q.createdAt).toLocaleString()}
          {q.updatedAt && ` · Updated: ${new Date(q.updatedAt).toLocaleString()}`}
        </p>
      </td>
    </tr>
  );
}

function LoginScreen({ onLogin, isLoading }: { onLogin: (email: string, pwd: string) => void; isLoading: boolean }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="max-w-md mx-auto my-16 card p-8 text-center space-y-6">
      <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
        <Lock className="w-6 h-6 text-slate-700 dark:text-slate-300" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Admin Authentication</h2>
        <p className="text-xs text-slate-500 mt-1">Enter your admin credentials to access the question bank</p>
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (identifier.trim() && password.trim()) onLogin(identifier.trim(), password);
        }}
        className="space-y-4 text-left"
      >
        <div>
          <label className="field-label">Admin Username</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="e.g. admin"
              autoFocus
              className="field-input pl-9"
              required
            />
          </div>
        </div>

        <div>
          <label className="field-label">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password..."
              className="field-input pl-9 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !identifier.trim() || !password.trim()}
          className="btn btn-primary btn-md w-full justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Authenticating...</>
          ) : (
            <><ShieldCheck className="w-4 h-4" />Unlock Admin Panel</>
          )}
        </button>

        {/* Super Admin Login Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
          <Link
            href="/superadmin"
            className="btn btn-secondary btn-sm w-full justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>Login as Super Admin</span>
          </Link>
        </div>


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
            <div className="flex items-center justify-between mb-1">
              <label className="field-label mb-0">Case Scenario / Context <span className="text-slate-400 font-normal">(Optional)</span></label>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Boxed separately above question</span>
            </div>
            <textarea
              rows={3}
              value={formData.scenario || ''}
              onChange={e => setFormData(f => ({ ...f, scenario: e.target.value }))}
              placeholder="e.g. Rahul works as a system administrator and needs to set a master password for a secure server..."
              className="field-input resize-none text-xs"
            />
          </div>
          <div>
            <label className="field-label">Question Text <span className="text-rose-500">*</span></label>
            <textarea rows={2} value={formData.questionText} onChange={e => setFormData(f => ({ ...f, questionText: e.target.value }))} placeholder="e.g. Which of the following employee passwords meets this requirement?" className="field-input resize-none" required />
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

/* ─── Certificate generator ─────────────────────────────── */
function downloadCertificate(u: LeaderboardEntry) {
  const accuracy = u.attempts ? Math.round((u.correctAnswers / u.attempts) * 100) : 0;
  const issuedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const win = window.open('', '_blank', 'width=1000,height=720');
  if (!win) { toast.error('Pop-up blocked — allow pop-ups and try again.'); return; }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Certificate – ${u.userName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Open+Sans:wght@400;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Open Sans', Arial, sans-serif;
      background: #f0f4f8;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 32px;
    }
    .cert {
      width: 860px;
      background: #fff;
      border: 12px solid #0f172a;
      outline: 4px solid #c9a84c;
      outline-offset: -20px;
      padding: 60px 72px;
      text-align: center;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,.18);
    }
    .corner {
      position: absolute;
      width: 60px; height: 60px;
      border-color: #c9a84c;
      border-style: solid;
    }
    .tl { top: 10px; left: 10px; border-width: 3px 0 0 3px; }
    .tr { top: 10px; right: 10px; border-width: 3px 3px 0 0; }
    .bl { bottom: 10px; left: 10px; border-width: 0 0 3px 3px; }
    .br { bottom: 10px; right: 10px; border-width: 0 3px 3px 0; }
    .seal {
      width: 72px; height: 72px;
      background: #0f172a;
      border-radius: 50%;
      margin: 0 auto 24px;
      display: flex; align-items: center; justify-content: center;
    }
    .seal svg { width: 38px; height: 38px; fill: #c9a84c; }
    .programme {
      font-size: 11pt;
      font-weight: 600;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 6px;
    }
    .title {
      font-family: 'Cinzel', serif;
      font-size: 28pt;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.15;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 10pt;
      color: #94a3b8;
      letter-spacing: .08em;
      text-transform: uppercase;
      margin-bottom: 32px;
    }
    .divider {
      width: 120px; height: 2px;
      background: linear-gradient(90deg, transparent, #c9a84c, transparent);
      margin: 0 auto 32px;
    }
    .presented { font-size: 10pt; color: #64748b; margin-bottom: 8px; }
    .name {
      font-family: 'Cinzel', serif;
      font-size: 32pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 2px solid #0f172a;
      display: inline-block;
      padding-bottom: 4px;
      margin-bottom: 28px;
      min-width: 360px;
    }
    .body-text {
      font-size: 11pt;
      color: #334155;
      line-height: 1.65;
      max-width: 560px;
      margin: 0 auto 32px;
    }
    .stats {
      display: flex;
      justify-content: center;
      gap: 48px;
      margin-bottom: 36px;
    }
    .stat { text-align: center; }
    .stat-val {
      font-size: 22pt;
      font-weight: 700;
      color: #0f172a;
      line-height: 1;
    }
    .stat-lbl { font-size: 8pt; color: #94a3b8; text-transform: uppercase; letter-spacing: .1em; margin-top: 4px; }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .sig-block { text-align: center; }
    .sig-line { width: 180px; border-bottom: 1.5px solid #0f172a; margin: 0 auto 6px; height: 32px; }
    .sig-label { font-size: 8pt; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; }
    .date-block { text-align: right; font-size: 9pt; color: #64748b; }
    @media print {
      body { background: white; padding: 0; }
      .cert { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="cert">
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>
    <div class="seal">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1l2.7 5.47L21 7.64l-4.5 4.39 1.06 6.2L12 15.27l-5.56 2.96 1.06-6.2L3 7.64l6.3-.91L12 1z"/>
      </svg>
    </div>
    <p class="programme">Cybersecurity Awareness &amp; Digital Safety Programme</p>
    <h1 class="title">Certificate of Achievement</h1>
    <p class="subtitle">Issued with distinction</p>
    <div class="divider"></div>
    <p class="presented">This certificate is proudly presented to</p>
    <div class="name">${u.userName}</div>
    <p class="body-text">
      for outstanding participation and performance in the
      <strong> Cybersecurity Awareness &amp; Digital Safety Quiz</strong>,
      demonstrating commendable knowledge of cybersecurity principles and digital safety practices.
    </p>
    <div class="stats">
      <div class="stat">
        <div class="stat-val">${u.totalPoints.toFixed(2)}</div>
        <div class="stat-lbl">Total Points</div>
      </div>
      <div class="stat">
        <div class="stat-val">#${u.rank}</div>
        <div class="stat-lbl">Rank</div>
      </div>
      <div class="stat">
        <div class="stat-val">${accuracy}%</div>
        <div class="stat-lbl">Accuracy</div>
      </div>
      <div class="stat">
        <div class="stat-val">${u.attempts}</div>
        <div class="stat-lbl">Attempts</div>
      </div>
    </div>
    <div class="footer-row">
      <div class="sig-block">
        <div class="sig-line"></div>
        <div class="sig-label">Programme Administrator</div>
      </div>
      <div class="date-block">
        <div style="font-size:8pt;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Date Issued</div>
        <div style="font-weight:600;color:#0f172a">${issuedDate}</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = () => { window.print(); window.addEventListener('afterprint', () => window.close()); };
  </script>
</body>
</html>`);
  win.document.close();
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
function StudentReport({ leaderboard, adminToken }: { leaderboard: LeaderboardEntry[]; adminToken?: string | null }) {
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState<string>('totalPoints');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  /* Student Password Reset Modal */
  const [resetModalStudent, setResetModalStudent] = useState<string | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [isResettingStudent, setIsResettingStudent] = useState(false);
  const [resetSuccessData, setResetSuccessData] = useState<{ nickname: string; temporaryPassword: string } | null>(null);
  const [copiedPwd, setCopiedPwd] = useState(false);

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

  const handleExportCSV = () => {
    exportCSV('students_report.csv',
      filtered.map(u => [
        u.userName,
        String(u.attempts),
        String(u.correctAnswers),
        `${u.attempts ? Math.round((u.correctAnswers / u.attempts) * 100) : 0}%`,
        u.totalPoints.toFixed(2),
        String(u.rank),
        (u.avgResponseTimeMs / 1000).toFixed(2),
        new Date(u.lastAttemptDate).toISOString().split('T')[0],
      ]),
      ['Student', 'Attempts', 'Correct', 'Accuracy', 'Total Points', 'Rank', 'Avg Speed (s)', 'Last Attempt']
    );
    toast.success('Student report exported.');
  };

  const handleExportPDF = () => {
    const rows = filtered.map(u => `<tr><td>${u.userName}</td><td>${u.attempts}</td><td>${u.correctAnswers}</td><td>${u.totalPoints.toFixed(2)} pts</td><td>#${u.rank}</td><td>${(u.avgResponseTimeMs/1000).toFixed(2)}s</td><td>${new Date(u.lastAttemptDate).toLocaleDateString()}</td></tr>`).join('');
    exportPDF('Student Performance Report', `<h1>Student Performance Report</h1><p class="sub">Generated: ${new Date().toLocaleString()}</p><table><thead><tr><th>Student</th><th>Attempts</th><th>Correct</th><th>Total Points</th><th>Rank</th><th>Avg Speed</th><th>Last Attempt</th></tr></thead><tbody>${rows}</tbody></table>`);
  };

  const handleResetStudentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalStudent) return;

    setIsResettingStudent(true);
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken || '',
          'x-admin-password': adminToken || '',
        },
        body: JSON.stringify({
          nickname: resetModalStudent,
          newPassword: customPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResetSuccessData({
          nickname: data.nickname,
          temporaryPassword: data.temporaryPassword,
        });
        setResetModalStudent(null);
        setCustomPassword('');
        toast.success(`Password reset for ${data.nickname}!`);
      } else {
        toast.error(data.message || 'Failed to reset password.');
      }
    } catch {
      toast.error('Network error resetting student password.');
    } finally {
      setIsResettingStudent(false);
    }
  };

  const th = (label: string, key: string, align = '') => (
    <SortTh label={label} sortKey={key} activeSortKey={sortKey} sortDir={sortDir} onSort={handleSort} align={align} />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Student Performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">Per-student attempts, scores, rank, speed, and credential management.</p>
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
                <th className="table-th text-center">Certificate</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={10}><div className="empty-state py-10"><div className="empty-state-icon"><Users className="w-5 h-5" /></div><p className="text-sm font-bold text-slate-900 dark:text-white">No students found</p></div></td></tr>
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
                      <td className="table-td text-center">
                        <button
                          onClick={() => downloadCertificate(u)}
                          title={`Download certificate for ${u.userName}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                        >
                          <Award className="w-3.5 h-3.5 shrink-0" />
                          Certificate
                        </button>
                      </td>
                      <td className="table-td text-right">
                        <button
                          onClick={() => {
                            setResetModalStudent(u.userName);
                            setCustomPassword('');
                          }}
                          title={`Reset password for student ${u.userName}`}
                          className="btn-icon text-slate-500 hover:text-amber-600 dark:hover:text-amber-400"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
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
                    <td className="table-td max-w-xs">
                      <div className="space-y-1">
                        {q.scenario && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                            Scenario
                          </span>
                        )}
                        <span className="line-clamp-2 text-xs text-slate-800 dark:text-slate-200 block">{q.questionText}</span>
                      </div>
                    </td>
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
   5. STUDENT RISK / INTERVENTION REPORT
═══════════════════════════════════════════════════════════ */
function RiskReport({ leaderboard, stats }: { leaderboard: LeaderboardEntry[]; stats: Stats }) {
  const [filterRisk, setFilterRisk] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [search, setSearch] = useState('');

  type RiskLevel = 'High' | 'Medium' | 'Low';

  function getRisk(u: LeaderboardEntry): RiskLevel {
    const accuracy = u.attempts > 0 ? u.correctAnswers / u.attempts : 0;
    if (u.attempts === 0) return 'High';
    if (accuracy < 0.35) return 'High';
    if (accuracy < 0.65) return 'Medium';
    return 'Low';
  }

  function getAction(risk: RiskLevel): string {
    if (risk === 'High') return 'Intervention';
    if (risk === 'Medium') return 'Encourage';
    return 'On Track';
  }

  const enriched = leaderboard.map(u => ({
    ...u,
    risk: getRisk(u),
    action: getAction(getRisk(u)),
    accuracy: u.attempts > 0 ? Math.round((u.correctAnswers / u.attempts) * 100) : 0,
  }));

  const filtered = enriched
    .filter(u => filterRisk === 'All' || u.risk === filterRisk)
    .filter(u => !search || u.userName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const order: Record<RiskLevel, number> = { High: 0, Medium: 1, Low: 2 };
      return order[a.risk as RiskLevel] - order[b.risk as RiskLevel];
    });

  const highCount   = enriched.filter(u => u.risk === 'High').length;
  const medCount    = enriched.filter(u => u.risk === 'Medium').length;
  const lowCount    = enriched.filter(u => u.risk === 'Low').length;
  const neverCount  = enriched.filter(u => u.attempts === 0).length;

  const riskBadge = (risk: RiskLevel) => {
    if (risk === 'High')   return <span className="inline-flex items-center gap-1 badge badge-red"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />High</span>;
    if (risk === 'Medium') return <span className="inline-flex items-center gap-1 badge badge-amber"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />Medium</span>;
    return <span className="inline-flex items-center gap-1 badge badge-green"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />Low</span>;
  };

  const actionBadge = (action: string) => {
    if (action === 'Intervention') return <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{action}</span>;
    if (action === 'Encourage')    return <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{action}</span>;
    return <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{action}</span>;
  };

  const handleExportCSV = () => {
    exportCSV('student_risk_report.csv',
      filtered.map(u => [u.userName, String(u.attempts), `${u.accuracy}%`, u.totalPoints.toFixed(2), new Date(u.lastAttemptDate).toLocaleDateString(), u.risk, u.action]),
      ['Student', 'Attempts', 'Accuracy', 'Score', 'Last Attempt', 'Risk', 'Action']
    );
    toast.success('Risk report exported.');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />Student Risk / Intervention Report
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Identifies students who need attention based on accuracy, attempts, and engagement.</p>
        </div>
        <button onClick={handleExportCSV} className="btn btn-secondary btn-xs gap-1.5"><FileText className="w-3 h-3" />Export CSV</button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Needs Intervention', value: highCount,  color: 'text-rose-600 dark:text-rose-400',    bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',    icon: AlertOctagon },
          { label: 'Needs Encouragement', value: medCount,  color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',  icon: AlertTriangle },
          { label: 'On Track',           value: lowCount,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', icon: CheckCircle },
          { label: 'Never Attempted',    value: neverCount, color: 'text-slate-500',                       bg: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',  icon: XCircle },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
            </div>
            <span className={`text-2xl font-extrabold ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="search-wrap flex-1 min-w-[160px]">
          <Search className="search-icon" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..." className="search-input" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-icon w-5 h-5"><X className="w-3.5 h-3.5" /></button>}
        </div>
        {(['All', 'High', 'Medium', 'Low'] as const).map(r => (
          <button key={r} onClick={() => setFilterRisk(r)} className={`filter-chip ${filterRisk === r ? 'filter-chip-active' : ''}`}>{r === 'All' ? 'All Levels' : r}</button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Student</th>
                <th className="table-th text-center">Attempts</th>
                <th className="table-th text-center">Accuracy</th>
                <th className="table-th text-center">Score</th>
                <th className="table-th text-right">Last Attempt</th>
                <th className="table-th text-center">Risk</th>
                <th className="table-th text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7}><div className="empty-state py-10"><div className="empty-state-icon"><ShieldAlert className="w-5 h-5" /></div><p className="text-sm font-bold text-slate-900 dark:text-white">No students match</p></div></td></tr>
                : filtered.map(u => (
                  <tr key={u.userName} className="table-row">
                    <td className="table-td font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-extrabold text-slate-600 dark:text-slate-300 shrink-0">
                          {u.userName.substring(0, 2).toUpperCase()}
                        </div>
                        {u.userName}
                      </div>
                    </td>
                    <td className="table-td text-center text-slate-500">{u.attempts}</td>
                    <td className="table-td text-center">
                      <span className={`text-xs font-bold ${u.accuracy >= 65 ? 'text-emerald-600 dark:text-emerald-400' : u.accuracy >= 35 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{u.attempts === 0 ? '—' : `${u.accuracy}%`}</span>
                    </td>
                    <td className="table-td text-center font-extrabold text-slate-900 dark:text-white">{u.totalPoints.toFixed(2)}</td>
                    <td className="table-td text-right text-xs text-slate-400 whitespace-nowrap">
                      {u.attempts === 0 ? <span className="text-slate-400">Never</span> : new Date(u.lastAttemptDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </td>
                    <td className="table-td text-center">{riskBadge(u.risk as RiskLevel)}</td>
                    <td className="table-td text-center">{actionBadge(u.action)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
          <span>Risk: <span className="text-rose-600 font-medium">High ≤ 35% acc</span> · <span className="text-amber-600 font-medium">Medium ≤ 65%</span> · <span className="text-emerald-600 font-medium">Low &gt; 65%</span></span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   6. CATEGORY PERFORMANCE REPORT
═══════════════════════════════════════════════════════════ */
function CategoryReport({ questions, leaderboard }: { questions: Question[]; leaderboard: LeaderboardEntry[] }) {
  // We derive per-category stats purely from the leaderboard + questions data we have.
  // Since individual attempt-level category data is not in the API, we use question counts
  // and scale attempt data proportionally per category.
  const categories = Array.from(new Set(questions.map(q => q.category))).sort();

  const totalQuestions = questions.length;
  const totalAttempts  = leaderboard.reduce((s, u) => s + u.attempts, 0);
  const totalCorrect   = leaderboard.reduce((s, u) => s + u.correctAnswers, 0);
  const totalTimeMs    = leaderboard.reduce((s, u) => s + u.avgResponseTimeMs * u.attempts, 0);

  const rows = categories.map(cat => {
    const catQs     = questions.filter(q => q.category === cat);
    const catActive = catQs.filter(q => q.active).length;
    const weight    = totalQuestions > 0 ? catQs.length / totalQuestions : 0;
    // Proportionally distribute leaderboard aggregates by question share
    const estAttempts = Math.round(totalAttempts * weight);
    const estCorrect  = Math.round(totalCorrect  * weight);
    const correctPct  = estAttempts > 0 ? Math.round((estCorrect / estAttempts) * 100) : 0;
    const avgScore    = estAttempts > 0 ? ((estCorrect / estAttempts) * catQs.length * 0.25).toFixed(1) : '0.0';
    const avgTimeMs   = totalAttempts > 0 ? Math.round(totalTimeMs / totalAttempts) : 0;

    type Status = 'Strong' | 'Good' | 'Needs Focus' | 'Weak';
    const status: Status = correctPct >= 70 ? 'Strong' : correctPct >= 55 ? 'Good' : correctPct >= 40 ? 'Needs Focus' : 'Weak';
    return { cat, total: catQs.length, active: catActive, estAttempts, correctPct, avgScore, avgTimeSec: (avgTimeMs / 1000).toFixed(1), status };
  }).sort((a, b) => b.correctPct - a.correctPct);

  const statusBadge = (s: string) => {
    if (s === 'Strong')      return <span className="badge badge-green">{s}</span>;
    if (s === 'Good')        return <span className="badge badge-green" style={{ opacity: 0.7 }}>{s}</span>;
    if (s === 'Needs Focus') return <span className="badge badge-amber">{s}</span>;
    return <span className="inline-flex items-center gap-1 badge badge-red"><AlertTriangle className="w-2.5 h-2.5" />{s}</span>;
  };

  const handleExportCSV = () => {
    exportCSV('category_performance.csv',
      rows.map(r => [r.cat, String(r.total), String(r.estAttempts), `${r.correctPct}%`, r.avgScore, `${r.avgTimeSec}s`, r.status]),
      ['Category', 'Questions', 'Est. Attempts', 'Correct %', 'Avg Score', 'Avg Time', 'Status']
    );
    toast.success('Category report exported.');
  };

  const strongCount      = rows.filter(r => r.status === 'Strong' || r.status === 'Good').length;
  const needsFocusCount  = rows.filter(r => r.status === 'Needs Focus').length;
  const weakCount        = rows.filter(r => r.status === 'Weak').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" />Category Performance Report
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Shows how students perform across each knowledge category — where to focus training.</p>
        </div>
        <button onClick={handleExportCSV} className="btn btn-secondary btn-xs gap-1.5"><FileText className="w-3 h-3" />Export CSV</button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Categories', value: categories.length, color: '',                                         bg: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' },
          { label: 'Strong / Good',    value: strongCount,       color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' },
          { label: 'Needs Focus',      value: needsFocusCount,   color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
          { label: 'Weak',             value: weakCount,         color: 'text-rose-600 dark:text-rose-400',       bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <span className={`text-2xl font-extrabold ${color || 'text-slate-900 dark:text-white'}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* Bar chart of correct % per category */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Correct % by Category</p>
        {rows.map(r => (
          <div key={r.cat} className="flex items-center gap-3 text-xs">
            <span className="w-36 shrink-0 text-slate-700 dark:text-slate-300 truncate font-medium">{r.cat}</span>
            <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${r.correctPct >= 70 ? 'bg-emerald-500' : r.correctPct >= 55 ? 'bg-emerald-400' : r.correctPct >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
                style={{ width: `${r.correctPct}%` }}
              />
            </div>
            <span className={`w-10 text-right font-bold shrink-0 ${r.correctPct >= 70 ? 'text-emerald-600 dark:text-emerald-400' : r.correctPct >= 55 ? 'text-emerald-600 dark:text-emerald-400' : r.correctPct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{r.correctPct}%</span>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Category</th>
                <th className="table-th text-center">Questions</th>
                <th className="table-th text-center">Est. Attempts</th>
                <th className="table-th text-center">Correct %</th>
                <th className="table-th text-center">Avg Score</th>
                <th className="table-th text-right">Avg Time</th>
                <th className="table-th text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.cat} className="table-row">
                  <td className="table-td font-semibold text-slate-800 dark:text-slate-200">{r.cat}</td>
                  <td className="table-td text-center text-slate-500">{r.total}</td>
                  <td className="table-td text-center text-slate-500">{r.estAttempts}</td>
                  <td className="table-td text-center">
                    <span className={`text-xs font-bold ${r.correctPct >= 65 ? 'text-emerald-600 dark:text-emerald-400' : r.correctPct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{r.correctPct}%</span>
                  </td>
                  <td className="table-td text-center font-semibold text-slate-900 dark:text-white">{r.avgScore}</td>
                  <td className="table-td text-right font-mono text-xs text-slate-500">{r.avgTimeSec}s</td>
                  <td className="table-td text-center">{statusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
          {rows.length} categories · Attempt counts are estimated proportional to question share
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   7. PROGRAMME ENGAGEMENT REPORT
═══════════════════════════════════════════════════════════ */
function EngagementReport({ leaderboard, stats }: { leaderboard: LeaderboardEntry[]; stats: Stats }) {
  const totalStudents    = stats.totalUsers;
  const attempted        = leaderboard.filter(u => u.attempts > 0).length;
  const neverAttempted   = totalStudents - attempted;
  const participationPct = totalStudents > 0 ? Math.round((attempted / totalStudents) * 100) : 0;
  const repeatParticipants = leaderboard.filter(u => u.attempts > 1).length;
  const avgAttemptsPerStudent = totalStudents > 0 ? (stats.totalAttempts / totalStudents).toFixed(1) : '0';

  // Daily activity: bucket lastAttemptDate by day (from leaderboard — best proxy available)
  const dayCounts: Record<string, number> = {};
  leaderboard.forEach(u => {
    if (u.attempts === 0) return;
    const day = new Date(u.lastAttemptDate).toLocaleDateString('en-US', { weekday: 'short' });
    dayCounts[day] = (dayCounts[day] || 0) + u.attempts;
  });
  const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayBars  = dayOrder.filter(d => dayCounts[d] > 0).map(d => ({ day: d, count: dayCounts[d] }));
  const maxBar   = Math.max(...dayBars.map(b => b.count), 1);

  // Activity tiers
  const tiers = [
    { label: 'Power Users (5+ attempts)',  count: leaderboard.filter(u => u.attempts >= 5).length,  color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
    { label: 'Regular (2–4 attempts)',     count: leaderboard.filter(u => u.attempts >= 2 && u.attempts <= 4).length, color: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
    { label: 'Tried Once',                 count: leaderboard.filter(u => u.attempts === 1).length, color: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-400' },
    { label: 'Never Attempted',            count: neverAttempted,                                    color: 'text-slate-400',                          bar: 'bg-slate-300 dark:bg-slate-700' },
  ];

  const handleExportCSV = () => {
    const rows: string[][] = [
      ['Total Students', String(totalStudents)],
      ['Students Attempted', String(attempted)],
      ['Never Attempted', String(neverAttempted)],
      ['Participation %', `${participationPct}%`],
      ['Repeat Participants', String(repeatParticipants)],
      ['Avg Attempts / Student', avgAttemptsPerStudent],
      ['Total Attempts', String(stats.totalAttempts)],
      ['Today\'s Attempts', String(stats.todayAttempts)],
    ];
    exportCSV('engagement_report.csv', rows, ['Metric', 'Value']);
    toast.success('Engagement report exported.');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-500" />Programme Engagement Report
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Participation metrics, activity tiers, and daily engagement — for college management reporting.</p>
        </div>
        <button onClick={handleExportCSV} className="btn btn-secondary btn-xs gap-1.5"><FileText className="w-3 h-3" />Export CSV</button>
      </div>

      {/* Core KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Students',         value: totalStudents,         color: '',                                          sub: 'registered' },
          { label: 'Students Participated',  value: attempted,             color: 'text-emerald-600 dark:text-emerald-400',   sub: `${participationPct}% of total` },
          { label: 'Never Attempted',        value: neverAttempted,        color: 'text-rose-600 dark:text-rose-400',         sub: 'need engagement' },
          { label: 'Repeat Participants',    value: repeatParticipants,    color: 'text-blue-600 dark:text-blue-400',         sub: '2+ attempts' },
          { label: 'Total Attempts',         value: stats.totalAttempts,   color: '',                                          sub: 'all time' },
          { label: 'Today\'s Attempts',      value: stats.todayAttempts,   color: 'text-amber-600 dark:text-amber-400',       sub: 'activity today' },
          { label: 'Avg Attempts / Student', value: avgAttemptsPerStudent, color: '',                                          sub: 'engagement depth' },
          { label: 'Participation Rate',     value: `${participationPct}%`, color: participationPct >= 70 ? 'text-emerald-600 dark:text-emerald-400' : participationPct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400', sub: 'of all students' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="kpi-card">
            <span className="kpi-label">{label}</span>
            <span className={`kpi-value text-xl ${color}`}>{value}</span>
            <span className="kpi-sub">{sub}</span>
          </div>
        ))}
      </div>

      {/* Participation gauge */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Overall Participation Rate</p>
          <span className={`text-sm font-extrabold ${participationPct >= 70 ? 'text-emerald-600 dark:text-emerald-400' : participationPct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{participationPct}%</span>
        </div>
        <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${participationPct >= 70 ? 'bg-emerald-500' : participationPct >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`}
            style={{ width: `${participationPct}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400">{attempted} out of {totalStudents} registered students have attempted at least one quiz</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Activity tiers */}
        <div className="card p-4 space-y-3">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Activity Tiers</p>
          {tiers.map(t => (
            <div key={t.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">{t.label}</span>
                <span className={`font-bold ${t.color}`}>{t.count}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${t.bar}`} style={{ width: totalStudents > 0 ? `${Math.round((t.count / totalStudents) * 100)}%` : '0%' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Daily participation chart */}
        <div className="card p-4 space-y-3">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Daily Quiz Participation</p>
          {dayBars.length === 0
            ? <p className="text-xs text-slate-400 py-4 text-center">No attempt data available</p>
            : dayBars.map(b => (
              <div key={b.day} className="flex items-center gap-3 text-xs">
                <span className="w-8 shrink-0 font-mono text-slate-500">{b.day}</span>
                <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round((b.count / maxBar) * 100)}%` }} />
                </div>
                <span className="w-8 text-right font-bold text-slate-700 dark:text-slate-300 shrink-0">{b.count}</span>
              </div>
            ))
          }
          <p className="text-[10px] text-slate-400">Based on last-attempt day per student</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   8. ACTIVITY TREND REPORT
═══════════════════════════════════════════════════════════ */
function TrendReport({ leaderboard, stats }: { leaderboard: LeaderboardEntry[]; stats: Stats }) {
  const [range, setRange] = useState<'7' | '30' | 'all'>('7');

  // Build daily buckets from leaderboard lastAttemptDate (best available proxy)
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const cutoff = range === 'all'
    ? new Date(0)
    : new Date(today.getTime() - (Number(range) - 1) * 24 * 3600 * 1000);

  // Aggregate: for each student, count their contribution to the day they last attempted
  // We show attempts (total) per day bucket
  type DayBucket = { date: string; label: string; attempts: number; students: number; points: number; accuracy: number; _correct: number; _total: number };
  const buckets: Record<string, DayBucket> = {};

  leaderboard.forEach(u => {
    if (u.attempts === 0) return;
    const d = new Date(u.lastAttemptDate);
    if (d < cutoff) return;
    const key = d.toISOString().slice(0, 10);
    if (!buckets[key]) {
      buckets[key] = {
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        attempts: 0, students: 0, points: 0, accuracy: 0, _correct: 0, _total: 0,
      };
    }
    buckets[key].attempts += u.attempts;
    buckets[key].students += 1;
    buckets[key].points   += u.totalPoints;
    buckets[key]._correct += u.correctAnswers;
    buckets[key]._total   += u.attempts;
  });

  const days = Object.values(buckets)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(b => ({ ...b, accuracy: b._total > 0 ? Math.round((b._correct / b._total) * 100) : 0, avgScore: b.students > 0 ? (b.points / b.students).toFixed(1) : '0' }));

  const maxAttempts = Math.max(...days.map(d => d.attempts), 1);
  const maxStudents = Math.max(...days.map(d => d.students), 1);

  const totalPeriodAttempts  = days.reduce((s, d) => s + d.attempts, 0);
  const totalPeriodStudents  = days.reduce((s, d) => s + d.students, 0);
  const avgAccuracy          = days.length > 0 ? Math.round(days.reduce((s, d) => s + d.accuracy, 0) / days.length) : 0;
  const peakDay              = days.reduce((best, d) => d.attempts > (best?.attempts ?? 0) ? d : best, days[0]);

  const handleExportCSV = () => {
    exportCSV('activity_trend.csv',
      days.map(d => [d.label, String(d.attempts), String(d.students), `${d.accuracy}%`, d.avgScore]),
      ['Date', 'Attempts', 'Active Students', 'Avg Accuracy', 'Avg Score']
    );
    toast.success('Activity trend exported.');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />Activity Trend Report
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Daily quiz activity — attempts, active students, accuracy, and score trends over time.</p>
        </div>
        <div className="flex items-center gap-2">
          {(['7', '30', 'all'] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} className={`filter-chip ${range === r ? 'filter-chip-active' : ''}`}>
              {r === '7' ? 'Last 7 Days' : r === '30' ? 'Last 30 Days' : 'All Time'}
            </button>
          ))}
          <button onClick={handleExportCSV} className="btn btn-secondary btn-xs gap-1.5"><FileText className="w-3 h-3" />Export CSV</button>
        </div>
      </div>

      {/* Period KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Attempts',    value: totalPeriodAttempts,              color: '' },
          { label: 'Active Students',   value: totalPeriodStudents,              color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Avg Accuracy',      value: `${avgAccuracy}%`,                color: avgAccuracy >= 65 ? 'text-emerald-600 dark:text-emerald-400' : avgAccuracy >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400' },
          { label: 'Peak Day',          value: peakDay ? peakDay.label : '—',   color: 'text-orange-600 dark:text-orange-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="kpi-card">
            <span className="kpi-label">{label}</span>
            <span className={`kpi-value text-xl ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      {days.length === 0 ? (
        <div className="empty-state py-16"><div className="empty-state-icon"><TrendingUp className="w-5 h-5" /></div><p className="text-sm font-bold text-slate-900 dark:text-white">No activity in this period</p></div>
      ) : (
        <>
          {/* Attempts bar chart */}
          <div className="card p-4 space-y-3">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Daily Attempts</p>
            <div className="space-y-2">
              {days.map(d => (
                <div key={d.date} className="flex items-center gap-3 text-xs">
                  <span className="w-16 shrink-0 text-slate-500 font-mono">{d.label}</span>
                  <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#0f172a] dark:bg-white" style={{ width: `${Math.round((d.attempts / maxAttempts) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-right font-bold text-slate-700 dark:text-slate-300 shrink-0">{d.attempts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active students chart */}
          <div className="card p-4 space-y-3">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Unique Active Students per Day</p>
            <div className="space-y-2">
              {days.map(d => (
                <div key={d.date} className="flex items-center gap-3 text-xs">
                  <span className="w-16 shrink-0 text-slate-500 font-mono">{d.label}</span>
                  <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round((d.students / maxStudents) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-right font-bold text-blue-600 dark:text-blue-400 shrink-0">{d.students}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data table */}
          <div className="card overflow-hidden">
            <div className="table-wrapper">
              <table className="table-base">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th text-center">Attempts</th>
                    <th className="table-th text-center">Active Students</th>
                    <th className="table-th text-center">Avg Accuracy</th>
                    <th className="table-th text-right">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map(d => (
                    <tr key={d.date} className="table-row">
                      <td className="table-td font-medium text-slate-800 dark:text-slate-200">{d.label}</td>
                      <td className="table-td text-center font-semibold text-slate-900 dark:text-white">{d.attempts}</td>
                      <td className="table-td text-center text-blue-600 dark:text-blue-400 font-semibold">{d.students}</td>
                      <td className="table-td text-center">
                        <span className={`text-xs font-bold ${d.accuracy >= 65 ? 'text-emerald-600 dark:text-emerald-400' : d.accuracy >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{d.accuracy}%</span>
                      </td>
                      <td className="table-td text-right font-mono text-xs text-slate-500">{d.avgScore} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              {days.length} day{days.length !== 1 ? 's' : ''} · Bucketed by each student's last attempt date
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN ADMIN DASHBOARD
═══════════════════════════════════════════════════════════ */
const ADMIN_STORAGE_KEY = 'cybersec_admin_token';
const ADMIN_USER_STORAGE_KEY = 'cybersec_admin_email';
const ADMIN_COLLEGE_STORAGE_KEY = 'cybersec_admin_college';
const ADMIN_DEPT_STORAGE_KEY = 'cybersec_admin_dept';

export default function AdminDashboard() {
  const [adminToken, setAdminToken]           = useState<string | null>(null);
  const [adminEmail, setAdminEmail]           = useState<string | null>(null);
  const [adminCollege, setAdminCollege]       = useState<{ id: number; name: string; identifier: string } | null>(null);
  const [adminDepartment, setAdminDepartment] = useState<{ id: number; departmentName: string; registrationKey: string; collegeId?: number } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [questions, setQuestions]             = useState<Question[]>([]);
  const [stats, setStats]                     = useState<Stats | null>(null);
  const [leaderboard, setLeaderboard]         = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading]             = useState(false);

  /* Registration Key management modal state */
  const [keyModalOpen, setKeyModalOpen]       = useState(false);
  const [newKeyInput, setNewKeyInput]         = useState('');
  const [keyUpdating, setKeyUpdating]         = useState(false);

  /* Tab state */
  const [adminTab, setAdminTab]               = useState<AdminTab>('questions');
  const [reportTab, setReportTab]             = useState<ReportTab>('overview');

  /* Question Bank filter state */
  const [searchTerm, setSearchTerm]           = useState('');
  const [filterCategory, setFilterCategory]   = useState('All');
  const [filterDifficulty, setFilterDifficulty] = useState<FilterDifficulty>('All');
  const [filterStatus, setFilterStatus]       = useState<FilterStatus>('All');
  const [activeView, setActiveView]           = useState('all');

  /* Selection */
  const [selectedIds, setSelectedIds]         = useState<Set<number>>(new Set());

  /* Row expansion */
  const [expandedId, setExpandedId]           = useState<number | null>(null);

  /* Context menu */
  const [menuOpenId, setMenuOpenId]           = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Modals */
  const [modalOpen, setModalOpen]             = useState(false);
  const [editingId, setEditingId]             = useState<number | null>(null);
  const [formData, setFormData]               = useState({ ...defaultForm });
  const [formSaving, setFormSaving]           = useState(false);
  const [deleteTarget, setDeleteTarget]       = useState<{ id: number; questionText: string } | null>(null);

  /* Bulk */
  const [bulkOpen, setBulkOpen]               = useState(false);
  const [bulkAction, setBulkAction]           = useState<BulkAction>('enable');
  const [bulkStep, setBulkStep]               = useState<BulkStep>('select');
  const [bulkResults, setBulkResults]         = useState<{ success: number; failed: number } | undefined>();

  /* Close context menu on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── Check stored admin session on mount ── */
  useEffect(() => {
    const savedToken = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    const savedEmail = sessionStorage.getItem(ADMIN_USER_STORAGE_KEY);
    const savedCol   = sessionStorage.getItem(ADMIN_COLLEGE_STORAGE_KEY);
    const savedDept  = sessionStorage.getItem(ADMIN_DEPT_STORAGE_KEY);
    if (savedToken) {
      setAdminToken(savedToken);
      if (savedEmail) setAdminEmail(savedEmail);
      if (savedCol) {
        try { setAdminCollege(JSON.parse(savedCol)); } catch { /* silent */ }
      }
      if (savedDept) {
        try { setAdminDepartment(JSON.parse(savedDept)); } catch { /* silent */ }
      }
      fetchAdminData(savedToken);
    }
  }, []);

  /* ── Fetch admin data ── */
  const fetchAdminData = useCallback(async (authToken: string) => {
    setIsLoading(true);
    try {
      const authHeaders = {
        'x-admin-token': authToken,
        'x-admin-password': authToken,
      };

      const [qRes, sRes, lRes, regRes] = await Promise.all([
        fetch('/api/admin/questions', { headers: authHeaders }),
        fetch('/api/admin/stats',     { headers: authHeaders }),
        fetch('/api/leaderboard?period=all-time', { headers: authHeaders }),
        fetch('/api/admin/registration-key', { headers: authHeaders }).catch(() => null),
      ]);

      if (qRes.status === 401) {
        toast.error('Session expired. Please log in again.');
        sessionStorage.removeItem(ADMIN_STORAGE_KEY);
        sessionStorage.removeItem(ADMIN_USER_STORAGE_KEY);
        sessionStorage.removeItem(ADMIN_COLLEGE_STORAGE_KEY);
        sessionStorage.removeItem(ADMIN_DEPT_STORAGE_KEY);
        setAdminToken(null);
        setIsAuthenticated(false);
        return;
      }

      const [qData, sData, lData] = await Promise.all([qRes.json(), sRes.json(), lRes.json()]);
      if (qData.success && sData.success) {
        setQuestions(qData.questions || []);
        setStats(sData.stats);
        if (sData.college) {
          setAdminCollege(sData.college);
          sessionStorage.setItem(ADMIN_COLLEGE_STORAGE_KEY, JSON.stringify(sData.college));
        }
        if (sData.collegeDepartment) {
          setAdminDepartment(sData.collegeDepartment);
          sessionStorage.setItem(ADMIN_DEPT_STORAGE_KEY, JSON.stringify(sData.collegeDepartment));
        }
        setLeaderboard(lData.leaderboard || []);
        setIsAuthenticated(true);
      } else {
        toast.error(qData.message || 'Error loading admin data.');
      }

      if (regRes && regRes.ok) {
        const regData = await regRes.json();
        if (regData.success && regData.department) {
          setAdminDepartment(regData.department);
          sessionStorage.setItem(ADMIN_DEPT_STORAGE_KEY, JSON.stringify(regData.department));
        }
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = async (email: string, pwd: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: pwd }),
      });

      const data = await res.json();
      if (data.success && data.token) {
        toast.success(data.message || 'Authenticated as Admin!');
        sessionStorage.setItem(ADMIN_STORAGE_KEY, data.token);
        if (data.admin?.email) {
          sessionStorage.setItem(ADMIN_USER_STORAGE_KEY, data.admin.email);
          setAdminEmail(data.admin.email);
        }
        if (data.admin?.college) {
          sessionStorage.setItem(ADMIN_COLLEGE_STORAGE_KEY, JSON.stringify(data.admin.college));
          setAdminCollege(data.admin.college);
        }
        if (data.admin?.collegeDepartment) {
          sessionStorage.setItem(ADMIN_DEPT_STORAGE_KEY, JSON.stringify(data.admin.collegeDepartment));
          setAdminDepartment(data.admin.collegeDepartment);
        }
        setAdminToken(data.token);
        setIsAuthenticated(true);
        fetchAdminData(data.token);
      } else {
        toast.error(data.message || 'Invalid email or password.');
      }
    } catch {
      toast.error('Login request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_USER_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_COLLEGE_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_DEPT_STORAGE_KEY);
    setAdminToken(null);
    setAdminEmail(null);
    setAdminCollege(null);
    setAdminDepartment(null);
    setIsAuthenticated(false);
    toast.success('Admin logged out.');
  };

  const handleUpdateRegistrationKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyInput.trim()) {
      toast.error('Registration key cannot be empty.');
      return;
    }

    setKeyUpdating(true);
    try {
      const res = await fetch('/api/admin/registration-key', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken || '',
          'x-admin-password': adminToken || '',
        },
        body: JSON.stringify({ registrationKey: newKeyInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.department) {
        setAdminDepartment(data.department);
        sessionStorage.setItem(ADMIN_DEPT_STORAGE_KEY, JSON.stringify(data.department));
        setKeyModalOpen(false);
        setNewKeyInput('');
        toast.success(data.message || 'Registration key updated successfully!');
      } else {
        toast.error(data.message || 'Failed to update registration key.');
      }
    } catch {
      toast.error('Network error updating registration key.');
    } finally {
      setKeyUpdating(false);
    }
  };


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

  /* ── Auth headers helper ── */
  const getAuthHeaders = () => ({
    'x-admin-token': adminToken || '',
    'x-admin-password': adminToken || '',
  });

  /* ── Handlers ── */
  const openAddModal  = () => { setEditingId(null); setFormData({ ...defaultForm }); setModalOpen(true); };
  const openEditModal = (q: Question) => {
    setEditingId(q.id);
    setFormData({
      scenario: q.scenario || '',
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption as any,
      category: q.category,
      difficulty: q.difficulty as any,
      active: q.active,
    });
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
      const res    = await fetch('/api/admin/questions', {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      const data   = await res.json();
      if (data.success) {
        toast.success(editingId ? 'Question updated!' : 'Question added!');
        setModalOpen(false);
        if (adminToken) fetchAdminData(adminToken);
      } else {
        toast.error(data.message || 'Save failed.');
      }
    } catch {
      toast.error('Failed to save.');
    } finally {
      setFormSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget; setDeleteTarget(null);
    try {
      const res  = await fetch(`/api/admin/questions?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Question #${id} deleted.`);
        if (adminToken) fetchAdminData(adminToken);
        setSelectedIds(p => { const n = new Set(p); n.delete(id); return n; });
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Delete failed.');
    }
  };

  const handleToggleActive = async (q: Question) => {
    try {
      const res  = await fetch('/api/admin/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ id: q.id, active: !q.active }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Question ${!q.active ? 'enabled' : 'disabled'}.`);
        setQuestions(p => p.map(i => i.id === q.id ? { ...i, active: !q.active } : i));
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Toggle failed.');
    }
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
        const res  = await fetch('/api/admin/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(parsed),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(data.message);
          if (adminToken) fetchAdminData(adminToken);
        } else {
          toast.error(data.message);
        }
      } catch {
        toast.error('Invalid JSON file.');
      }
    };
    reader.readAsText(e.target.files[0], 'UTF-8');
    e.target.value = '';
  };

  const handleResetLeaderboard = async () => {
    if (!window.confirm('CAUTION: This will delete ALL user attempt history. Cannot be undone.')) return;
    try {
      const res  = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ target: 'leaderboard' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        if (adminToken) fetchAdminData(adminToken);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Reset failed.');
    }
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
            const r = await fetch(`/api/admin/questions?id=${id}`, {
              method: 'DELETE',
              headers: getAuthHeaders(),
            });
            (await r.json()).success ? success++ : failed++;
          } else {
            const active = bulkAction === 'enable';
            const r = await fetch('/api/admin/questions', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
              body: JSON.stringify({ id, active }),
            });
            (await r.json()).success ? success++ : failed++;
          }
        } catch { failed++; }
      }
      if (adminToken) fetchAdminData(adminToken);
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
        <div className="breadcrumb">
          <span>Admin</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{adminTab === 'questions' ? 'Question Bank' : 'Reports'}</span>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">Admin Panel</h1>
              {adminEmail && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <Mail className="w-3 h-3 text-slate-400" />
                  {adminEmail}
                </span>
              )}
              {adminCollege && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  {adminCollege.name}
                  {adminDepartment?.departmentName && (
                    <>
                      <span className="text-amber-400 font-normal">/</span>
                      <span className="text-amber-900 dark:text-amber-200">{adminDepartment.departmentName}</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <p className="page-subtitle">Manage questions, monitor activity, and view department-scoped reports.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {adminTab === 'questions' && (
              <>
                <button onClick={openAddModal} className="btn btn-primary btn-sm gap-1.5"><Plus className="w-3.5 h-3.5" />Add Question</button>
                <button onClick={handleExportJSON} className="btn btn-secondary btn-sm gap-1.5"><Download className="w-3.5 h-3.5" />Export</button>
                <label className="btn btn-secondary btn-sm gap-1.5 cursor-pointer"><Upload className="w-3.5 h-3.5" />Import<input type="file" accept=".json" onChange={handleImportJSON} className="hidden" /></label>
                <button onClick={handleResetLeaderboard} className="btn btn-sm gap-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/50"><AlertTriangle className="w-3.5 h-3.5" />Reset LB</button>
              </>
            )}
            {adminTab === 'reports' && (
              <button onClick={() => adminToken && fetchAdminData(adminToken)} className="btn btn-secondary btn-sm gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Refresh</button>
            )}
            <button
              onClick={handleLogout}
              title="Log out of Admin Panel"
              className="btn btn-secondary btn-sm gap-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Registration Key Banner (for Department Admins) */}
      {adminDepartment && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-slate-800/80 dark:to-slate-800/40 border border-blue-200/80 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Department Registration Key</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">Active</span>
              </div>
              <p className="text-base font-mono font-extrabold text-slate-900 dark:text-white mt-0.5 tracking-wider">
                {adminDepartment.registrationKey}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                navigator.clipboard.writeText(adminDepartment.registrationKey);
                toast.success('Registration key copied to clipboard!');
              }}
              className="btn btn-secondary btn-xs gap-1.5 flex-1 sm:flex-initial"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Key</span>
            </button>
            <button
              onClick={() => {
                setNewKeyInput(adminDepartment.registrationKey);
                setKeyModalOpen(true);
              }}
              className="btn btn-primary btn-xs gap-1.5 flex-1 sm:flex-initial"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Change Key</span>
            </button>
          </div>
        </div>
      )}


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
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setAdminTab('questions')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            adminTab === 'questions'
              ? 'border-[#0f172a] text-[#0f172a] dark:border-white dark:text-white'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Question Bank ({questions.length})
        </button>
        <button
          onClick={() => setAdminTab('reports')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            adminTab === 'reports'
              ? 'border-[#0f172a] text-[#0f172a] dark:border-white dark:text-white'
              : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Analytics &amp; Reports
        </button>
      </div>

      {/* ════════════════════════════════
          QUESTION BANK TAB
      ════════════════════════════════ */}
      {adminTab === 'questions' && (
        <>
          <div className="card overflow-hidden">
            {/* Filter toolbar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search question text or options..."
                    className="field-input pl-9 text-xs"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-icon w-5 h-5">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="field-input text-xs w-auto">
                    {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
                  </select>
                  <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value as FilterDifficulty)} className="field-input text-xs w-auto">
                    {(['All', 'Easy', 'Medium', 'Hard'] as FilterDifficulty[]).map(d => <option key={d} value={d}>{d === 'All' ? 'All Difficulties' : d}</option>)}
                  </select>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)} className="field-input text-xs w-auto">
                    {(['All', 'Active', 'Disabled'] as FilterStatus[]).map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
                  </select>
                </div>
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
                              <div className="space-y-1">
                                {q.scenario && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                                    Scenario
                                  </span>
                                )}
                                <span className="font-medium text-slate-900 dark:text-white line-clamp-2 text-xs leading-snug block">{q.questionText}</span>
                              </div>
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
              { id: 'overview',    label: 'Overview',           icon: BarChart3 },
              { id: 'students',    label: 'Student Performance', icon: Users },
              { id: 'attempts',    label: 'Quiz Attempts',       icon: Activity },
              { id: 'qbank',       label: 'Question Bank',       icon: BookOpen },
              { id: 'risk',        label: 'Risk / Intervention', icon: ShieldAlert },
              { id: 'category',    label: 'Category Performance',icon: Layers },
              { id: 'engagement',  label: 'Engagement',          icon: CalendarDays },
              { id: 'trend',       label: 'Activity Trend',      icon: Flame },
            ] as { id: ReportTab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setReportTab(id)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all border ${reportTab === id ? 'bg-[#0f172a] text-white dark:bg-white dark:text-black border-[#0f172a] dark:border-white shadow-sm' : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {/* Report content */}
          {stats && (
            <>
              {reportTab === 'overview'   && <OverviewReport    stats={stats}   questions={questions} leaderboard={leaderboard} />}
              {reportTab === 'students'   && <StudentReport     leaderboard={leaderboard} adminToken={adminToken} />}
              {reportTab === 'attempts'   && <AttemptsReport    leaderboard={leaderboard} />}
              {reportTab === 'qbank'      && <QuestionBankReport questions={questions} />}
              {reportTab === 'risk'       && <RiskReport        leaderboard={leaderboard} stats={stats} />}
              {reportTab === 'category'   && <CategoryReport    questions={questions} leaderboard={leaderboard} />}
              {reportTab === 'engagement' && <EngagementReport  leaderboard={leaderboard} stats={stats} />}
              {reportTab === 'trend'      && <TrendReport       leaderboard={leaderboard} stats={stats} />}
            </>
          )}
        </div>
      )}
    </div>

    {/* Registration Key Modal */}
    {keyModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change Registration Key</h3>
            </div>
            <button onClick={() => setKeyModalOpen(false)} className="btn-icon">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleUpdateRegistrationKey} className="p-5 space-y-4">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Department: <strong className="text-slate-900 dark:text-white">{adminDepartment?.departmentName}</strong>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Current Key: <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-200">{adminDepartment?.registrationKey}</code>
              </p>
            </div>

            <div>
              <label htmlFor="newRegKey" className="field-label">
                New Registration Key <span className="text-rose-500">*</span>
              </label>
              <input
                id="newRegKey"
                type="text"
                value={newKeyInput}
                onChange={e => setNewKeyInput(e.target.value)}
                placeholder="e.g. MITCSE2027 or CSE-NEW"
                className="field-input"
                autoFocus
              />
              <p className="field-helper text-[11px] mt-1">
                You can choose any custom string (alphabetic, numbers, symbols, spaces). No minimum length or complexity required.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                Permanent Student Association
              </p>
              <p className="leading-relaxed">
                Changing this key only affects NEW registrations. All existing students already registered in this department will remain permanently associated and their quiz records will not be changed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setKeyModalOpen(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={keyUpdating || !newKeyInput.trim()}
                className="btn btn-primary btn-sm gap-1.5"
              >
                {keyUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save New Key</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
