'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Lock, Plus, Edit2, Trash2, Download, Upload, AlertTriangle,
  X, Check, Eye, EyeOff, RefreshCw, ShieldCheck, BarChart2,
  Users, BookOpen, Activity, Save, Search, MoreVertical,
  ChevronDown, ChevronUp, SlidersHorizontal, Copy, Archive,
  FileText, CheckSquare, Square, Minus, AlertCircle, Loader2,
  CheckCircle2, ArrowRight, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Types ─────────────────────────────────────────────── */
interface Question {
  id: number;
  questionText: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctOption: string;
  category: string;
  difficulty: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface Stats {
  totalQuestions: number;
  activeQuestions: number;
  totalAttempts: number;
  totalUsers: number;
  todayAttempts: number;
}

type BulkAction = 'enable' | 'disable' | 'delete' | 'export';
type BulkStep = 'select' | 'configure' | 'confirm' | 'processing' | 'result';
type FilterDifficulty = 'All' | 'Easy' | 'Medium' | 'Hard';
type FilterStatus = 'All' | 'Active' | 'Disabled';

const defaultForm = {
  questionText: '',
  optionA: '', optionB: '', optionC: '', optionD: '',
  correctOption: 'A' as 'A' | 'B' | 'C' | 'D',
  category: 'General Security',
  difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
  active: true,
};

const SAVED_VIEWS = [
  { id: 'all',      label: 'All Questions',  difficulty: 'All' as FilterDifficulty, status: 'All' as FilterStatus },
  { id: 'active',   label: 'Active Only',    difficulty: 'All' as FilterDifficulty, status: 'Active' as FilterStatus },
  { id: 'disabled', label: 'Disabled',       difficulty: 'All' as FilterDifficulty, status: 'Disabled' as FilterStatus },
  { id: 'hard',     label: 'Hard Questions', difficulty: 'Hard' as FilterDifficulty, status: 'All' as FilterStatus },
];

/* ─── Skeleton rows ──────────────────────────────────────── */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 dark:border-slate-800 animate-pulse">
          <td className="py-3.5 px-4"><div className="skeleton h-4 w-4 rounded" /></td>
          <td className="py-3.5 px-4"><div className="skeleton h-4 w-6 rounded" /></td>
          <td className="py-3.5 px-4"><div className="skeleton h-4 rounded" style={{ width: '240px' }} /></td>
          <td className="py-3.5 px-4"><div className="skeleton h-4 w-24 rounded" /></td>
          <td className="py-3.5 px-4"><div className="skeleton h-4 w-16 rounded" /></td>
          <td className="py-3.5 px-4"><div className="skeleton h-5 w-16 rounded-full mx-auto" /></td>
          <td className="py-3.5 px-4"><div className="skeleton h-5 w-14 rounded-full mx-auto" /></td>
          <td className="py-3.5 px-4"><div className="skeleton h-4 w-16 rounded ml-auto" /></td>
        </tr>
      ))}
    </>
  );
}

/* ─── Difficulty badge ───────────────────────────────────── */
function DiffBadge({ d }: { d: string }) {
  const cls = d === 'Easy' ? 'badge-green' : d === 'Hard' ? 'badge-red' : 'badge-amber';
  return <span className={`badge ${cls}`}>{d}</span>;
}

