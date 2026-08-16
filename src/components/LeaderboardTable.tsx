'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy, Award, RefreshCw, Search, Download, ChevronUp,
  ChevronDown, ChevronsUpDown, Users, CheckCircle2, Clock,
  Star, AlertCircle, X, SlidersHorizontal, Eye, EyeOff
} from 'lucide-react';
import { LeaderboardEntry } from '@/types/quiz';
import toast from 'react-hot-toast';

/* ─── Types ──────────────────────────────────────────────── */
type Period = 'daily' | 'weekly' | 'monthly' | 'all-time';
type SortKey = 'rank' | 'userName' | 'attempts' | 'correctAnswers' | 'totalPoints' | 'avgResponseTimeMs' | 'lastAttemptDate';
type SortDir = 'asc' | 'desc';

interface SavedView {
  id: string;
  label: string;
  period: Period;
  sortKey: SortKey;
  sortDir: SortDir;
  visibleCols: SortKey[];
}

/* ─── Default saved views ─────────────────────────────────── */
const DEFAULT_VIEWS: SavedView[] = [
  { id: 'top-daily',   label: 'Top Today',     period: 'daily',    sortKey: 'totalPoints',      sortDir: 'desc', visibleCols: ['rank','userName','correctAnswers','totalPoints','avgResponseTimeMs'] },
  { id: 'all-time',    label: 'All-Time',       period: 'all-time', sortKey: 'totalPoints',      sortDir: 'desc', visibleCols: ['rank','userName','attempts','correctAnswers','totalPoints','avgResponseTimeMs','lastAttemptDate'] },
  { id: 'fastest',     label: 'Fastest',        period: 'weekly',   sortKey: 'avgResponseTimeMs', sortDir: 'asc',  visibleCols: ['rank','userName','correctAnswers','avgResponseTimeMs','totalPoints'] },
  { id: 'most-active', label: 'Most Active',    period: 'monthly',  sortKey: 'attempts',          sortDir: 'desc', visibleCols: ['rank','userName','attempts','correctAnswers','totalPoints'] },
];

/* ─── Column config ───────────────────────────────────────── */
const COLUMNS: { key: SortKey; label: string; align: 'left' | 'center' | 'right' }[] = [
  { key: 'rank',             label: 'Rank',         align: 'left' },
  { key: 'userName',         label: 'User',         align: 'left' },
  { key: 'attempts',         label: 'Attempts',     align: 'center' },
  { key: 'correctAnswers',   label: 'Correct',      align: 'center' },
  { key: 'totalPoints',      label: 'Points',       align: 'center' },
  { key: 'avgResponseTimeMs',label: 'Avg Speed',    align: 'right' },
  { key: 'lastAttemptDate',  label: 'Last Attempt', align: 'right' },
];

const PAGE_SIZE = 20;

