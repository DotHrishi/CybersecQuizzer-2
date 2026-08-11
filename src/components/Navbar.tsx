'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShieldAlert, Trophy, BarChart3, Lock, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function Navbar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const savedName = localStorage.getItem('cyber_quiz_username');
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  const navLinks = [
    { href: '/', label: 'Daily Quiz', icon: ShieldAlert },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/report', label: 'My Report', icon: BarChart3 },
    { href: '/admin', label: 'Admin', icon: Lock },
  ];

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <Image 
            src="/logo.png" 
            alt="Cybersecurity Awareness & Digital Safety Programme Logo" 
            width={40} 
            height={40} 
            className="rounded-xl shadow-white-glow group-hover:scale-105 transition-transform object-cover shrink-0" 
          />
          <div>
            <span className="text-sm sm:text-base font-extrabold tracking-wide text-white brand-logo-text block leading-tight">
              CYBERSECURITY AWARENESS
            </span>
            <span className="block text-[10px] sm:text-xs font-semibold text-slate-400 tracking-wider">
              & Digital Safety Programme
            </span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-cyber-900/90 p-1 rounded-xl border border-slate-800">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Side: User Profile Badge + Theme Toggle */}
        <div className="flex items-center space-x-3">
          <Link
            href="/profile"
            title="Click to view and edit your profile"
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/10 dark:bg-cyber-800/80 border border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white text-xs font-bold text-slate-900 dark:text-white shadow-sm hover:scale-105 transition-all cursor-pointer group"
          >
            <User className="w-4 h-4 text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white" />
            <span className="max-w-[120px] truncate">{userName || 'Profile'}</span>
          </Link>



          {/* Theme Toggle Button */}
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-700 bg-cyber-800/80 hover:bg-cyber-700 transition-all hover:border-white"
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4 text-amber-400" />
              : <Moon className="w-4 h-4 text-indigo-400" />
            }
          </button>
        </div>
      </div>

      {/* Mobile Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/60 py-2 bg-cyber-900/90">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center text-[10px] font-medium transition-all ${
                isActive ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
        {/* Mobile theme toggle */}
        <button onClick={toggle} className="flex flex-col items-center text-[10px] font-medium text-slate-400">
          {theme === 'dark'
            ? <Sun className="w-4 h-4 mb-0.5 text-amber-400" />
            : <Moon className="w-4 h-4 mb-0.5 text-indigo-400" />
          }
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
    </header>
  );
}
