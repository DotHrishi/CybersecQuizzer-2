'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserReportStats, CategoryStat } from '@/types/quiz';
import {
  BarChart3, Target, Clock, Trophy, CheckCircle2, XCircle,
  User, AlertCircle, Layers, BookOpen, Search,
  RefreshCw, Filter, X, ChevronDown, ChevronUp, ArrowRight,
  TrendingUp, Zap, Calendar, SlidersHorizontal, FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Topic list ─────────────────────────────────────────── */
const ALL_TOPICS = [
  'General Security','Disaster Recovery','Malware','Security Operations',
  'Cloud Security','Threat Intelligence','Security Tools','Incident Response',
  'Social Engineering','IAM & Governance','Network Security','Secure Coding',
  'Data Security','Compliance & Standards','Cryptography',
  'Identity & Access Management','Security Architecture','Network Attacks',
  'Physical Security','Web Security',
];

/* ─── Mastery badge ─────────────────────────────────────── */
const MASTERY_CONFIG = {
  Mastered:    { cls: 'badge-green',  label: 'Mastered'  },
  Proficient:  { cls: 'badge-blue',   label: 'Proficient'},
  Developing:  { cls: 'badge-amber',  label: 'Developing'},
  'Not Started':{ cls: 'badge-slate', label: 'Not Started'},
} as const;

/* ─── Filter types ──────────────────────────────────────── */
type DateFilter  = 'all' | '7d' | '30d' | '90d';
type ResultFilter = 'all' | 'correct' | 'incorrect';

/* ─── Skeleton ──────────────────────────────────────────── */
function ReportSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="skeleton h-16 rounded-xl" />
      <div className="skeleton h-48 rounded-xl" />
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );
}

