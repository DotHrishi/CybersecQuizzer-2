'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  User, Mail, ShieldCheck, CheckCircle2, AlertCircle,
  Edit3, ArrowRight, Building2, UserCheck, RefreshCw,
  Info, Lock, ExternalLink, Save, X, Award, Sparkles, Check, Download, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { UserProfileFormValues, UserBadgeInfo } from '@/types/profile';
import TopicMasteryModal from '@/components/TopicMasteryModal';

/* ─── Skeleton ───────────────────────────────────────────── */
function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="skeleton h-24 rounded-xl" />
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );
}

/* ─── Read-only field row ────────────────────────────────── */
function ProfileField({
  label, value, icon: Icon, note,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  note?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
      <div className="w-7 h-7 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
        <p className="text-xs font-semibold text-slate-900 dark:text-white break-all">{value || '—'}</p>
        {note && <p className="text-[11px] text-slate-400 mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function ProfileForm() {
  const [fullName, setFullName]           = useState('');
  const [nickname, setNickname]           = useState('');
  const [isNicknameSame, setIsNicknameSame] = useState(false);
  const [email, setEmail]                 = useState('');
  const [emailType, setEmailType]         = useState<'college' | 'personal'>('college');

  const [loading, setLoading]             = useState(false);
  const [fetching, setFetching]           = useState(true);
  const [savedProfile, setSavedProfile]   = useState<UserProfileFormValues | null>(null);
  const [isEditing, setIsEditing]         = useState(false);
  const [badges, setBadges]               = useState<UserBadgeInfo[]>([]);
  const [userStats, setUserStats]         = useState<{ totalSolved: number; correctCount: number } | null>(null);
  const [activeMasteredTopicModal, setActiveMasteredTopicModal] = useState<UserBadgeInfo | null>(null);

  /* Inline field errors */
  const [errors, setErrors]               = useState<Partial<Record<'fullName' | 'nickname' | 'email', string>>>({});

  /* ── Load on mount ── */
  useEffect(() => {
    const saved = localStorage.getItem('cyber_quiz_username');
    if (saved) { setNickname(saved); fetchExistingProfile(saved); }
    else { setFetching(false); setIsEditing(true); }
  }, []);

  const fetchExistingProfile = async (nick: string) => {
    setFetching(true);
    try {
      const res  = await fetch(`/api/profile?nickname=${encodeURIComponent(nick)}`);
      const data = await res.json();
      if (data.success) {
        if (data.badges) {
          setBadges(data.badges);
          // Check for newly unlocked topic specialist badges that haven't been popped up yet
          try {
            const seenList: string[] = JSON.parse(localStorage.getItem('cyber_seen_mastered_topics') || '[]');
            const newlyUnlockedTopic = (data.badges as UserBadgeInfo[]).find(
              b => b.badgeType === 'topic' && b.isUnlocked && !seenList.includes(b.title)
            );
            if (newlyUnlockedTopic) {
              setActiveMasteredTopicModal(newlyUnlockedTopic);
            }
          } catch {
            /* silent */
          }
        }
        if (data.stats) setUserStats(data.stats);

        if (data.profile) {
          const p = data.profile;
          setFullName(p.fullName || '');
          setNickname(p.nickname || '');
          setIsNicknameSame(Boolean(p.isNicknameSame));
          setEmail(p.email || '');
          setEmailType(p.emailType === 'personal' ? 'personal' : 'college');
          setSavedProfile({
            fullName: p.fullName, nickname: p.nickname,
            isNicknameSame: Boolean(p.isNicknameSame),
            email: p.email, emailType: p.emailType || 'college',
          });
          setIsEditing(false);
        } else {
          setIsEditing(true);
        }
      } else {
        setIsEditing(true);
      }
    } catch {
      setIsEditing(true);
    } finally {
      setFetching(false);
    }
  };


  /* ── Validation ── */
  const validate = (): boolean => {
    const errs: typeof errors = {};
    const name = fullName.trim();
    const nick = isNicknameSame ? name : nickname.trim();
    const mail = email.trim().toLowerCase();

    if (!name || name.length < 2)                         errs.fullName = 'Full name must be at least 2 characters.';
    if (!nick || nick.length < 2)                         errs.nickname = 'Nickname must be at least 2 characters.';
    if (!mail || !mail.includes('@') || !mail.includes('.')) errs.email = 'Enter a valid email address.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── Helpers ── */
  const handleFullNameChange = (v: string) => {
    setFullName(v);
    if (isNicknameSame) setNickname(v);
    if (errors.fullName) setErrors(e => ({ ...e, fullName: undefined }));
  };

  const handleNicknameSameToggle = (checked: boolean) => {
    setIsNicknameSame(checked);
    if (checked) setNickname(fullName);
  };

  const handleEmailTypeToggle = (usePersonal: boolean) => {
    setEmailType(usePersonal ? 'personal' : 'college');
  };

  const handleCancel = () => {
    if (savedProfile) {
      setFullName(savedProfile.fullName);
      setNickname(savedProfile.nickname);
      setIsNicknameSame(savedProfile.isNicknameSame);
      setEmail(savedProfile.email);
      setEmailType(savedProfile.emailType as 'college' | 'personal');
      setErrors({});
    }
    setIsEditing(false);
  };

  /* ── Download Badge Helper ── */
  const handleDownloadBadge = async (imageUrl: string, title: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const cleanFilename = `cyber-safety-badge-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}.png`;
      link.download = cleanFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success(`Badge "${title}" downloaded!`);
    } catch {
      toast.error('Failed to download badge image.');
    }
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const cleanFullName = fullName.trim();
    const cleanNickname = (isNicknameSame ? cleanFullName : nickname).trim();
    const cleanEmail    = email.trim().toLowerCase();

    setLoading(true);
    try {
      const payload: UserProfileFormValues = {
        fullName: cleanFullName, nickname: cleanNickname,
        isNicknameSame, email: cleanEmail, emailType,
      };

      const res  = await fetch('/api/profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to save profile.');
        return;
      }

      localStorage.setItem('cyber_quiz_username', cleanNickname);
      setSavedProfile(payload);
      setIsEditing(false);
      toast.success('Profile saved successfully!');
      fetchExistingProfile(cleanNickname);
    } catch {
      toast.error('Network error saving profile.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Topic Mastery Modal Handler ── */
  const handleCloseMasteryModal = () => {
    if (activeMasteredTopicModal) {
      try {
        const seenList: string[] = JSON.parse(localStorage.getItem('cyber_seen_mastered_topics') || '[]');
        if (!seenList.includes(activeMasteredTopicModal.title)) {
          seenList.push(activeMasteredTopicModal.title);
          localStorage.setItem('cyber_seen_mastered_topics', JSON.stringify(seenList));
        }
      } catch {
        /* silent */
      }
      setActiveMasteredTopicModal(null);
    }
  };

  /* ── Loading ── */
  if (fetching) return <ProfileSkeleton />;


  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ── Page header ── */}
      <div className="page-header mb-0">
        <div className="breadcrumb">
          <span>Home</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Profile</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="page-title text-2xl">Participant Profile</h1>
            <p className="page-subtitle">Manage your identity, nickname, and verified credentials.</p>
          </div>
        </div>
      </div>

      {/* ── Badges & Milestones Section ── */}
      {badges.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Achievements & Badges</h2>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
              <span>
                Questions Solved: <strong className="text-slate-900 dark:text-white">{userStats?.totalSolved || 0}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>
                Topics Mastered: <strong className="text-amber-600 dark:text-amber-400">{badges.filter(b => b.badgeType === 'topic' && b.isUnlocked).length} / 20</strong>
              </span>
            </div>
          </div>

          {/* 1. Milestone Badges */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Overall Milestones
            </h3>
            <div className="space-y-3">
              {badges.filter(b => b.badgeType !== 'topic').map((badge) => {
                const progressPct = Math.min(100, Math.round((badge.currentCount / badge.requiredQuestions) * 100));
                return (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center gap-4 transition-all ${
                      badge.isUnlocked
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 shadow-2xs'
                        : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 opacity-90'
                    }`}
                  >
                    {/* Badge Image */}
                    <div className="relative shrink-0 flex items-center justify-center">
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center p-1.5 transition-all ${
                        badge.isUnlocked
                          ? 'bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-950/80 dark:to-slate-900 border border-amber-300 dark:border-amber-700 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grayscale-[70%]'
                      }`}>
                        <Image
                          src={badge.image}
                          alt={badge.title}
                          width={96}
                          height={96}
                          className="w-full h-full object-contain drop-shadow-md"
                          priority
                        />
                      </div>
                    </div>

                    {/* Badge Details */}
                    <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                            {badge.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            badge.isUnlocked
                              ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {badge.subtitle}
                          </span>
                        </div>

                        {/* Download Badge Button when Unlocked */}
                        {badge.isUnlocked && (
                          <button
                            type="button"
                            onClick={() => handleDownloadBadge(badge.image, badge.title)}
                            title={`Download ${badge.title} Badge`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                          >
                            <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Download Badge</span>
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {badge.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="pt-1.5 space-y-1">
                        {(() => {
                          const unit = badge.id.includes('streak') ? 'days' : 'questions';
                          return (
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              <span>
                                {badge.isUnlocked
                                  ? `Milestone Completed (${badge.requiredQuestions}/${badge.requiredQuestions} ${unit})`
                                  : `Progress: ${badge.currentCount} / ${badge.requiredQuestions} ${unit}`}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">{progressPct}%</span>
                            </div>
                          );
                        })()}
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              badge.isUnlocked ? 'bg-amber-500' : 'bg-slate-900 dark:bg-white'
                            }`}
                            style={{ width: `${Math.max(4, progressPct)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Topic Specialist Badges (20 Topics) */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-blue-500" /> Topic Specialist Badges
              </h3>
              <span className="text-[11px] text-slate-500">Collectable once per topic completed (20 total)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {badges.filter(b => b.badgeType === 'topic').map((badge) => {
                const progressPct = Math.min(100, Math.round((badge.currentCount / badge.requiredQuestions) * 100));
                return (
                  <div
                    key={badge.id}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                      badge.isUnlocked
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 shadow-2xs'
                        : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/60 opacity-85'
                    }`}
                  >
                    {/* Badge Image */}
                    <div className="relative shrink-0 flex items-center justify-center">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center p-1 transition-all ${
                        badge.isUnlocked
                          ? 'bg-gradient-to-b from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-slate-900 border border-blue-300 dark:border-blue-700 shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 grayscale-[75%]'
                      }`}>
                        <Image
                          src={badge.image}
                          alt={badge.title}
                          width={56}
                          height={56}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>


                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={badge.title}>
                          {badge.title}
                        </p>
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            badge.isUnlocked
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {badge.isUnlocked ? 'Completed' : `${badge.currentCount}/${badge.requiredQuestions}`}
                          </span>
                          {badge.isUnlocked && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setActiveMasteredTopicModal(badge)}
                                title={`View ${badge.title} Skills Learned`}
                                className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[9px] font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/80 transition-colors shadow-2xs cursor-pointer shrink-0"
                              >
                                Skills
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadBadge(badge.image, `topic-specialist-${badge.title}`)}
                                title={`Download ${badge.title} Badge`}
                                className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 text-blue-600 dark:text-blue-400 transition-colors shadow-2xs cursor-pointer shrink-0"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {badge.isUnlocked ? 'Topic Mastered' : `${badge.requiredQuestions - badge.currentCount} questions remaining`}
                      </p>

                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            badge.isUnlocked ? 'bg-blue-600' : 'bg-slate-700 dark:bg-slate-300'
                          }`}
                          style={{ width: `${Math.max(4, progressPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


      {/* ── Saved profile card (read mode) ── */}
      {savedProfile && !isEditing && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
          {/* Profile header row */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#0f172a] dark:bg-white flex items-center justify-center text-white dark:text-slate-900 text-sm font-extrabold shrink-0">
                {savedProfile.nickname.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{savedProfile.fullName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nickname: <span className="font-semibold text-slate-700 dark:text-slate-300">{savedProfile.nickname}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ProfileField label="Full Name"   value={savedProfile.fullName}  icon={User} />
            <ProfileField
              label="Display Nickname"
              value={savedProfile.nickname}
              icon={UserCheck}
              note={savedProfile.isNicknameSame ? 'Same as full name' : undefined}
            />
            <ProfileField
              label="Email Address"
              value={savedProfile.email}
              icon={Mail}
            />
            <ProfileField
              label="Email Type"
              value={savedProfile.emailType === 'college' ? 'College / Institutional' : 'Personal'}
              icon={Building2}
            />
          </div>

          {/* Synced notice */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-900 dark:text-emerald-200 font-medium leading-relaxed">
              <strong className="font-bold">Profile synced.</strong>{' '}
              Your quiz scores, leaderboard rank, and progress are tracked under{' '}
              <strong>{savedProfile.nickname}</strong>.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2 pt-1">
            <a href="/report"      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold"><ExternalLink className="w-3 h-3" />My Report</a>
            <a href="/leaderboard" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold"><ExternalLink className="w-3 h-3" />Leaderboard</a>
          </div>
        </div>
      )}

      {/* ── Edit form (sheet-style card) ── */}
      {isEditing && (
        <form onSubmit={handleSubmit} noValidate>
          <div className="card overflow-hidden">

            {/* Form header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {savedProfile ? 'Edit Profile' : 'Create Profile'}
                </h2>
              </div>
              {savedProfile && (
                <button type="button" onClick={handleCancel} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-6 space-y-6">

              {/* ── Section 1: Identity ── */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Identity
                </h3>

                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="field-label">
                    Full Name <span className="text-rose-500" aria-hidden="true">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={e => handleFullNameChange(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      maxLength={60}
                      aria-invalid={!!errors.fullName}
                      aria-describedby={errors.fullName ? 'fullName-err' : undefined}
                      className={`field-input pl-9 ${errors.fullName ? 'field-input-error' : ''}`}
                    />
                  </div>
                  {errors.fullName && (
                    <p id="fullName-err" role="alert" className="field-error">{errors.fullName}</p>
                  )}
                </div>

                {/* Nickname same toggle */}
                <label className="flex items-center gap-3 p-3 rounded-lg card-sunken cursor-pointer select-none group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isNicknameSame}
                      onChange={e => handleNicknameSameToggle(e.target.checked)}
                      className="sr-only peer"
                      id="same-toggle"
                    />
                    <div className={`toggle ${isNicknameSame ? 'bg-[#0f172a] dark:bg-white' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <span className={`toggle-thumb ${isNicknameSame ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Nickname same as Full Name
                    </p>
                    <p className="text-[11px] text-slate-400">Your display name on the leaderboard will match your full name</p>
                  </div>
                </label>

                {/* Nickname */}
                {!isNicknameSame && (
                  <div>
                    <label htmlFor="nickname" className="field-label">
                      Display Nickname <span className="text-rose-500" aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
                      <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="nickname"
                        type="text"
                        value={nickname}
                        onChange={e => { setNickname(e.target.value); if (errors.nickname) setErrors(er => ({ ...er, nickname: undefined })); }}
                        placeholder="e.g. CyberKing, Alex"
                        maxLength={30}
                        aria-invalid={!!errors.nickname}
                        aria-describedby={errors.nickname ? 'nickname-err' : 'nickname-hint'}
                        className={`field-input pl-9 ${errors.nickname ? 'field-input-error' : ''}`}
                      />
                    </div>
                    {errors.nickname
                      ? <p id="nickname-err" role="alert" className="field-error">{errors.nickname}</p>
                      : <p id="nickname-hint" className="field-helper">Used on leaderboard &amp; quiz results. Max 30 chars.</p>
                    }
                  </div>
                )}
              </div>

              <div className="section-divider" />

              {/* ── Section 2: Contact ── */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> Contact
                </h3>

                {/* Email type toggle */}
                <div className="flex items-center justify-between">
                  <label htmlFor="email" className="field-label mb-0">
                    {emailType === 'college' ? 'College Email' : 'Personal Email'}
                    <span className="text-rose-500 ml-0.5" aria-hidden="true">*</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="personal-toggle"
                      checked={emailType === 'personal'}
                      onChange={e => handleEmailTypeToggle(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
                      No college email?
                    </span>
                  </label>
                </div>

                <div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); if (errors.email) setErrors(er => ({ ...er, email: undefined })); }}
                      placeholder={emailType === 'college' ? 'student@college.edu.in' : 'student@gmail.com'}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-err' : 'email-hint'}
                      className={`field-input pl-9 ${errors.email ? 'field-input-error' : ''}`}
                    />
                  </div>
                  {errors.email
                    ? <p id="email-err" role="alert" className="field-error">{errors.email}</p>
                    : (
                      <p id="email-hint" className="field-helper flex items-center gap-1">
                        <Info className="w-3 h-3 shrink-0" />
                        {emailType === 'college'
                          ? 'Enter your official institutional email ID.'
                          : 'Using personal email for registration and certificate verification.'
                        }
                      </p>
                    )
                  }
                </div>
              </div>

              <div className="section-divider" />

              {/* ── Section 3: Privacy note ── */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg card-sunken text-[11px] text-slate-500 dark:text-slate-400">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                <p>Your email is used only for certificate delivery and programme communications. It will not be displayed publicly.</p>
              </div>

            </div>

            {/* ── Form actions ── */}
            <div className="flex items-center gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              {savedProfile && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-secondary btn-sm gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-sm gap-1.5 flex-1 justify-center"
              >
                {loading ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-3.5 h-3.5" /> {savedProfile ? 'Save Changes' : 'Create Profile'} <ArrowRight className="w-3.5 h-3.5 opacity-60" /></>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── Topic Mastery & Skills Learned Popup Modal ── */}
      {activeMasteredTopicModal && (
        <TopicMasteryModal
          topicTitle={activeMasteredTopicModal.title}
          badgeImage={activeMasteredTopicModal.image}
          onClose={handleCloseMasteryModal}
          onDownload={() => handleDownloadBadge(activeMasteredTopicModal.image, `topic-specialist-${activeMasteredTopicModal.title}`)}
        />
      )}

    </div>
  );
}