/* ─── Row expansion ─────────────────────────────────────── */
function ExpandedRow({ q }: { q: Question }) {
  return (
    <tr className="bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
      <td colSpan={8} className="px-4 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {(['A', 'B', 'C', 'D'] as const).map(opt => (
            <div key={opt} className={`p-3 rounded-lg border ${
              q.correctOption === opt
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                : 'card-sunken'
            }`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                  q.correctOption === opt
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>{opt}</span>
                {q.correctOption === opt && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Correct</span>
                )}
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-snug">
                {q[`option${opt}` as keyof Question] as string}
              </p>
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

/* ═══════════════════════════════════════════════════════════
   LOGIN SCREEN
═══════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin, isLoading }: {
  onLogin: (pwd: string) => void;
  isLoading: boolean;
}) {
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
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter admin password..."
            autoFocus
            className="field-input pl-9"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !password.trim()}
          className="btn btn-primary btn-md w-full justify-center gap-2"
        >
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</>
            : <><ShieldCheck className="w-4 h-4" /> Unlock Admin Panel</>
          }
        </button>
      </form>
    </div>
  );
}

/* ─── Question form modal ────────────────────────────────── */
function QuestionModal({
  editingId, formData, setFormData, onSave, onClose, saving,
}: {
  editingId: number | null;
  formData: typeof defaultForm;
  setFormData: React.Dispatch<React.SetStateAction<typeof defaultForm>>;
  onSave: (e: React.FormEvent) => void;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel max-w-[560px]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {editingId ? `Edit Question #${editingId}` : 'Add New Question'}
          </h3>
          <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={onSave} className="p-6 space-y-4">
          {/* Question text */}
          <div>
            <label className="field-label">Question Text <span className="text-rose-500">*</span></label>
            <textarea
              rows={3}
              value={formData.questionText}
              onChange={e => setFormData(f => ({ ...f, questionText: e.target.value }))}
              placeholder="Enter the full question text..."
              className="field-input resize-none"
              required
            />
          </div>
          {/* Options grid */}
          <div className="grid grid-cols-2 gap-3">
            {(['A', 'B', 'C', 'D'] as const).map(opt => (
              <div key={opt}>
                <label className="field-label flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold ${
                    formData.correctOption === opt ? 'bg-[#0f172a] text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>{opt}</span>
                  Option {opt}
                </label>
                <input
                  type="text"
                  value={formData[`option${opt}` as 'optionA'|'optionB'|'optionC'|'optionD']}
                  onChange={e => setFormData(f => ({ ...f, [`option${opt}`]: e.target.value }))}
                  placeholder={`Option ${opt}...`}
                  className="field-input"
                  required
                />
              </div>
            ))}
          </div>
          {/* Meta row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="field-label">Correct Answer</label>
              <select
                value={formData.correctOption}
                onChange={e => setFormData(f => ({ ...f, correctOption: e.target.value as 'A'|'B'|'C'|'D' }))}
                className="field-input"
              >
                {(['A','B','C','D'] as const).map(o => <option key={o} value={o}>Option {o}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                className="field-input"
                required
              />
            </div>
            <div>
              <label className="field-label">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={e => setFormData(f => ({ ...f, difficulty: e.target.value as 'Easy'|'Medium'|'Hard' }))}
                className="field-input"
              >
                <option>Easy</option><option>Medium</option><option>Hard</option>
              </select>
            </div>
          </div>
          {/* Active toggle */}
          <label className="flex items-center gap-3 p-3 rounded-lg card-sunken cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setFormData(f => ({ ...f, active: !f.active }))}
              className={`toggle shrink-0 ${formData.active ? 'bg-[#0f172a] dark:bg-white' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <span className={`toggle-thumb ${formData.active ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">{formData.active ? 'Active' : 'Disabled'}</p>
              <p className="text-[11px] text-slate-400">{formData.active ? 'Included in random quiz pool' : 'Hidden from quiz pool'}</p>
            </div>
          </label>
          {/* Actions */}
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

/* ─── Delete confirmation modal ─────────────────────────── */
function DeleteModal({ item, onConfirm, onCancel }: {
  item: { id: number; questionText: string };
  onConfirm: () => void;
  onCancel: () => void;
}) {
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
            <button onClick={onConfirm} className="btn btn-destructive btn-sm flex-1 justify-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Bulk operations modal ─────────────────────────────── */
function BulkModal({
  step, action, count, eligible, results,
  onAction, onConfirm, onCancel, onClose,
}: {
  step: BulkStep; action: BulkAction; count: number; eligible: number;
  results?: { success: number; failed: number };
  onAction: (a: BulkAction) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const actionLabels: Record<BulkAction, string> = {
    enable: 'Enable', disable: 'Disable', delete: 'Delete', export: 'Export CSV',
  };
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && step === 'result') onClose(); }}>
      <div className="modal-panel max-w-[460px]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Bulk Operation · {count} selected
          </h3>
          {(step === 'result') && <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>}
        </div>
        <div className="p-6 space-y-4">
          {/* Step: configure — pick action */}
          {(step === 'select' || step === 'configure') && (
            <>
              <p className="text-xs text-slate-500">Choose an action to apply to the {count} selected question{count !== 1 ? 's' : ''}:</p>
              <div className="grid grid-cols-2 gap-2">
                {(['enable','disable','delete','export'] as BulkAction[]).map(a => (
                  <button
                    key={a}
                    onClick={() => onAction(a)}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                      action === a
                        ? 'border-[#0f172a] dark:border-white bg-slate-50 dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                    } ${a === 'delete' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}
                  >
                    {actionLabels[a]}
                  </button>
                ))}
              </div>
              {action === 'delete' && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Deletion is permanent and cannot be undone.</span>
                </div>
              )}
            </>
          )}
          {/* Step: confirm */}
          {step === 'confirm' && (
            <>
              <div className="card-sunken rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Action</span><span className="font-bold text-slate-900 dark:text-white">{actionLabels[action]}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Selected</span><span className="font-bold text-slate-900 dark:text-white">{count} questions</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Eligible</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{eligible}</span></div>
                {eligible < count && <div className="flex justify-between"><span className="text-slate-500">Skipped</span><span className="font-bold text-amber-600 dark:text-amber-400">{count - eligible}</span></div>}
              </div>
            </>
          )}
          {/* Step: processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Processing {eligible} records...</p>
            </div>
          )}
          {/* Step: result */}
          {step === 'result' && results && (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="card-sunken rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Completed</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{results.success}</span></div>
                {results.failed > 0 && <div className="flex justify-between"><span className="text-slate-500">Failed</span><span className="font-bold text-rose-600 dark:text-rose-400">{results.failed}</span></div>}
              </div>
            </div>
          )}
        </div>
        {/* Footer actions */}
        {(step === 'configure' || step === 'select') && (
          <div className="flex gap-2 px-6 pb-5">
            <button onClick={onCancel} className="btn btn-secondary btn-sm flex-1 justify-center">Cancel</button>
            <button onClick={onConfirm} disabled={!action} className="btn btn-primary btn-sm flex-1 justify-center gap-1.5">
              Review <ArrowRight className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>
        )}
        {step === 'confirm' && (
          <div className="flex gap-2 px-6 pb-5">
            <button onClick={onCancel} className="btn btn-secondary btn-sm flex-1 justify-center">Back</button>
            <button onClick={onConfirm} className={`btn btn-sm flex-1 justify-center gap-1.5 ${action === 'delete' ? 'btn-destructive' : 'btn-primary'}`}>
              Confirm {actionLabels[action]}
            </button>
          </div>
        )}
        {step === 'result' && (
          <div className="px-6 pb-5">
            <button onClick={onClose} className="btn btn-primary btn-sm w-full justify-center">Done</button>
          </div>
        )}
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
  const [isLoading, setIsLoading]         = useState(false);

  /* Filter state */
  const [searchTerm, setSearchTerm]       = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDifficulty, setFilterDifficulty] = useState<FilterDifficulty>('All');
  const [filterStatus, setFilterStatus]   = useState<FilterStatus>('All');
  const [activeView, setActiveView]       = useState('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  /* Selection */
  const [selectedIds, setSelectedIds]     = useState<Set<number>>(new Set());

  /* Row expansion */
  const [expandedId, setExpandedId]       = useState<number | null>(null);

  /* Contextual action menu */
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

  /* Close menu on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Fetch ── */
  const fetchAdminData = useCallback(async (pwd: string) => {
    setIsLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        fetch('/api/admin/questions', { headers: { 'x-admin-password': pwd } }),
        fetch('/api/admin/stats',     { headers: { 'x-admin-password': pwd } }),
      ]);
      if (qRes.status === 401) { toast.error('Invalid admin password.'); setIsAuthenticated(false); return; }
      const [qData, sData] = await Promise.all([qRes.json(), sRes.json()]);
      if (qData.success && sData.success) {
        setQuestions(qData.questions || []);
        setStats(sData.stats);
        setIsAuthenticated(true);
      } else {
        toast.error(qData.message || 'Error loading admin data.');
      }
    } catch { toast.error('Network error.'); }
    finally { setIsLoading(false); }
  }, []);

  const handleLogin = (pwd: string) => { setPassword(pwd); fetchAdminData(pwd); };
  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} isLoading={isLoading} />;

  /* ── Derived data ── */
  const categories = ['All', ...Array.from(new Set(questions.map(q => q.category)))];
  const filtered = questions.filter(q => {
    if (searchTerm && !q.questionText.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory !== 'All' && q.category !== filterCategory) return false;
    if (filterDifficulty !== 'All' && q.difficulty !== filterDifficulty) return false;
    if (filterStatus === 'Active' && !q.active) return false;
    if (filterStatus === 'Disabled' && q.active) return false;
    return true;
  });

  const activeFilterCount =
    (filterCategory !== 'All' ? 1 : 0) +
    (filterDifficulty !== 'All' ? 1 : 0) +
    (filterStatus !== 'All' ? 1 : 0) +
    (searchTerm ? 1 : 0);

  const allFilteredSelected = filtered.length > 0 && filtered.every(q => selectedIds.has(q.id));
  const someSelected        = selectedIds.size > 0;

  /* ── Modal handlers ── */
  const openAddModal = () => { setEditingId(null); setFormData({ ...defaultForm }); setModalOpen(true); };
  const openEditModal = (q: Question) => {
    setEditingId(q.id);
    setFormData({ questionText: q.questionText, optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD, correctOption: q.correctOption as any, category: q.category, difficulty: q.difficulty as any, active: q.active });
    setModalOpen(true);
    setMenuOpenId(null);
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
    const { id } = deleteTarget;
    setDeleteTarget(null);
    try {
      const res  = await fetch(`/api/admin/questions?id=${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } });
      const data = await res.json();
      if (data.success) { toast.success(`Question #${id} deleted.`); fetchAdminData(password); setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; }); }
      else toast.error(data.message);
    } catch { toast.error('Delete failed.'); }
  };

  const handleToggleActive = async (q: Question) => {
    try {
      const res  = await fetch('/api/admin/questions', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify({ id: q.id, active: !q.active }) });
      const data = await res.json();
      if (data.success) { toast.success(`Question ${!q.active ? 'enabled' : 'disabled'}.`); setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, active: !q.active } : item)); }
      else toast.error(data.message);
    } catch { toast.error('Toggle failed.'); }
    setMenuOpenId(null);
  };

  /* ── Selection ── */
  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(q => n.delete(q.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(q => n.add(q.id)); return n; });
    }
  };
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  /* ── Apply saved view ── */
  const applyView = (v: typeof SAVED_VIEWS[0]) => {
    setActiveView(v.id);
    setFilterDifficulty(v.difficulty);
    setFilterStatus(v.status);
    setFilterCategory('All');
    setSearchTerm('');
  };

  /* ── Export JSON ── */
  const handleExportJSON = () => {
    const data = JSON.stringify(questions, null, 2);
    const a    = Object.assign(document.createElement('a'), { href: 'data:text/json;charset=utf-8,' + encodeURIComponent(data), download: `question_bank_${Date.now()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    toast.success('Question bank exported.');
  };

  /* ── Import JSON ── */
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed)) { toast.error('JSON must be an array.'); return; }
        const res  = await fetch('/api/admin/questions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify(parsed) });
        const data = await res.json();
        if (data.success) { toast.success(data.message); fetchAdminData(password); }
        else toast.error(data.message);
      } catch { toast.error('Invalid JSON file.'); }
    };
    reader.readAsText(e.target.files[0], 'UTF-8');
    e.target.value = '';
  };

  /* ── Reset leaderboard ── */
  const handleResetLeaderboard = async () => {
    if (!window.confirm('CAUTION: This will delete ALL user attempt history and reset leaderboards. Cannot be undone. Continue?')) return;
    try {
      const res  = await fetch('/api/admin/reset', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify({ target: 'leaderboard' }) });
      const data = await res.json();
      if (data.success) { toast.success(data.message); fetchAdminData(password); }
      else toast.error(data.message);
    } catch { toast.error('Reset failed.'); }
  };

  /* ── Bulk execute ── */
  const executeBulk = async () => {
    setBulkStep('processing');
    const ids = Array.from(selectedIds);
    let success = 0; let failed = 0;
    if (bulkAction === 'export') {
      const rows = questions.filter(q => selectedIds.has(q.id));
      const data = JSON.stringify(rows, null, 2);
      const a    = Object.assign(document.createElement('a'), { href: 'data:text/json;charset=utf-8,' + encodeURIComponent(data), download: `selected_questions_${Date.now()}.json` });
      document.body.appendChild(a); a.click(); a.remove();
      success = rows.length;
    } else {
      for (const id of ids) {
        try {
          if (bulkAction === 'delete') {
            const r = await fetch(`/api/admin/questions?id=${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } });
            const d = await r.json();
            if (d.success) success++; else failed++;
          } else {
            const active = bulkAction === 'enable';
            const r = await fetch('/api/admin/questions', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-password': password }, body: JSON.stringify({ id, active }) });
            const d = await r.json();
            if (d.success) success++; else failed++;
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

  /* ── RENDER ── */
  return (
    <>
    <div className="max-w-7xl mx-auto my-6 space-y-5">

      {/* Page header */}
      <div className="page-header mb-0">
        <div className="breadcrumb"><span>Admin</span><span className="breadcrumb-sep">/</span><span className="breadcrumb-current">Question Bank</span></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Question Bank</h1>
            <p className="page-subtitle">Manage questions, monitor activity, and configure quiz settings.</p>
          </div>
          {/* Header actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={openAddModal} className="btn btn-primary btn-sm gap-1.5"><Plus className="w-3.5 h-3.5" />Add Question</button>
            <button onClick={handleExportJSON} className="btn btn-secondary btn-sm gap-1.5"><Download className="w-3.5 h-3.5" />Export</button>
            <label className="btn btn-secondary btn-sm gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />Import
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            <button onClick={handleResetLeaderboard} className="btn btn-sm gap-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/50">
              <AlertTriangle className="w-3.5 h-3.5" />Reset LB
            </button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total',    value: stats.totalQuestions,  icon: BookOpen,  sub: 'questions' },
            { label: 'Active',   value: stats.activeQuestions, icon: Activity,  sub: 'in pool', accent: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Attempts', value: stats.totalAttempts,   icon: BarChart2, sub: 'all time' },
            { label: 'Users',    value: stats.totalUsers,      icon: Users,     sub: 'unique' },
            { label: 'Today',    value: stats.todayAttempts,   icon: Activity,  sub: 'attempts', accent: 'text-amber-600 dark:text-amber-400' },
          ].map(({ label, value, icon: Icon, sub, accent }) => (
            <div key={label} className="kpi-card">
              <span className="kpi-label"><Icon className="w-3.5 h-3.5" />{label}</span>
              <span className={`kpi-value ${accent ?? ''}`}>{value}</span>
              <span className="kpi-sub">{sub}</span>
            </div>
          ))}
        </div>
      )}

      {/* Saved views */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Views:</span>
        {SAVED_VIEWS.map(v => (
          <button key={v.id} onClick={() => applyView(v)} className={`filter-chip ${activeView === v.id ? 'filter-chip-active' : ''}`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
          {/* Search */}
          <div className="search-wrap flex-1 min-w-[200px]">
            <Search className="search-icon" />
            <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setActiveView(''); }} placeholder="Search questions..." className="search-input" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-icon w-5 h-5"><X className="w-3.5 h-3.5" /></button>}
          </div>
          {/* Category */}
          <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setActiveView(''); }} className="field-input w-auto py-2 text-xs">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* Difficulty chips */}
          <div className="hidden sm:flex items-center gap-1">
            {(['All','Easy','Medium','Hard'] as FilterDifficulty[]).map(d => (
              <button key={d} onClick={() => { setFilterDifficulty(d); setActiveView(''); }} className={`filter-chip ${filterDifficulty === d ? 'filter-chip-active' : ''}`}>{d}</button>
            ))}
          </div>
          {/* Status chips */}
          <div className="hidden sm:flex items-center gap-1">
            {(['All','Active','Disabled'] as FilterStatus[]).map(s => (
              <button key={s} onClick={() => { setFilterStatus(s); setActiveView(''); }} className={`filter-chip ${filterStatus === s ? 'filter-chip-active' : ''}`}>{s}</button>
            ))}
          </div>
          {/* Count + clear */}
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> / {questions.length}
            {activeFilterCount > 0 && (
              <button onClick={() => { setSearchTerm(''); setFilterCategory('All'); setFilterDifficulty('All'); setFilterStatus('All'); setActiveView('all'); }} className="btn btn-ghost btn-xs gap-1"><X className="w-3 h-3" />Clear</button>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {someSelected && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0f172a] dark:bg-slate-100 border-b border-[#0f172a] dark:border-slate-200">
            <span className="text-white dark:text-slate-900 text-xs font-bold">{selectedIds.size} selected</span>
            <button onClick={() => { setBulkOpen(true); setBulkStep('select'); setBulkResults(undefined); }} className="btn btn-xs gap-1.5 bg-white/15 dark:bg-slate-900/15 text-white dark:text-slate-900 border border-white/20 dark:border-slate-900/20 hover:bg-white/25 dark:hover:bg-slate-900/25">
              <SlidersHorizontal className="w-3 h-3" /> Bulk Actions
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto btn-icon text-white/60 dark:text-slate-600 hover:text-white dark:hover:text-slate-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Table */}
        <div className="table-wrapper">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th w-10">
                  <button onClick={toggleSelectAll} className="btn-icon w-5 h-5" aria-label="Select all">
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
                ? <SkeletonRows />
                : filtered.length === 0
                ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state py-12">
                      <div className="empty-state-icon"><Search className="w-5 h-5" /></div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">No questions found</p>
                      <p className="text-xs text-slate-500">Try adjusting your filters.</p>
                    </div>
                  </td></tr>
                )
                : filtered.map(q => (
                  <React.Fragment key={q.id}>
                    <tr className={`table-row ${!q.active ? 'opacity-50' : ''} ${selectedIds.has(q.id) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}>
                      {/* Checkbox */}
                      <td className="table-td">
                        <button onClick={() => toggleSelect(q.id)} className="btn-icon w-5 h-5">
                          {selectedIds.has(q.id) ? <CheckSquare className="w-4 h-4 text-[#0f172a] dark:text-white" /> : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                        </button>
                      </td>
                      {/* ID */}
                      <td className="table-td font-mono text-slate-400 text-[11px] font-semibold">#{q.id}</td>
                      {/* Question */}
                      <td className="table-td max-w-xs">
                        <div className="flex items-start gap-2">
                          <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)} className="mt-0.5 btn-icon w-4 h-4 shrink-0 text-slate-300 hover:text-slate-600 dark:hover:text-slate-200">
                            {expandedId === q.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <span className="font-medium text-slate-900 dark:text-white line-clamp-2 text-xs leading-snug">{q.questionText}</span>
                        </div>
                      </td>
                      {/* Category */}
                      <td className="table-td"><span className="badge badge-slate">{q.category}</span></td>
                      {/* Difficulty */}
                      <td className="table-td"><DiffBadge d={q.difficulty} /></td>
                      {/* Answer */}
                      <td className="table-td text-center font-bold text-slate-900 dark:text-white">{q.correctOption}</td>
                      {/* Status toggle */}
                      <td className="table-td text-center">
                        <button onClick={() => handleToggleActive(q)} className={`badge cursor-pointer transition-all ${q.active ? 'badge-green hover:badge-red' : 'badge-slate hover:badge-green'}`}>
                          {q.active ? <><Eye className="w-3 h-3" />Active</> : <><EyeOff className="w-3 h-3" />Off</>}
                        </button>
                      </td>
                      {/* Actions */}
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditModal(q)} className="btn-icon" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                          {/* Context menu */}
                          <div className="relative" ref={menuOpenId === q.id ? menuRef : undefined}>
                            <button onClick={() => setMenuOpenId(menuOpenId === q.id ? null : q.id)} className="btn-icon" title="More actions">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            {menuOpenId === q.id && (
                              <div className="absolute right-0 top-full mt-1 z-30 card-raised rounded-xl py-1.5 min-w-[160px]">
                                <button onClick={() => openEditModal(q)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />Edit
                                </button>
                                <button onClick={() => handleToggleActive(q)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                  {q.active ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                                  {q.active ? 'Disable' : 'Enable'}
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2 my-1" />
                                <button onClick={() => { setDeleteTarget({ id: q.id, questionText: q.questionText }); setMenuOpenId(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />Delete
                                </button>
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

        {/* Table footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Showing <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> of <strong className="text-slate-900 dark:text-white">{questions.length}</strong> questions</span>
            <span className="text-[11px] text-slate-400">{selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Click checkbox to select'}</span>
          </div>
        )}
      </div>
    </div>

    {/* ── Modals ── */}
    {modalOpen && (
      <QuestionModal
        editingId={editingId} formData={formData} setFormData={setFormData}
        onSave={handleSaveQuestion} onClose={() => setModalOpen(false)} saving={formSaving}
      />
    )}
    {deleteTarget && (
      <DeleteModal item={deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    )}
    {bulkOpen && (
      <BulkModal
        step={bulkStep} action={bulkAction} count={selectedIds.size}
        eligible={selectedIds.size} results={bulkResults}
        onAction={a => { setBulkAction(a); setBulkStep('configure'); }}
        onConfirm={() => {
          if (bulkStep === 'configure' || bulkStep === 'select') setBulkStep('confirm');
          else if (bulkStep === 'confirm') executeBulk();
        }}
        onCancel={() => { if (bulkStep === 'confirm') setBulkStep('configure'); else { setBulkOpen(false); setBulkStep('select'); } }}
        onClose={() => { setBulkOpen(false); setBulkStep('select'); setBulkResults(undefined); }}
      />
    )}
    </>
  );
}
