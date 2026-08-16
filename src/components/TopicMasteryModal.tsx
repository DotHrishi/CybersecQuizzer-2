'use client';

import React from 'react';
import Image from 'next/image';
import { Award, Download, CheckCircle2, X, Sparkles, ShieldCheck } from 'lucide-react';
import { getTopicSkillInfo } from '@/lib/topicSkills';

interface TopicMasteryModalProps {
  topicTitle: string;
  badgeImage: string;
  onClose: () => void;
  onDownload: () => void;
}

export default function TopicMasteryModal({
  topicTitle,
  badgeImage,
  onClose,
  onDownload,
}: TopicMasteryModalProps) {
  const skillInfo = getTopicSkillInfo(topicTitle);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Icon Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 sm:p-7 space-y-6">
          {/* Header & Badge Showcase */}
          <div className="flex flex-col items-center text-center space-y-3 pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Badge Awarded • Topic Mastered</span>
            </div>

            {/* Glowing Badge Emblem */}
            <div className="relative my-2">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-amber-500/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-b from-blue-50 to-indigo-50 dark:from-blue-950/80 dark:to-slate-900 border-2 border-blue-200 dark:border-blue-700/70 p-3 shadow-lg flex items-center justify-center">
                <Image
                  src={badgeImage}
                  alt={topicTitle}
                  width={120}
                  height={120}
                  className="w-full h-full object-contain drop-shadow-md"
                  priority
                />
              </div>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {topicTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
                Congratulations! You have completed all curriculum questions for this topic and earned the official <strong className="text-slate-900 dark:text-white font-semibold">Topic Specialist Badge</strong>.
              </p>
            </div>

            {/* Download Badge Action Button */}
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400 dark:text-amber-600" />
              <span>Download Badge Image</span>
            </button>
          </div>

          {/* Skills Learned Section */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2.5">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Skills & Competencies Learned</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {skillInfo.skills.length} Key Skills
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 italic">
              {skillInfo.summary}
            </p>

            <ul className="space-y-2.5 pt-1">
              {skillInfo.skills.map((skill, index) => (
                <li key={index} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {skill.title}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                      {skill.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
          >
            Awesome, Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
