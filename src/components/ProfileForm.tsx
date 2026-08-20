'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  User, Mail, ShieldCheck, CheckCircle2, AlertCircle,
  Edit3, ArrowRight, Building2, UserCheck, RefreshCw,
  Info, Lock, ExternalLink, Save, X, Award, Sparkles, Check, Download, BookOpen,
  Search, Copy, Eye, EyeOff, KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import { UserProfileFormValues, UserBadgeInfo, UserProfileDTO } from '@/types/profile';
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
  label, value, icon: Icon, note, onCopy, isCopied,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  note?: string;
  onCopy?: () => void;
  isCopied?: boolean;
}) {
  return (
    <div className="group relative flex items-start gap-3.5 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-400 shrink-0 mt-0.5 shadow-2xs">
        <Icon className="w-4.5 h-4.5 text-slate-500 dark:text-slate-400" />
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white break-all">{value || '—'}</p>
        {note && <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{note}</p>}
      </div>
      {onCopy && value && (
        <button
          type="button"
          onClick={onCopy}
          title={`Copy ${label}`}
          className="absolute right-3 top-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function ProfileForm() {
  const [fullName, setFullName]                 = useState('');
  const [nickname, setNickname]                 = useState('');
  const [isNicknameSame, setIsNicknameSame]     = useState(false);
  const [email, setEmail]                       = useState('');
  const [emailType, setEmailType]               = useState<'college' | 'personal'>('college');
  const [registrationKey, setRegistrationKey]   = useState('');
  const [password, setPassword]                 = useState('');
  const [showPassword, setShowPassword]         = useState(false);

  const [loading, setLoading]                   = useState(false);
  const [fetching, setFetching]                 = useState(true);
  const [savedProfile, setSavedProfile]         = useState<UserProfileDTO | null>(null);
  const [gracePeriodInfo, setGracePeriodInfo]   = useState<{
    isBeyondGracePeriod: boolean;
    daysRemaining: number;
    hoursRemaining: number;
    requiresRegistrationKeySetup: boolean;
    requiresCollegeUpdate?: boolean;
    requiresPassword: boolean;
  } | null>(null);

  const [isEditing, setIsEditing]               = useState(false);
  const [badges, setBadges]                     = useState<UserBadgeInfo[]>([]);
  const [userStats, setUserStats]               = useState<{ totalSolved: number; correctCount: number } | null>(null);
  const [activeMasteredTopicModal, setActiveMasteredTopicModal] = useState<UserBadgeInfo | null>(null);

  /* Registration key preview verification state */
  const [verifiedKeyData, setVerifiedKeyData]   = useState<{
    valid: boolean;
    college: { id: number; name: string };
    department: { id: number; name: string };
  } | null>(null);
  const [isVerifyingKey, setIsVerifyingKey]     = useState(false);

  /* User-friendly UX filters and tabs */
  const [topicSearch, setTopicSearch]           = useState('');
  const [topicFilter, setTopicFilter]           = useState<'all' | 'unlocked' | 'in_progress'>('all');
  const [copiedField, setCopiedField]           = useState<string | null>(null);
  const [activeTab, setActiveTab]               = useState<'all' | 'profile' | 'badges'>('all');

  /* Inline field errors */
  const [errors, setErrors]                     = useState<Partial<Record<'fullName' | 'nickname' | 'email' | 'registrationKey' | 'password', string>>>({});

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
        if (data.gracePeriod) setGracePeriodInfo(data.gracePeriod);

        if (data.profile) {
          const p = data.profile;
          setFullName(p.fullName || '');
          setNickname(p.nickname || '');
          setIsNicknameSame(Boolean(p.isNicknameSame));
          setEmail(p.email || '');
          setEmailType(p.emailType === 'personal' ? 'personal' : 'college');
          setSavedProfile(p);

          // If student is beyond grace period and needs updates, open edit mode automatically
          if (data.gracePeriod?.requiresRegistrationKeySetup || data.gracePeriod?.requiresCollegeUpdate || data.gracePeriod?.requiresPassword) {
            setIsEditing(true);
          } else {
            setIsEditing(false);
          }
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

  /* ── Verify Registration Key ── */
  const handleVerifyKey = async (keyToVerify?: string) => {
    const k = (keyToVerify !== undefined ? keyToVerify : registrationKey).trim();
    if (!k) {
      setErrors(prev => ({ ...prev, registrationKey: 'Please enter a registration key to verify.' }));
      return;
    }
    setIsVerifyingKey(true);
    try {
      const res = await fetch('/api/registration-key/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationKey: k }),
      });
      const data = await res.json();
      if (data.valid) {
        setVerifiedKeyData(data);
        setErrors(prev => ({ ...prev, registrationKey: undefined }));
        toast.success(`Verified: ${data.college.name} - ${data.department.name}`);
      } else {
        setVerifiedKeyData(null);
        setErrors(prev => ({ ...prev, registrationKey: data.message || 'Invalid registration key.' }));
        toast.error(data.message || 'Invalid registration key.');
      }
    } catch {
      toast.error('Failed to verify registration key.');
    } finally {
      setIsVerifyingKey(false);
    }
  };

  /* ── Validation ── */
  const validate = (): boolean => {
    const errs: typeof errors = {};
    const name = fullName.trim();
    const nick = isNicknameSame ? name : nickname.trim();
    const mail = email.trim().toLowerCase();
    const regKey = registrationKey.trim();

    if (!name || name.length < 2)                         errs.fullName = 'Full name must be at least 2 characters.';
    if (!nick || nick.length < 2)                         errs.nickname = 'Nickname must be at least 2 characters.';
    if (!mail || !mail.includes('@') || !mail.includes('.')) errs.email = 'Enter a valid email address.';

    if (gracePeriodInfo?.isBeyondGracePeriod) {
      if (!savedProfile?.collegeDepartmentId && !regKey) {
        errs.registrationKey = 'A valid registration key is required after the 5-day grace period.';
      }
      if (!savedProfile?.hasPassword && !password) {
        errs.password = 'A password is required after the 5-day grace period.';
      }
    }

    if (password) {
      if (password.length < 8) {
        errs.password = 'Password must be at least 8 characters long.';
      } else if (!/[A-Z]/.test(password)) {
        errs.password = 'Password must contain at least 1 uppercase letter.';
      } else if (!/[a-z]/.test(password)) {
        errs.password = 'Password must contain at least 1 lowercase letter.';
      } else if (!/[0-9]/.test(password)) {
        errs.password = 'Password must contain at least 1 number.';
      }
    }

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
      setRegistrationKey('');
      setVerifiedKeyData(null);
      setPassword('');
      setErrors({});
    }
    setIsEditing(false);
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopiedField(null), 2000);
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
    const cleanRegKey   = registrationKey.trim();

    setLoading(true);
    try {
      const payload: UserProfileFormValues = {
        fullName: cleanFullName,
        nickname: cleanNickname,
        isNicknameSame,
        email: cleanEmail,
        emailType,
        registrationKey: cleanRegKey || undefined,
        password: password.trim() || undefined,
      };

      const res  = await fetch('/api/profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error === 'INVALID_REGISTRATION_KEY' || data.error === 'REGISTRATION_KEY_REQUIRED') {
          setErrors(prev => ({
            ...prev,
            registrationKey: data.message || 'Invalid registration key.',
          }));
        }
        if (data.error === 'INVALID_PASSWORD' || data.error === 'PASSWORD_REQUIRED') {
          setErrors(prev => ({
            ...prev,
            password: data.message,
          }));
        }
        toast.error(data.message || 'Failed to save profile.');
        return;
      }

      localStorage.setItem('cyber_quiz_username', cleanNickname);
      setSavedProfile(data.profile);
      setRegistrationKey('');
      setVerifiedKeyData(null);
      setPassword('');
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

  /* ── Derived Badge Lists & Metrics ── */
  const topicBadges = badges.filter(b => b.badgeType === 'topic');
  const milestoneBadges = badges.filter(b => b.badgeType !== 'topic');
  const unlockedTopicCount = topicBadges.filter(b => b.isUnlocked).length;
  const unlockedTotalCount = badges.filter(b => b.isUnlocked).length;

  const filteredTopicBadges = topicBadges.filter((b) => {
    if (topicFilter === 'unlocked' && !b.isUnlocked) return false;
    if (topicFilter === 'in_progress' && b.isUnlocked) return false;
    if (topicSearch.trim()) {
      const q = topicSearch.trim().toLowerCase();
      return b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
    }
    return true;
  });

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="page-title text-2xl">Participant Profile</h1>
            <p className="page-subtitle">Manage your student identity, department association, and track achievements.</p>
          </div>
        </div>
      </div>

      {/* ── Grace Period Warning Banners ── */}
      {(gracePeriodInfo?.requiresRegistrationKeySetup || gracePeriodInfo?.requiresCollegeUpdate) && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-200">
              Registration Key &amp; Department Setup Required
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              Your 5-day grace period has ended. Please enter the registration key provided by your college/department administrator to continue attempting daily quizzes.
            </p>
          </div>
        </div>
      )}

      {!gracePeriodInfo?.isBeyondGracePeriod && !savedProfile?.collegeDepartmentId && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong className="font-semibold">Grace Period Active:</strong> You have{' '}
            <strong>{gracePeriodInfo?.daysRemaining || 5} day{(gracePeriodInfo?.daysRemaining || 5) === 1 ? '' : 's'} remaining</strong> to enter your department registration key.
          </p>
        </div>
      )}

      {/* ── View Switcher Tabs (All, Profile, Badges) ── */}
      {savedProfile && !isEditing && badges.length > 0 && (
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Profile Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('badges')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'badges'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Achievements</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
              {unlockedTotalCount}/{badges.length}
            </span>
          </button>
        </div>
      )}

      {/* ── Saved profile card (read mode) ── */}
      {savedProfile && !isEditing && (activeTab === 'all' || activeTab === 'profile') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 space-y-5 shadow-sm">
          {/* Profile header row */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#0f172a] dark:bg-white flex items-center justify-center text-white dark:text-slate-900 text-base sm:text-lg font-extrabold shrink-0 shadow-xs">
                {(savedProfile.fullName || savedProfile.nickname).trim().substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {savedProfile.fullName || savedProfile.nickname}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Nickname: <span className="font-semibold text-slate-700 dark:text-slate-300">{savedProfile.nickname}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          {/* Quick Metrics ribbon */}
          {userStats && (
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Questions Solved</p>
                <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">{userStats.totalSolved}</p>
              </div>
              <div className="text-center border-x border-slate-200 dark:border-slate-700/80">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Topics Mastered</p>
                <p className="text-base sm:text-lg font-extrabold text-blue-600 dark:text-blue-400">
                  {unlockedTopicCount} <span className="text-xs font-semibold text-slate-400">/ 20</span>
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Badges</p>
                <p className="text-base sm:text-lg font-extrabold text-amber-600 dark:text-amber-400">
                  {unlockedTotalCount} <span className="text-xs font-semibold text-slate-400">/ {badges.length || 23}</span>
                </p>
              </div>
            </div>
          )}

          {/* Fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <ProfileField
              label="Full Name"
              value={savedProfile.fullName}
              icon={User}
              onCopy={() => handleCopy(savedProfile.fullName, 'Full Name')}
              isCopied={copiedField === 'Full Name'}
            />
            <ProfileField
              label="Display Nickname"
              value={savedProfile.nickname}
              icon={UserCheck}
              note={savedProfile.isNicknameSame ? 'Same as full name' : undefined}
              onCopy={() => handleCopy(savedProfile.nickname, 'Display Nickname')}
              isCopied={copiedField === 'Display Nickname'}
            />
            <ProfileField
              label="Email Address"
              value={savedProfile.email}
              icon={Mail}
              onCopy={() => handleCopy(savedProfile.email, 'Email Address')}
              isCopied={copiedField === 'Email Address'}
            />
            <ProfileField
              label="Email Type"
              value={savedProfile.emailType === 'college' ? 'College / Institutional' : 'Personal'}
              icon={Building2}
            />
            <ProfileField
              label="College / Institution"
              value={savedProfile.collegeName || savedProfile.college?.name || 'Unassigned'}
              icon={Building2}
              note={savedProfile.collegeDepartmentId ? 'Verified Institution' : 'Grace Period (Unassigned)'}
              onCopy={() => handleCopy(savedProfile.collegeName || savedProfile.college?.name || '', 'College Name')}
              isCopied={copiedField === 'College Name'}
            />
            <ProfileField
              label="Department"
              value={savedProfile.departmentName || savedProfile.collegeDepartment?.departmentName || 'Unassigned'}
              icon={Building2}
              note={savedProfile.collegeDepartmentId ? 'Permanent Association' : 'Pending Registration Key'}
              onCopy={() => handleCopy(savedProfile.departmentName || savedProfile.collegeDepartment?.departmentName || '', 'Department')}
              isCopied={copiedField === 'Department'}
            />
          </div>

          {/* Synced notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-900 dark:text-emerald-200 font-normal leading-relaxed">
              <strong className="font-bold">Profile synced.</strong>{' '}
              Your quiz scores, leaderboard rank, and progress are tracked under{' '}
              <strong className="font-bold">{savedProfile.nickname}</strong>.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2.5 pt-1">
            <a
              href="/report"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold shadow-2xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>My Report</span>
            </a>
            <a
              href="/leaderboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold shadow-2xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </a>
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
              {savedProfile && !gracePeriodInfo?.requiresRegistrationKeySetup && (
                <button type="button" onClick={handleCancel} className="btn-icon">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-6 space-y-6">

              {/* Grace Period Notice inside Form */}
              {(gracePeriodInfo?.requiresRegistrationKeySetup || gracePeriodInfo?.requiresCollegeUpdate) && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200">
                  <strong className="font-bold">Required Action:</strong> Please enter the registration key provided by your department administrator to continue.
                </div>
              )}

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

              {/* ── Section 2: Registration Key (College + Department) ── */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-blue-500" /> College &amp; Department Registration Key
                </h3>

                {savedProfile?.collegeDepartment && !registrationKey && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
                    <p className="text-slate-500 dark:text-slate-400">Currently enrolled under:</p>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {savedProfile.collegeName || savedProfile.college?.name} — {savedProfile.departmentName || savedProfile.collegeDepartment?.departmentName}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      To change your department, enter a new registration key below.
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="registrationKey" className="field-label">
                    Registration Key
                    {gracePeriodInfo?.isBeyondGracePeriod && !savedProfile?.collegeDepartmentId && (
                      <span className="text-rose-500 ml-0.5">*</span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        id="registrationKey"
                        type="text"
                        value={registrationKey}
                        onChange={e => {
                          setRegistrationKey(e.target.value);
                          setVerifiedKeyData(null);
                          if (errors.registrationKey) setErrors(er => ({ ...er, registrationKey: undefined }));
                        }}
                        onBlur={() => {
                          if (registrationKey.trim()) handleVerifyKey();
                        }}
                        placeholder="e.g. MITCSE2026 or CSE-MIT"
                        maxLength={100}
                        aria-invalid={!!errors.registrationKey}
                        aria-describedby={errors.registrationKey ? 'regkey-err' : 'regkey-hint'}
                        className={`field-input pl-9 ${errors.registrationKey ? 'field-input-error' : ''}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleVerifyKey()}
                      disabled={isVerifyingKey || !registrationKey.trim()}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      {isVerifyingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                    </button>
                  </div>

                  {errors.registrationKey ? (
                    <p id="regkey-err" role="alert" className="field-error">
                      {errors.registrationKey}
                    </p>
                  ) : (
                    <p id="regkey-hint" className="field-helper">
                      Enter the registration key provided by your college or department administrator.
                    </p>
                  )}

                  {/* Verified Preview Card */}
                  {verifiedKeyData && (
                    <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-100 space-y-1.5 animate-in fade-in duration-200">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Registration key verified.</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">You will be registered under:</p>
                      <div className="pt-0.5 space-y-0.5 text-slate-800 dark:text-slate-200 text-xs">
                        <p><span className="text-slate-500 dark:text-slate-400 font-medium">College:</span> <strong className="font-bold">{verifiedKeyData.college.name}</strong></p>
                        <p><span className="text-slate-500 dark:text-slate-400 font-medium">Department:</span> <strong className="font-bold">{verifiedKeyData.department.name}</strong></p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="section-divider" />

              {/* ── Section 3: Security / Password ── */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" /> Security &amp; Password
                </h3>

                <div>
                  <label htmlFor="password" className="field-label">
                    {savedProfile?.hasPassword ? 'Change Password (Optional)' : 'Account Password'}
                    {gracePeriodInfo?.requiresPassword && <span className="text-rose-500 ml-0.5">*</span>}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); if (errors.password) setErrors(er => ({ ...er, password: undefined })); }}
                      placeholder={savedProfile?.hasPassword ? '•••••••• (Leave blank to keep existing)' : 'Enter password (e.g. Password123)'}
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? 'password-err' : 'password-hint'}
                      className={`field-input pl-9 pr-10 ${errors.password ? 'field-input-error' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p id="password-err" role="alert" className="field-error">{errors.password}</p>
                  ) : (
                    <p id="password-hint" className="field-helper text-[11px]">
                      Requirements: Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, and 1 number.
                    </p>
                  )}
                </div>
              </div>

              <div className="section-divider" />

              {/* ── Section 4: Contact ── */}
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

              {/* ── Section 5: Privacy note ── */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg card-sunken text-[11px] text-slate-500 dark:text-slate-400">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                <p>Your information is used for certificate verification and progress reporting. Passwords and credentials are securely encrypted.</p>
              </div>

            </div>

            {/* ── Form actions ── */}
            <div className="flex items-center gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
              {savedProfile && !gracePeriodInfo?.requiresRegistrationKeySetup && (
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


      {/* ── Badges & Milestones Section ── */}
      {badges.length > 0 && (activeTab === 'all' || activeTab === 'badges') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Achievements &amp; Badges</h2>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
              <span>
                Questions Solved: <strong className="text-slate-900 dark:text-white">{userStats?.totalSolved || 0}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>
                Topics Mastered: <strong className="text-amber-600 dark:text-amber-400">{unlockedTopicCount} / 20</strong>
              </span>
            </div>
          </div>

          {/* 1. Milestone Badges */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Overall Milestones
            </h3>
            <div className="space-y-3">
              {milestoneBadges.map((badge) => {
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

          {/* 2. Topic Specialist Badges (20 Topics) - Scrollable with Filters & Search */}
          <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Topic Badges Header with Filter Pills & Count */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-blue-500" /> Topic Specialist Badges
                </h3>
                <p className="text-[11px] text-slate-500">
                  {unlockedTopicCount} of {topicBadges.length} topics completed (20 total)
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTopicFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    topicFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All ({topicBadges.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTopicFilter('unlocked')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    topicFilter === 'unlocked'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Mastered ({unlockedTopicCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTopicFilter('in_progress')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    topicFilter === 'in_progress'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  In Progress ({topicBadges.length - unlockedTopicCount})
                </button>
              </div>
            </div>

            {/* Search Input for topics */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={topicSearch}
                onChange={e => setTopicSearch(e.target.value)}
                placeholder="Search topics (e.g. Malware, Phishing, Cloud, Incident Response)..."
                className="w-full pl-8.5 pr-8 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {topicSearch && (
                <button
                  type="button"
                  onClick={() => setTopicSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scrollable Badges Grid Container */}
            <div className="relative rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 p-2.5">
              <div
                className="max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1.5 space-y-2.5 overscroll-contain focus:outline-none"
                tabIndex={0}
                aria-label="Scrollable topic specialist badges list"
              >
                {filteredTopicBadges.length === 0 ? (
                  <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-800/30">
                    <Award className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No matching topics found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different keyword or changing filters.</p>
                    {(topicSearch || topicFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => { setTopicSearch(''); setTopicFilter('all'); }}
                        className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Clear search &amp; filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredTopicBadges.map((badge) => {
                      const progressPct = Math.min(100, Math.round((badge.currentCount / badge.requiredQuestions) * 100));
                      return (
                        <div
                          key={badge.id}
                          className={`p-3 rounded-xl border flex items-center gap-3 transition-all hover:border-slate-300 dark:hover:border-slate-600 ${
                            badge.isUnlocked
                              ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 shadow-2xs'
                              : 'bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 opacity-90 hover:opacity-100'
                          }`}
                        >
                          {/* Badge Image */}
                          <div className="relative shrink-0 flex items-center justify-center">
                            <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center p-1 transition-all ${
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
                              <div className="flex items-center gap-1 shrink-0">
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
                                className={`h-full rounded-full transition-all duration-300 ${
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
                )}
              </div>

              {/* Bottom scroll hint bar */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 px-1 border-t border-slate-200/60 dark:border-slate-800/60 mt-1">
                <span>Showing {filteredTopicBadges.length} of {topicBadges.length} topic badges</span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  ↕ Scroll inside box to explore
                </span>
              </div>
            </div>
          </div>
        </div>
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
