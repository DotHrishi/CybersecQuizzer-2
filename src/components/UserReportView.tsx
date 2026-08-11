'use client';

import React, { useState, useEffect } from 'react';
import { UserReportStats, CategoryStat } from '@/types/quiz';
import {
  BarChart3,
  Target,
  Clock,
  Trophy,
  CheckCircle2,
  XCircle,
  User,
  AlertCircle,
  Award,
  Layers,
  Sparkles,
  Zap,
  BookOpen,
} from 'lucide-react';

import toast from 'react-hot-toast';

const ALL_TOPICS = [
  'General Security',
  'Disaster Recovery',
  'Malware',
  'Security Operations',
  'Cloud Security',
  'Threat Intelligence',
  'Security Tools',
  'Incident Response',
  'Social Engineering',
  'IAM & Governance',
  'Network Security',
  'Secure Coding',
  'Data Security',
  'Compliance & Standards',
  'Cryptography',
  'Identity & Access Management',
  'Security Architecture',
  'Network Attacks',
  'Physical Security',
  'Web Security',
];

export default function UserReportView() {
  const [userName, setUserName] = useState<string>('');
  const [stats, setStats] = useState<UserReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');

  useEffect(() => {
    const savedName = localStorage.getItem('cyber_quiz_username');
    if (savedName) {
      setUserName(savedName);
      fetchReport(savedName);
    }
  }, []);

  const fetchReport = async (nameToFetch: string) => {
    if (!nameToFetch.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/report?userName=${encodeURIComponent(nameToFetch.trim())}`);
      const data = await res.json();

      if (res.status === 429) {
        toast.error(data.message || 'Too many requests sent! Please wait a moment before trying again.');
        setIsLoading(false);
        return;
      }

      if (data.success) {
        setStats(data.stats);
      } else {
        toast.error(data.message || 'Failed to load report.');
      }
    } catch (err: any) {
      toast.error('Network error loading report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      fetchReport(userName.trim());
    }
  };

  // Find category stat for selected topic
  const activeTopicStat: CategoryStat | null =
    selectedTopic !== 'ALL' && stats?.topicStats
      ? stats.topicStats.find((t) => t.category === selectedTopic) || null
      : null;

  // Filter history items by selected topic if topic selected
  const filteredHistory =
    stats?.history
      ? selectedTopic === 'ALL'
        ? stats.history
        : stats.history.filter((h) => h.category === selectedTopic)
      : [];

  return (
    <div className="max-w-5xl mx-auto my-6 space-y-8">
      {/* Header Panel */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
        {/* Header Top Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900/10 dark:bg-white/10 border border-slate-300 dark:border-white/20 p-0.5 shadow-md flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6 text-slate-900 dark:text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Performance & Topic Analytics
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Select a topic from the dropdown to view topic-specific accuracy, progress & speed
              </p>
            </div>
          </div>

          {/* User Lookup Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 w-full md:w-auto">
            <div className="relative flex-grow sm:flex-grow-0 sm:w-56">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Lookup user name..."
                className="w-full pl-9 pr-3 py-2 bg-cyber-900/90 border border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-white font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-bold shadow-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shrink-0"
            >
              Fetch
            </button>
          </form>
        </div>

        {/* TOPIC SELECTOR DROPDOWN BAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-cyber-900/60 border border-slate-800">
          <div className="flex items-center space-x-2.5">
            <BookOpen className="w-4 h-4 text-slate-900 dark:text-white shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Filter by Quiz Topic:
            </span>
          </div>

          <div className="relative w-full sm:w-80">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full appearance-none pl-4 pr-10 py-2.5 bg-cyber-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white cursor-pointer transition-all shadow-inner"
            >
              <option value="ALL">All Topics (Overall Performance)</option>
              {ALL_TOPICS.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>

            <div className="absolute right-3 top-3 pointer-events-none text-slate-400 text-xs font-bold">
              ▼
            </div>
          </div>
        </div>
      </div>


      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 space-y-2">
          <Sparkles className="w-8 h-8 mx-auto animate-spin text-slate-900 dark:text-white" />
          <p className="text-sm font-semibold">Calculating topic-wise accuracy & progress...</p>
        </div>
      ) : !stats || stats.totalAttempts === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No quiz attempts recorded for &quot;{userName || 'this user'}&quot;.
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Complete your daily cybersecurity quiz attempt to unlock your topic accuracy score, progress bar, and category stats!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* TOPIC DEEP-DIVE ANALYTICS CARD */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900/10 dark:bg-white/10 border border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-900 dark:text-white font-bold">
                  {selectedTopic === 'ALL' ? 'ALL' : selectedTopic.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedTopic === 'ALL' ? 'Overall Performance Across All Topics' : `${selectedTopic} Report`}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedTopic === 'ALL'
                      ? 'Combined summary across all 20 cybersecurity topics'
                      : `Detailed accuracy score, attempt progress, and speed for ${selectedTopic}`}
                  </p>
                </div>
              </div>

              {/* Mastery Level Tag */}
              {activeTopicStat && (
                <span
                  className={`px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                    activeTopicStat.masteryLevel === 'Mastered'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40'
                      : activeTopicStat.masteryLevel === 'Proficient'
                      ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-500/40'
                      : activeTopicStat.masteryLevel === 'Developing'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                      : 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/40'
                  }`}
                >
                  {activeTopicStat.masteryLevel}
                </span>
              )}
            </div>

            {/* Stat Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Card 1: Accuracy Score */}
              <div className="p-4 rounded-2xl bg-cyber-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Target className="w-4 h-4 text-slate-900 dark:text-white" />
                  <span>Topic Accuracy Score</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {activeTopicStat ? `${activeTopicStat.accuracyPercentage}%` : `${stats.accuracyPercentage}%`}
                </p>
                <p className="text-[11px] text-slate-500">
                  {activeTopicStat
                    ? `${activeTopicStat.correctCount} correct / ${activeTopicStat.attemptsCount} attempted`
                    : `${stats.correctAnswers} / ${stats.totalAttempts} total correct`}
                </p>
              </div>

              {/* Card 2: Question Progress */}
              <div className="p-4 rounded-2xl bg-cyber-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Layers className="w-4 h-4 text-slate-900 dark:text-white" />
                  <span>Question Progress</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {activeTopicStat
                    ? `${activeTopicStat.completionProgress}%`
                    : `${stats.overallCompletionProgress || 0}%`}
                </p>
                <p className="text-[11px] text-slate-500">
                  {activeTopicStat
                    ? `${activeTopicStat.attemptsCount} / ${activeTopicStat.totalBankQuestions} topic questions`
                    : `${stats.totalAttempts} / ${stats.totalBankQuestionsAll || stats.totalAttempts} total bank questions`}
                </p>
              </div>

              {/* Card 3: Speed / Avg Response */}
              <div className="p-4 rounded-2xl bg-cyber-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Clock className="w-4 h-4 text-slate-900 dark:text-white" />
                  <span>Avg Response Time</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {activeTopicStat
                    ? `${(activeTopicStat.avgResponseTimeMs / 1000).toFixed(2)}s`
                    : `${(stats.avgResponseTimeMs / 1000).toFixed(2)}s`}
                </p>
                <p className="text-[11px] text-slate-500">Speed multiplier enabled</p>
              </div>

              {/* Card 4: Total Points / Rank */}
              <div className="p-4 rounded-2xl bg-cyber-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>{activeTopicStat ? 'Topic Points' : 'Total Points'}</span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  {activeTopicStat
                    ? Number(activeTopicStat.totalPoints).toFixed(2)
                    : Number(stats.totalPoints).toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {activeTopicStat ? 'Earned in topic' : `Rank #${stats.bestRank}`}
                </p>
              </div>
            </div>

            {/* Visual Progress Bar (Works for active topic OR overall performance) */}
            {(() => {
              const progressVal = activeTopicStat
                ? activeTopicStat.completionProgress
                : stats.overallCompletionProgress || 0;
              const fillWidth = progressVal === 0 ? 0 : Math.max(3, progressVal);

              return (
                <div className="p-4 rounded-2xl bg-cyber-900/40 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">
                      {activeTopicStat
                        ? `Topic Question Completion (${activeTopicStat.attemptsCount} / ${activeTopicStat.totalBankQuestions} questions answered)`
                        : `Overall Question Bank Completion (${stats.totalAttempts} / ${stats.totalBankQuestionsAll || stats.totalAttempts} questions answered)`}
                    </span>
                    <span className="text-slate-900 dark:text-white font-bold">{progressVal}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-slate-900 dark:bg-white rounded-full transition-all duration-500"
                      style={{ width: `${fillWidth}%` }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>




          {/* 3. ATTEMPT HISTORY TIMELINE */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 text-slate-900 dark:text-white" />
                <span>
                  {selectedTopic === 'ALL'
                    ? 'Recent Quiz Attempt History'
                    : `Attempt History for ${selectedTopic}`}
                </span>
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                {filteredHistory.length} attempts found
              </span>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-semibold">
                No attempts recorded yet under category &quot;{selectedTopic}&quot;.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredHistory.map((h, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-cyber-900/50 border border-slate-800 flex items-center justify-between text-xs sm:text-sm hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center space-x-3.5">
                      {h.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-extrabold text-slate-900 dark:text-white">{h.quizDate}</p>
                          {h.category && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 text-[10px] font-bold">
                              {h.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {h.isCorrect
                            ? `Base 2.00 + ${Number(h.bonusPoints).toFixed(2)} Speed Bonus`
                            : 'Score: 0.00'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 dark:text-white block text-sm sm:text-base">
                        {Number(h.totalPoints).toFixed(2)} pts
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {(h.responseTimeMs / 1000).toFixed(2)}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