/* ─── Topic mastery table row ───────────────────────────── */
function TopicRow({ stat, onClick, isActive }: {
  stat: CategoryStat;
  onClick: () => void;
  isActive: boolean;
}) {
  const mastery = MASTERY_CONFIG[stat.masteryLevel] ?? MASTERY_CONFIG['Not Started'];
  const pct     = stat.completionProgress ?? 0;
  const fillCls =
    stat.masteryLevel === 'Mastered'   ? 'progress-fill-green' :
    stat.masteryLevel === 'Proficient' ? 'progress-fill-blue'  :
    stat.masteryLevel === 'Developing' ? 'progress-fill-amber' :
    'progress-fill';

  return (
    <tr
      onClick={onClick}
      className={`table-row cursor-pointer ${isActive ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}
    >
      {/* Topic name */}
      <td className="table-td font-medium text-slate-800 dark:text-slate-200 max-w-[180px]">
        <span className="truncate block">{stat.category}</span>
      </td>
      {/* Progress bar + fraction */}
      <td className="table-td w-40 hidden sm:table-cell">
        <div className="space-y-1">
          <div className="progress-bar" style={{ height: '4px' }}>
            <div className={fillCls} style={{ width: `${Math.max(2, pct)}%` }} />
          </div>
          <span className="text-[10px] text-slate-400">{stat.attemptsCount}/{stat.totalBankQuestions}</span>
        </div>
      </td>
      {/* Accuracy */}
      <td className="table-td text-center">
        <span className={`text-xs font-bold ${
          stat.accuracyPercentage >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
          stat.accuracyPercentage >= 50 ? 'text-amber-600 dark:text-amber-400' :
          stat.attemptsCount === 0 ? 'text-slate-300 dark:text-slate-600' :
          'text-slate-500 dark:text-slate-400'
        }`}>
          {stat.attemptsCount === 0 ? '—' : `${stat.accuracyPercentage}%`}
        </span>
      </td>
      {/* Mastery */}
      <td className="table-td hidden md:table-cell">
        <span className={`badge ${mastery.cls}`}>{mastery.label}</span>
      </td>
      {/* Points */}
      <td className="table-td text-right font-mono text-xs text-slate-600 dark:text-slate-400">
        {stat.attemptsCount === 0 ? '—' : `${Number(stat.totalPoints).toFixed(1)} pts`}
      </td>
    </tr>
  );
}

/* ─── Timeline event ────────────────────────────────────── */
function TimelineEvent({ entry, isLast }: {
  entry: UserReportStats['history'][0];
  isLast: boolean;
}) {
  return (
    <div className="timeline-item">
      {!isLast && <div className="timeline-line" />}
      <div className={`timeline-dot ${
        entry.isCorrect
          ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
          : 'border-slate-300 dark:border-slate-600'
      }`}>
        {entry.isCorrect
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
          : <XCircle className="w-3.5 h-3.5 text-slate-400" />
        }
      </div>

      <div className="flex-1 min-w-0 pb-1">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {entry.quizDate}
          </span>
          {entry.category && (
            <span className="badge badge-slate">{entry.category}</span>
          )}
          <span className={`badge ${entry.isCorrect ? 'badge-green' : 'badge-red'}`}>
            {entry.isCorrect ? 'Correct' : 'Incorrect'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            <strong className="text-slate-700 dark:text-slate-300">{Number(entry.totalPoints).toFixed(2)} pts</strong>
          </span>
          {entry.isCorrect && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-400" />
              +{Number(entry.bonusPoints).toFixed(2)} speed bonus
            </span>
          )}
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3" />
            {(entry.responseTimeMs / 1000).toFixed(2)}s
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function UserReportView() {
  const [userName, setUserName]           = useState('');
  const [stats, setStats]                 = useState<UserReportStats | null>(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [isError, setIsError]             = useState(false);

  /* Filter state */
  const [selectedTopic, setSelectedTopic]   = useState('ALL');
  const [dateFilter, setDateFilter]         = useState<DateFilter>('all');
  const [resultFilter, setResultFilter]     = useState<ResultFilter>('all');
  const [topicSearch, setTopicSearch]       = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  /* ── Load on mount ── */
  useEffect(() => {
    const saved = localStorage.getItem('cyber_quiz_username');
    if (saved) { setUserName(saved); fetchReport(saved); }
  }, []);

  const fetchReport = useCallback(async (name: string) => {
    if (!name.trim()) return;
    setIsLoading(true);
    setIsError(false);
    try {
      const res  = await fetch(`/api/report?userName=${encodeURIComponent(name.trim())}`);
      const data = await res.json();
      if (res.status === 429) { toast.error(data.message || 'Rate limit reached.'); setIsLoading(false); return; }
      if (data.success) { setStats(data.stats); }
      else { toast.error(data.message || 'Failed to load report.'); setIsError(true); }
    } catch {
      toast.error('Network error loading report.');
      setIsError(true);
    } finally { setIsLoading(false); }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) { fetchReport(userName.trim()); }
  };

  /* ── Date boundary helper ── */
  const dateCutoff = useCallback((): Date | null => {
    if (dateFilter === 'all') return null;
    const d = new Date();
    if (dateFilter === '7d')  d.setDate(d.getDate() - 7);
    if (dateFilter === '30d') d.setDate(d.getDate() - 30);
    if (dateFilter === '90d') d.setDate(d.getDate() - 90);
    return d;
  }, [dateFilter]);

  /* ── Derived data ── */
  const activeTopic: CategoryStat | null =
    selectedTopic !== 'ALL' && stats?.topicStats
      ? stats.topicStats.find(t => t.category === selectedTopic) ?? null
      : null;

  const filteredHistory = React.useMemo(() => {
    if (!stats?.history) return [];
    const cutoff = dateCutoff();
    return stats.history.filter(h => {
      if (selectedTopic !== 'ALL' && h.category !== selectedTopic) return false;
      if (resultFilter === 'correct'   && !h.isCorrect)  return false;
      if (resultFilter === 'incorrect' && h.isCorrect)   return false;
      if (cutoff) {
        const d = new Date(h.createdAt || h.quizDate);
        if (d < cutoff) return false;
      }
      return true;
    });
  }, [stats, selectedTopic, resultFilter, dateCutoff]);

  const filteredTopics = React.useMemo(() => {
    if (!stats?.topicStats) return [];
    return topicSearch
      ? stats.topicStats.filter(t =>
          t.category.toLowerCase().includes(topicSearch.toLowerCase())
        )
      : stats.topicStats;
  }, [stats, topicSearch]);

  /* ── Active KPI source ── */
  const kpi = activeTopic
    ? {
        accuracy:    activeTopic.accuracyPercentage,
        accSub:      `${activeTopic.correctCount} correct / ${activeTopic.attemptsCount} attempted`,
        completion:  activeTopic.completionProgress,
        compSub:     `${activeTopic.attemptsCount} / ${activeTopic.totalBankQuestions} answered`,
        avgSpeed:    activeTopic.avgResponseTimeMs,
        points:      Number(activeTopic.totalPoints),
        pointsSub:   'Earned in topic',
      }
    : stats
    ? {
        accuracy:    stats.accuracyPercentage,
        accSub:      `${stats.correctAnswers} / ${stats.totalAttempts} correct`,
        completion:  stats.overallCompletionProgress ?? 0,
        compSub:     `${stats.totalAttempts} / ${stats.totalBankQuestionsAll ?? stats.totalAttempts}`,
        avgSpeed:    stats.avgResponseTimeMs,
        points:      Number(stats.totalPoints),
        pointsSub:   `Rank #${stats.bestRank}`,
      }
    : null;

  const activeFilterCount =
    (selectedTopic !== 'ALL' ? 1 : 0) +
    (dateFilter !== 'all' ? 1 : 0) +
    (resultFilter !== 'all' ? 1 : 0);

  /* ── PDF / Print ── */
  const handleDownloadPDF = () => {
    if (!stats) return;

    // Build a self-contained HTML string for printing
    const generatedAt = new Date().toLocaleString('en-IN', {
      dateStyle: 'long', timeStyle: 'short',
    });

    const topicRows = (stats.topicStats ?? []).map(t => {
      const bar = `<div style="width:100%;height:6px;background:#e2e8f0;border-radius:9999px;overflow:hidden;margin-top:3px"><div style="height:100%;border-radius:9999px;background:${
        t.masteryLevel === 'Mastered' ? '#16a34a' :
        t.masteryLevel === 'Proficient' ? '#2563eb' :
        t.masteryLevel === 'Developing' ? '#d97706' : '#94a3b8'
      };width:${Math.max(2, t.completionProgress ?? 0)}%"></div></div>`;

      return `<tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:6px 8px;font-size:10pt">${t.category}</td>
        <td style="padding:6px 8px;width:120px">${bar}<span style="font-size:8pt;color:#64748b">${t.attemptsCount}/${t.totalBankQuestions}</span></td>
        <td style="padding:6px 8px;text-align:center;font-weight:700;font-size:10pt;color:${
          t.accuracyPercentage >= 80 ? '#16a34a' :
          t.accuracyPercentage >= 50 ? '#d97706' : '#64748b'
        }">${t.attemptsCount === 0 ? '—' : t.accuracyPercentage + '%'}</td>
        <td style="padding:6px 8px;text-align:center;font-size:9pt">${t.masteryLevel}</td>
        <td style="padding:6px 8px;text-align:right;font-size:10pt">${t.attemptsCount === 0 ? '—' : Number(t.totalPoints).toFixed(2) + ' pts'}</td>
      </tr>`;
    }).join('');

    const historyRows = (stats.history ?? []).map(h => `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:5px 8px;font-size:9pt">${h.quizDate}</td>
        <td style="padding:5px 8px;font-size:9pt">${h.category ?? '—'}</td>
        <td style="padding:5px 8px;text-align:center;font-weight:700;font-size:9pt;color:${h.isCorrect ? '#16a34a' : '#dc2626'}">${h.isCorrect ? '✓ Correct' : '✗ Incorrect'}</td>
        <td style="padding:5px 8px;text-align:right;font-size:9pt">${Number(h.totalPoints).toFixed(2)} pts</td>
        <td style="padding:5px 8px;text-align:right;font-size:9pt;font-family:monospace">${(h.responseTimeMs / 1000).toFixed(2)}s</td>
      </tr>`
    ).join('');

    const overallPct = stats.overallCompletionProgress ?? 0;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Progress Report — ${stats.userName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #0f172a; padding: 32px 40px; }
    h1 { font-size: 20pt; font-weight: 800; }
    h2 { font-size: 13pt; font-weight: 700; margin: 24px 0 10px; border-bottom: 2px solid #0f172a; padding-bottom: 4px; }
    h3 { font-size: 11pt; font-weight: 700; margin: 16px 0 6px; }
    .meta { font-size: 9pt; color: #64748b; margin-top: 4px; }
    .kpi-row { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }
    .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; min-width: 120px; }
    .kpi-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
    .kpi-value { font-size: 18pt; font-weight: 800; margin: 2px 0; }
    .kpi-sub { font-size: 8pt; color: #94a3b8; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    thead tr { background: #f1f5f9; }
    th { padding: 7px 8px; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; text-align: left; border-bottom: 2px solid #e2e8f0; }
    th.center { text-align: center; }
    th.right { text-align: right; }
    .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; }
    @media print {
      body { padding: 20px 28px; }
      h2 { page-break-before: auto; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0f172a;padding-bottom:16px;margin-bottom:8px">
    <div>
      <h1>Cybersecurity Quiz</h1>
      <div style="font-size:14pt;font-weight:700;color:#2563eb;margin-top:2px">Progress Report</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11pt;font-weight:700">${stats.userName}</div>
      <div class="meta">Generated: ${generatedAt}</div>
    </div>
  </div>

  <!-- KPI Summary -->
  <h2>Summary</h2>
  <div class="kpi-row">
    <div class="kpi">
      <div class="kpi-label">Accuracy</div>
      <div class="kpi-value">${stats.accuracyPercentage}%</div>
      <div class="kpi-sub">${stats.correctAnswers} / ${stats.totalAttempts} correct</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Points</div>
      <div class="kpi-value">${Number(stats.totalPoints).toFixed(2)}</div>
      <div class="kpi-sub">Best rank #${stats.bestRank}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Avg Response</div>
      <div class="kpi-value">${(stats.avgResponseTimeMs / 1000).toFixed(2)}s</div>
      <div class="kpi-sub">Per question</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Completion</div>
      <div class="kpi-value">${overallPct}%</div>
      <div class="kpi-sub">${stats.totalAttempts} / ${stats.totalBankQuestionsAll ?? stats.totalAttempts} questions</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Attempts</div>
      <div class="kpi-value">${stats.totalAttempts}</div>
      <div class="kpi-sub">${stats.correctAnswers} correct · ${stats.wrongAnswers} incorrect</div>
    </div>
  </div>

  <!-- Overall progress bar -->
  <div style="margin:8px 0 20px">
    <div style="display:flex;justify-content:space-between;font-size:8.5pt;color:#64748b;margin-bottom:4px">
      <span>Overall question bank progress</span><span>${overallPct}%</span>
    </div>
    <div style="width:100%;height:8px;background:#e2e8f0;border-radius:9999px;overflow:hidden">
      <div style="height:100%;border-radius:9999px;background:#0f172a;width:${Math.max(2, overallPct)}%"></div>
    </div>
  </div>

  <!-- Topic Breakdown -->
  <h2>Topic Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Topic</th>
        <th style="width:130px">Progress</th>
        <th class="center">Accuracy</th>
        <th class="center">Mastery</th>
        <th class="right">Points</th>
      </tr>
    </thead>
    <tbody>${topicRows}</tbody>
  </table>

  <!-- Attempt History -->
  <h2 style="margin-top:28px">Attempt History</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Topic</th>
        <th class="center">Result</th>
        <th class="right">Points</th>
        <th class="right">Response</th>
      </tr>
    </thead>
    <tbody>${historyRows}</tbody>
  </table>

  <div class="footer">
    Cybersecurity Awareness &amp; Digital Safety Programme &nbsp;·&nbsp; This report was generated automatically for ${stats.userName} &nbsp;·&nbsp; ${generatedAt}
  </div>
</body>
</html>`;

    // Open in a new window and trigger print-to-PDF
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { toast.error('Pop-up blocked. Allow pop-ups for this site and try again.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      // Close the helper window after printing dialog is dismissed
      win.addEventListener('afterprint', () => win.close());
    }, 400);
  };

  return (
    <div className="max-w-6xl mx-auto my-6 space-y-6">

      {/* ── Page header ── */}
      <div className="page-header">
        <div className="breadcrumb">
          <span>Home</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">My Report</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="page-title">Performance Report</h1>
            <p className="page-subtitle">Track topic accuracy, response speed, and quiz history.</p>
          </div>

          {/* User lookup */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-56">
              <User className="search-icon" />
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Lookup username..."
                className="search-input"
                aria-label="Participant username"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm shrink-0">
              Fetch
            </button>
            {stats && stats.totalAttempts > 0 && (
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="btn btn-secondary btn-sm shrink-0 gap-1.5"
                title="Download detailed progress report as PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download PDF</span>
              </button>
            )}
          </form>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && <ReportSkeleton />}

      {/* ── Error ── */}
      {isError && !isLoading && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Failed to load report</p>
            <p className="text-xs text-slate-500">Check the username and try again.</p>
            <button onClick={() => fetchReport(userName)} className="btn btn-secondary btn-sm gap-2 mt-1">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Empty (no attempts) ── */}
      {!isLoading && !isError && stats && stats.totalAttempts === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <BarChart3 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              No quiz attempts recorded for &ldquo;{userName}&rdquo;
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              Complete your daily cybersecurity quiz to unlock accuracy scores, topic breakdown, and history.
            </p>
            <a href="/" className="btn btn-primary btn-sm gap-2 mt-1">
              Take the Quiz <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      {!isLoading && !isError && stats && stats.totalAttempts > 0 && (
        <div className="space-y-5">

          {/* ── Summary bar (single row, no cards) ── */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Target className="w-3.5 h-3.5 text-slate-400" />
              <span>Accuracy</span>
              <strong className="text-slate-900 dark:text-white ml-1">{kpi?.accuracy ?? 0}%</strong>
              <span className="text-slate-300 dark:text-slate-600 mx-1">·</span>
              <span className="text-[11px]">{kpi?.accSub}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Avg speed</span>
              <strong className="text-slate-900 dark:text-white ml-1">{((kpi?.avgSpeed ?? 0) / 1000).toFixed(2)}s</strong>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Points</span>
              <strong className="text-slate-900 dark:text-white ml-1">{(kpi?.points ?? 0).toFixed(2)}</strong>
              <span className="text-[11px] ml-1">{kpi?.pointsSub}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Completion</span>
              <strong className="text-slate-900 dark:text-white ml-1">{kpi?.completion ?? 0}%</strong>
              <span className="text-[11px] ml-1">{kpi?.compSub}</span>
            </div>
          </div>

          {/* Overall progress bar — thin, no card */}
          {selectedTopic === 'ALL' && (
            <div className="space-y-1.5 px-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Overall question bank</span>
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {stats.totalAttempts} / {stats.totalBankQuestionsAll ?? stats.totalAttempts}
                </span>
              </div>
              <div className="progress-bar" style={{ height: '4px' }}>
                <div className="progress-fill" style={{ width: `${Math.max(2, stats.overallCompletionProgress ?? 0)}%` }} />
              </div>
            </div>
          )}

          {/* Topic detail bar — shown when a topic is selected */}
          {activeTopic && (
            <div className="space-y-1.5 px-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-medium text-slate-600 dark:text-slate-300">{activeTopic.category}</span>
                <div className="flex items-center gap-2">
                  <span className={`badge ${MASTERY_CONFIG[activeTopic.masteryLevel]?.cls ?? 'badge-slate'}`}>
                    {activeTopic.masteryLevel}
                  </span>
                  <span>{activeTopic.attemptsCount}/{activeTopic.totalBankQuestions} · {activeTopic.correctCount} correct</span>
                </div>
              </div>
              <div className="progress-bar" style={{ height: '4px' }}>
                <div className="progress-fill-blue" style={{ width: `${Math.max(2, activeTopic.completionProgress)}%` }} />
              </div>
            </div>
          )}

          {/* ── Topic mastery table ── */}
          {selectedTopic === 'ALL' && filteredTopics.length > 0 && (
            <div className="card overflow-hidden">
              {/* Table header */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                  Topic Breakdown
                  <span className="text-slate-400 font-normal">({filteredTopics.length})</span>
                </h2>
                <div className="search-wrap w-48">
                  <Search className="search-icon" />
                  <input
                    type="text"
                    value={topicSearch}
                    onChange={e => setTopicSearch(e.target.value)}
                    placeholder="Filter topics..."
                    className="search-input"
                  />
                  {topicSearch && (
                    <button onClick={() => setTopicSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 btn-icon w-5 h-5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="table-wrapper overflow-y-auto" style={{ maxHeight: '315px' }}>
                <table className="table-base">
                  <thead className="table-head">
                    <tr>
                      <th className="table-th">Topic</th>
                      <th className="table-th hidden sm:table-cell">Progress</th>
                      <th className="table-th text-center">Accuracy</th>
                      <th className="table-th hidden md:table-cell">Mastery</th>
                      <th className="table-th text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTopics.map(stat => (
                      <TopicRow
                        key={stat.category}
                        stat={stat}
                        isActive={selectedTopic === stat.category}
                        onClick={() => setSelectedTopic(
                          selectedTopic === stat.category ? 'ALL' : stat.category
                        )}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                Click a row to filter history by topic
              </div>
            </div>
          )}

          {/* ── Filter bar for history ── */}
          <div className="card overflow-hidden">
            {/* Header row */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setHistoryExpanded(v => !v)}
                className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"
              >
                <Calendar className="w-4 h-4 text-slate-400" />
                {selectedTopic === 'ALL' ? 'Quiz History' : `History · ${selectedTopic}`}
                <span className="badge badge-slate">{filteredHistory.length}</span>
                {historyExpanded
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />
                }
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Active topic chip */}
                {selectedTopic !== 'ALL' && (
                  <span className="filter-chip filter-chip-active flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" />
                    {selectedTopic}
                    <button
                      onClick={() => setSelectedTopic('ALL')}
                      className="ml-0.5 opacity-70 hover:opacity-100"
                      aria-label="Clear topic filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Filter panel toggle */}
                <button
                  onClick={() => setShowFilterPanel(v => !v)}
                  className={`btn btn-secondary btn-xs gap-1.5 ${activeFilterCount > 0 ? 'border-[#0f172a] dark:border-white' : ''}`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#0f172a] dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Clear all */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setSelectedTopic('ALL'); setDateFilter('all'); setResultFilter('all'); }}
                    className="btn btn-ghost btn-xs gap-1"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Filter panel */}
            {showFilterPanel && (
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-wrap gap-4">
                {/* Topic select */}
                <div className="flex flex-col gap-1 min-w-[160px]">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Topic</label>
                  <select
                    value={selectedTopic}
                    onChange={e => setSelectedTopic(e.target.value)}
                    className="field-input py-1.5 text-xs"
                  >
                    <option value="ALL">All Topics</option>
                    {ALL_TOPICS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Date range */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date Range</label>
                  <div className="flex items-center gap-1">
                    {(['all', '7d', '30d', '90d'] as DateFilter[]).map(d => (
                      <button
                        key={d}
                        onClick={() => setDateFilter(d)}
                        className={`filter-chip ${dateFilter === d ? 'filter-chip-active' : ''}`}
                      >
                        {d === 'all' ? 'All time' : `Last ${d}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Result filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Result</label>
                  <div className="flex items-center gap-1">
                    {(['all', 'correct', 'incorrect'] as ResultFilter[]).map(r => (
                      <button
                        key={r}
                        onClick={() => setResultFilter(r)}
                        className={`filter-chip capitalize ${resultFilter === r ? 'filter-chip-active' : ''}`}
                      >
                        {r === 'all' ? 'All' : r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Timeline ── */}
            {historyExpanded && (
              <>
                {filteredHistory.length === 0 ? (
                  <div className="empty-state py-10">
                    <div className="empty-state-icon">
                      <Filter className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">No matching attempts</p>
                    <p className="text-xs text-slate-500">Try adjusting the filters above.</p>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5">
                    <div className="space-y-0">
                      {filteredHistory.map((h, i) => (
                        <TimelineEvent
                          key={`${h.quizDate}-${i}`}
                          entry={h}
                          isLast={i === filteredHistory.length - 1}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* History footer */}
                {filteredHistory.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      <strong className="text-slate-700 dark:text-slate-300">{filteredHistory.length}</strong> attempts shown
                    </span>
                    <span>
                      {filteredHistory.filter(h => h.isCorrect).length} correct ·{' '}
                      {filteredHistory.filter(h => !h.isCorrect).length} incorrect
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
