'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShieldAlert, Trophy, BarChart3, Lock, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

/* ─── Types ─────────────────────────────────────────────── */

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('cyber_quiz_username');
    if (saved) setUserName(saved);
  }, []);


  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const leftNavLinks = [
    { href: '/', label: 'Daily Quiz', icon: ShieldAlert },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const rightNavLinks = [
    { href: '/report', label: 'My Report', icon: BarChart3 },
    { href: '/admin', label: 'Admin', icon: Lock },
  ];

  const allNavLinks = [...leftNavLinks, ...rightNavLinks];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">

        {/* ── Main bar ── */}
        <div className="relative flex items-center justify-between h-24 sm:h-28">

          {/* Left Wing: Theme toggle on far left + Left 2 Options centered between Theme button and Logo */}
          <div className="flex-1 flex items-center justify-between min-w-0">
            {/* Theme toggle on the far left */}
            <div className="shrink-0">
              <button
                onClick={toggle}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                {!mounted ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
              </button>
            </div>

            {/* Left 2 Options: Centered in the remaining space */}
            <div className="flex-1 flex items-center justify-center px-2">
              <div className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                {leftNavLinks.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        active
                          ? 'bg-[#0f172a] text-white dark:bg-white dark:text-black shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center: Logo (enlarged prominent size) */}
          <div className="flex-shrink-0 flex items-center justify-center px-3 sm:px-5">
            <Link href="/" title="Cyber Safety & Awareness Programme" className="block">
              <Image
                src="/cyber-safety-logo.png"
                alt="Cyber Safety & Awareness Programme"
                width={520}
                height={160}
                priority
                className="h-16 sm:h-20 md:h-24 lg:h-26 w-auto object-contain bg-white rounded-xl px-3 py-1.5 transition-transform hover:scale-[1.02] shadow-2xs"
              />
            </Link>
          </div>


          {/* Right Wing: Right 2 Options centered between Logo and Profile Badge + Profile Badge on far right */}
          <div className="flex-1 flex items-center justify-between min-w-0">
            {/* Right 2 Options: Centered in the remaining space */}
            <div className="flex-1 flex items-center justify-center px-2">
              <div className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                {rightNavLinks.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        active
                          ? 'bg-[#0f172a] text-white dark:bg-white dark:text-black shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Profile badge & mobile hamburger on the far right */}
            <div className="shrink-0 flex items-center gap-2">
              <Link
                href="/profile"
                title="View your profile"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 text-xs font-bold text-slate-800 dark:text-white transition-colors shrink-0"
              >
                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                  {mounted && userName ? userName.substring(0, 2).toUpperCase() : 'US'}
                </span>
                <span className="max-w-[80px] sm:max-w-[120px] truncate">{mounted && userName ? userName : 'Profile'}</span>
              </Link>


              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Open menu"
              >
                <div className="space-y-1 px-1.5 py-1">
                  <span className={`block h-0.5 w-4 bg-slate-700 dark:bg-slate-300 rounded transition-all ${mobileOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                  <span className={`block h-0.5 w-4 bg-slate-700 dark:bg-slate-300 rounded transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
                  <span className={`block h-0.5 w-4 bg-slate-700 dark:bg-slate-300 rounded transition-all ${mobileOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile drawer ── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 pb-3">
            <nav className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {allNavLinks.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 text-sm font-semibold transition-colors ${
                      active
                        ? 'text-[#0f172a] dark:text-white bg-slate-50 dark:bg-slate-800/60'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0f172a] dark:bg-white" />}
                  </Link>
                );
              })}

              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-extrabold text-slate-700 dark:text-slate-200 shrink-0">
                  {userName ? userName.substring(0, 2).toUpperCase() : 'US'}
                </div>
                <span>{userName || 'My Profile'}</span>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
