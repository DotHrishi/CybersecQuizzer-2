'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, ShieldCheck, CheckCircle2, AlertCircle, Edit3, ArrowRight, Building2, UserCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { UserProfileFormValues } from '@/types/profile';

export default function ProfileForm() {
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [isNicknameSame, setIsNicknameSame] = useState(false);
  const [email, setEmail] = useState('');
  const [emailType, setEmailType] = useState<'college' | 'personal'>('college');
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [savedProfile, setSavedProfile] = useState<UserProfileFormValues | null>(null);
  const [isEditing, setIsEditing] = useState(true);

  // Load existing profile from LocalStorage & API on mount
  useEffect(() => {
    const savedName = localStorage.getItem('cyber_quiz_username');
    if (savedName) {
      setNickname(savedName);
      fetchExistingProfile(savedName);
    } else {
      setFetching(false);
    }
  }, []);

  const fetchExistingProfile = async (currentNickname: string) => {
    setFetching(true);
    try {
      const res = await fetch(`/api/profile?nickname=${encodeURIComponent(currentNickname)}`);
      const data = await res.json();
      if (data.success && data.profile) {
        const p = data.profile;
        setFullName(p.fullName || '');
        setNickname(p.nickname || '');
        setIsNicknameSame(Boolean(p.isNicknameSame));
        setEmail(p.email || '');
        setEmailType(p.emailType === 'personal' ? 'personal' : 'college');
        setSavedProfile({
          fullName: p.fullName,
          nickname: p.nickname,
          isNicknameSame: Boolean(p.isNicknameSame),
          email: p.email,
          emailType: p.emailType || 'college',
        });
        setIsEditing(false);
      }
    } catch (err) {
      console.warn('Could not fetch existing profile:', err);
    } finally {
      setFetching(false);
    }
  };

  // Handle Full Name change & auto-sync Nickname if checkbox is checked
  const handleFullNameChange = (val: string) => {
    setFullName(val);
    if (isNicknameSame) {
      setNickname(val);
    }
  };

  // Handle Checkbox "Nickname is same as Full Name" toggle
  const handleNicknameSameToggle = (checked: boolean) => {
    setIsNicknameSame(checked);
    if (checked) {
      setNickname(fullName);
    }
  };

  // Handle Email Type toggle (College vs Personal)
  const handleEmailTypeToggle = (usePersonal: boolean) => {
    const newType = usePersonal ? 'personal' : 'college';
    setEmailType(newType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanFullName = fullName.trim();
    const cleanNickname = (isNicknameSame ? cleanFullName : nickname).trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanFullName || cleanFullName.length < 2) {
      toast.error('Please enter a valid full name (min 2 characters).');
      return;
    }

    if (!cleanNickname || cleanNickname.length < 2) {
      toast.error('Please enter a valid nickname (min 2 characters).');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullName: cleanFullName,
        nickname: cleanNickname,
        isNicknameSame,
        email: cleanEmail,
        emailType,
      };

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to save profile.');
        setLoading(false);
        return;
      }

      // Update LocalStorage username for seamless quiz / leaderboard integration
      localStorage.setItem('cyber_quiz_username', cleanNickname);

      setSavedProfile(payload);
      setIsEditing(false);
      toast.success('Profile saved successfully!');
    } catch (err: any) {
      console.error('Save profile error:', err);
      toast.error('Network error saving profile.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="py-20 text-center text-slate-400 space-y-4">
        <RefreshCw className="w-9 h-9 mx-auto animate-spin text-white" />
        <p className="text-sm font-semibold">Loading profile information...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/20 shadow-white-glow relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shadow-lg shrink-0">
            <div className="w-full h-full bg-cyber-950 rounded-xl flex items-center justify-center">
              <UserCheck className="w-7 h-7 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">User Profile</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
              Manage your personal identity, nickname, and email credentials for the Cybersecurity Programme.
            </p>
          </div>

        </div>
      </div>

      {/* Saved Profile Summary Card (If already saved and not editing) */}
      {savedProfile && !isEditing && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900/10 dark:bg-white/10 border border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-900 dark:text-white font-bold">
                {savedProfile.nickname.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{savedProfile.fullName}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nickname: <span className="text-slate-900 dark:text-white font-semibold">{savedProfile.nickname}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900/10 dark:bg-white/10 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-xs font-bold transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-cyber-900/60 border border-slate-800 space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium block">Email Address</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white break-all flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{savedProfile.email}</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-cyber-900/60 border border-slate-800 space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium block">Email Classification</span>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-200/80 dark:bg-white/10 text-slate-900 dark:text-white border border-slate-300 dark:border-white/20">
                <Building2 className="w-3 h-3 text-slate-700 dark:text-white" />
                <span>{savedProfile.emailType === 'college' ? 'College Email ID' : 'Personal Email ID'}</span>
              </span>
            </div>
          </div>

          {/* Active Profile Synced Banner - High Contrast in both Light & Dark themes */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/60 border border-emerald-500/30 dark:border-emerald-500/30 text-xs flex items-start space-x-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
              <strong className="font-bold text-emerald-950 dark:text-white">Active Profile Synced:</strong> Your responses, leaderboard score, and security completion status are connected to <strong className="font-bold text-emerald-950 dark:text-white">{savedProfile.nickname}</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Profile Form (Shown when creating/editing) */}
      {(isEditing || !savedProfile) && (
        <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-slate-700 dark:text-white" />
              <span>Personal Details & Identity</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fill in your full name, nickname preference, and verified email ID.
            </p>
          </div>

          {/* 1. Full Name */}
          <div className="space-y-2">
            <label className="block text-xs uppercase font-bold tracking-wider text-slate-700 dark:text-slate-300">
              Full Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4 text-slate-700 dark:text-white" />
              </div>
              <input
                type="text"
                value={fullName}
                onChange={(e) => handleFullNameChange(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full pl-10 pr-4 py-3 bg-cyber-900/90 border border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-all text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* 2. Checkbox: Nickname Same as Full Name */}
          <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-cyber-900/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
            <input
              type="checkbox"
              id="nickname-same-checkbox"
              checked={isNicknameSame}
              onChange={(e) => handleNicknameSameToggle(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-slate-900 dark:text-white bg-cyber-950 focus:ring-slate-900 dark:focus:ring-white focus:ring-offset-0 transition-all cursor-pointer"
            />
            <label htmlFor="nickname-same-checkbox" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
              Nickname is same as Full Name
            </label>
          </div>

          {/* 3. Nickname Input */}
          <div className="space-y-2">
            <label className="block text-xs uppercase font-bold tracking-wider text-slate-700 dark:text-slate-300">
              Display Nickname <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <UserCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </div>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={isNicknameSame}
                placeholder="e.g. Alex, CyberKing"
                className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm font-medium transition-all ${
                  isNicknameSame
                    ? 'bg-slate-200/60 dark:bg-slate-900/70 border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    : 'bg-cyber-900/90 border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white'
                }`}
                maxLength={30}
                required
              />
            </div>
            {isNicknameSame && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic">
                Auto-synced with Full Name because checkbox is selected.
              </p>
            )}
          </div>

          {/* 4. College Email vs Personal Email Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs uppercase font-bold tracking-wider text-slate-700 dark:text-slate-300">
                {emailType === 'college' ? 'College Email ID' : 'Personal Email ID'} <span className="text-rose-400">*</span>
              </label>

              {/* Checkbox / Toggle for College Email Not Available */}
              <div className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="personal-email-checkbox"
                  checked={emailType === 'personal'}
                  onChange={(e) => handleEmailTypeToggle(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 text-slate-900 dark:text-white bg-cyber-950 focus:ring-slate-900 dark:focus:ring-white transition-all cursor-pointer"
                />
                <label htmlFor="personal-email-checkbox" className="text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer font-medium select-none">
                  College email not available?
                </label>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4 text-slate-700 dark:text-white" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  emailType === 'college'
                    ? 'e.g. student.name@college.edu.in'
                    : 'e.g. student.name@gmail.com'
                }
                className="w-full pl-10 pr-4 py-3 bg-cyber-900/90 border border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-white focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-all text-sm font-medium"
                required
              />
            </div>

            {/* Email Type Hint Banner */}
            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-100 dark:bg-cyber-900/40 border border-slate-300 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
              <AlertCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
              <div>
                {emailType === 'college' ? (
                  <span>
                    <strong className="text-slate-900 dark:text-white">College Email Mandate:</strong> Please enter your official institutional email ID. If you do not possess one, check the option above to specify your personal email.
                  </span>
                ) : (
                  <span>
                    <strong className="text-slate-900 dark:text-white">Personal Email Selected:</strong> Using personal email for account registration and certificate verification.
                  </span>
                )}
              </div>
            </div>
          </div>


          {/* Action Buttons - High contrast in both Light & Dark themes */}
          <div className="pt-4 flex items-center space-x-3">
            {savedProfile && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-1/3 py-3.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-sm transition-all shadow-sm cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center space-x-2 text-sm font-extrabold shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer ${
                savedProfile ? 'w-2/3' : 'w-full'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span className="text-white">Saving Profile to Supabase...</span>
                </>
              ) : (
                <>
                  <span className="text-white">Save Profile</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </div>


        </form>
      )}
    </div>
  );
}