/* ─── Skeleton row ────────────────────────────────────────── */
function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="py-3.5 px-4">
              <div className="skeleton h-4 rounded" style={{ width: j === 1 ? '120px' : '60px' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ─── Sort icon ───────────────────────────────────────────── */
function SortIcon({ colKey, sortKey, sortDir }: { colKey: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (colKey !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 ml-1" />;
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3 h-3 text-slate-700 dark:text-slate-200 ml-1" />
    : <ChevronDown className="w-3 h-3 text-slate-700 dark:text-slate-200 ml-1" />;
}

/* ─── Rank badge ──────────────────────────────────────────── */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-extrabold text-[11px]">🥇 #1</span>;
  if (rank === 2) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 font-extrabold text-[11px]">🥈 #2</span>;
  if (rank === 3) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-extrabold text-[11px]">🥉 #3</span>;
  return <span className="text-slate-400 dark:text-slate-500 font-mono text-xs pl-1">#{rank}</span>;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function LeaderboardTable() {
  const [period, setPeriod]           = useState<Period>('daily');
  const [entries, setEntries]         = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isError, setIsError]         = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey]         = useState<SortKey>('totalPoints');
  const [sortDir, setSortDir]         = useState<SortDir>('desc');
  const [visibleCols, setVisibleCols] = useState<SortKey[]>(
    COLUMNS.map(c => c.key)
  );
  const [showColPicker, setShowColPicker] = useState(false);
  const [activeView, setActiveView]   = useState<string>('all-time');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const colPickerRef = useRef<HTMLDivElement>(null);

  /* ── Fetch ── */
  const fetchLeaderboard = useCallback(async (p: Period) => {
    setIsLoading(true);
    setIsError(false);
    setDisplayCount(PAGE_SIZE);
    try {
      const res  = await fetch(`/api/leaderboard?period=${p}`);
      const data = await res.json();
      if (res.status === 429) { toast.error(data.message || 'Rate limit reached.'); setIsLoading(false); return; }
      if (data.success) {
        setEntries(data.leaderboard || []);
      } else {
        toast.error(data.message || 'Failed to load leaderboard');
        setIsError(true);
      }
    } catch {
      toast.error('Network error loading leaderboard.');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaderboard(period); }, [period, fetchLeaderboard]);

  /* ── Infinite scroll sentinel ── */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setDisplayCount(n => n + PAGE_SIZE); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  /* ── Close col picker on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
        setShowColPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Apply saved view ── */
  const applyView = (view: SavedView) => {
    setActiveView(view.id);
    setPeriod(view.period);
    setSortKey(view.sortKey);
    setSortDir(view.sortDir);
    setVisibleCols(view.visibleCols);
  };

  /* ── Sort toggle ── */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  /* ── Toggle column ── */
  const toggleCol = (key: SortKey) => {
    setVisibleCols(prev =>
      prev.includes(key)
        ? prev.length > 2 ? prev.filter(k => k !== key) : prev   // keep ≥2 cols
        : [...prev, key]
    );
  };

  /* ── Filter + sort ── */
  const processed = React.useMemo(() => {
    let list = searchQuery
      ? entries.filter(e => e.userName.toLowerCase().includes(searchQuery.toLowerCase()))
      : entries;

    list = [...list].sort((a, b) => {
      const av = a[sortKey as keyof LeaderboardEntry] as number | string;
      const bv = b[sortKey as keyof LeaderboardEntry] as number | string;
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [entries, searchQuery, sortKey, sortDir]);

  const displayed      = processed.slice(0, displayCount);
  const hasMore        = displayCount < processed.length;
  const activeColSet   = new Set(visibleCols);
  const shownCols      = COLUMNS.filter(c => activeColSet.has(c.key));

  /* ── Export CSV ── */
  const handleExport = () => {
    const header = shownCols.map(c => c.label).join(',');
    const rows   = processed.map(e =>
      shownCols.map(c => {
        const v = e[c.key as keyof LeaderboardEntry];
        if (c.key === 'avgResponseTimeMs') return `${((v as number) / 1000).toFixed(2)}s`;
        if (c.key === 'lastAttemptDate')   return new Date(v as string).toLocaleDateString();
        if (c.key === 'totalPoints')       return (v as number).toFixed(2);
        return String(v);
      }).join(',')
    );
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `leaderboard_${period}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${processed.length} rows as CSV`);
  };

  return (
    <div className="max-w-6xl mx-auto my-6 space-y-5">

      {/* ── Page header ── */}
      <div className="page-header">
        <div className="breadcrumb">
          <span>Home</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Leaderboard</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="page-title">Leaderboard</h1>
            <p className="page-subtitle">Rankings sorted by Points → Correct Answers → Fastest Response Time.</p>
          </div>
          {/* KPI strip */}
          {!isLoading && entries.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {entries.length} participants</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {entries.filter(e => e.correctAnswers > 0).length} with correct answers</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Saved views ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">Views:</span>
        {DEFAULT_VIEWS.map(view => (
          <button
            key={view.id}
            onClick={() => applyView(view)}
            className={`filter-chip ${activeView === view.id ? 'filter-chip-active' : ''}`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* ── Period tabs + actions ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Period tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          {(['daily', 'weekly', 'monthly', 'all-time'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => { setPeriod(p); setActiveView(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                period === p
                  ? 'bg-[#0f172a] text-white dark:bg-white dark:text-black shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {p === 'all-time' ? 'All-Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <button
            onClick={() => fetchLeaderboard(period)}
            className="p-1.5 ml-1 btn-ghost rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Column chooser */}
          <div className="relative" ref={colPickerRef}>
            <button
              onClick={() => setShowColPicker(v => !v)}
              className={`btn btn-secondary btn-sm gap-1.5 ${showColPicker ? 'border-slate-400 dark:border-slate-500' : ''}`}
              title="Choose columns"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Columns</span>
            </button>
            {showColPicker && (
              <div className="absolute right-0 top-full mt-1 z-30 card-raised rounded-xl py-2 min-w-[180px]">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Toggle Columns
                </p>
                {COLUMNS.map(col => (
                  <button
                    key={col.key}
                    onClick={() => toggleCol(col.key)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {activeColSet.has(col.key)
                      ? <Eye className="w-3.5 h-3.5 text-slate-400" />
                      : <EyeOff className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                    }
                    {col.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Export */}
          <button
            onClick={handleExport}
            disabled={isLoading || entries.length === 0}
            className="btn btn-secondary btn-sm gap-1.5"
            title="Export as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="card overflow-hidden">

        {/* Search + count bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="search-wrap flex-1 w-full sm:max-w-xs">
            <Search className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by username..."
              className="search-input"
              aria-label="Search participants"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-icon w-5 h-5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 ml-auto shrink-0">
            {searchQuery && processed.length !== entries.length && (
              <span className="badge badge-blue">{processed.length} match{processed.length !== 1 ? 'es' : ''}</span>
            )}
            <span>
              <strong className="text-slate-900 dark:text-white">{processed.length}</strong> participants
            </span>
          </div>
        </div>

        {/* ── Error state ── */}
        {isError && !isLoading && (
          <div className="empty-state">
            <div className="empty-state-icon text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Failed to load leaderboard</p>
            <p className="text-xs text-slate-500">Check your connection and try again.</p>
            <button onClick={() => fetchLeaderboard(period)} className="btn btn-secondary btn-sm gap-2 mt-1">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && !isError && entries.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Award className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">No attempts yet for this period</p>
            <p className="text-xs text-slate-500">Be the first to complete the quiz and claim #1!</p>
          </div>
        )}

        {/* ── No search results ── */}
        {!isLoading && !isError && entries.length > 0 && processed.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">No users match &ldquo;{searchQuery}&rdquo;</p>
            <button onClick={() => setSearchQuery('')} className="btn btn-ghost btn-sm gap-1.5">
              <X className="w-3.5 h-3.5" /> Clear search
            </button>
          </div>
        )}

        {/* ── Table ── */}
        {(isLoading || (!isError && processed.length > 0)) && (
          <div className="table-wrapper">
            <table className="table-base">
              <thead className="table-head">
                <tr>
                  {shownCols.map(col => (
                    <th
                      key={col.key}
                      className={`table-th-sortable ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}`}
                      onClick={() => handleSort(col.key)}
                      aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        {col.label}
                        <SortIcon colKey={col.key} sortKey={sortKey} sortDir={sortDir} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {isLoading
                  ? <SkeletonRows cols={shownCols.length} />
                  : displayed.map(entry => (
                    <tr key={entry.userName} className="table-row font-medium text-slate-700 dark:text-slate-300">

                      {activeColSet.has('rank') && (
                        <td className="table-td font-bold">
                          <RankBadge rank={entry.rank} />
                        </td>
                      )}

                      {activeColSet.has('userName') && (
                        <td className="table-td">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-extrabold text-slate-600 dark:text-slate-300 shrink-0">
                              {entry.userName.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{entry.userName}</span>
                            {entry.rank <= 3 && <Star className="w-3 h-3 text-amber-400 shrink-0" />}
                          </div>
                        </td>
                      )}

                      {activeColSet.has('attempts') && (
                        <td className="table-td text-center text-slate-500 dark:text-slate-400">
                          {entry.attempts}
                        </td>
                      )}

                      {activeColSet.has('correctAnswers') && (
                        <td className="table-td text-center">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {entry.correctAnswers}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]"> / {entry.attempts}</span>
                        </td>
                      )}

                      {activeColSet.has('totalPoints') && (
                        <td className="table-td text-center">
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {entry.totalPoints.toFixed(2)}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-0.5">pts</span>
                        </td>
                      )}

                      {activeColSet.has('avgResponseTimeMs') && (
                        <td className="table-td text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" />
                            {(entry.avgResponseTimeMs / 1000).toFixed(2)}s
                          </span>
                        </td>
                      )}

                      {activeColSet.has('lastAttemptDate') && (
                        <td className="table-td text-right text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(entry.lastAttemptDate).toLocaleString('en-US', {
                            month: 'short', day: 'numeric',
                            hour: 'numeric', minute: '2-digit', hour12: true,
                          })}
                        </td>
                      )}
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Loading more...
          </div>
        )}

        {/* Table footer */}
        {!isLoading && !isError && processed.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing <strong className="text-slate-900 dark:text-white">{Math.min(displayCount, processed.length)}</strong> of <strong className="text-slate-900 dark:text-white">{processed.length}</strong> participants
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Updates live after each quiz completion</span>
          </div>
        )}
      </div>
    </div>
  );
}
