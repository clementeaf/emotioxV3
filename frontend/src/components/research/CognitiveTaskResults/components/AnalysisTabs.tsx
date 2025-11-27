'use client';

import React from 'react';

import { cn } from '@/lib/utils';

export type AnalysisTabType = 'sentiment' | 'themes' | 'keywords';

interface AnalysisTabsProps {
  activeTab: AnalysisTabType;
  onTabChange: (tab: AnalysisTabType) => void;
}

export function AnalysisTabs({ activeTab, onTabChange }: AnalysisTabsProps) {
  return (
    <div className="flex border-b border-neutral-200 bg-white sticky top-0 z-10">
      <button 
        className={cn(
          'px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2',
          activeTab === 'sentiment' 
            ? 'border-blue-600 text-blue-600' 
            : 'border-transparent text-neutral-600 hover:text-neutral-800'
        )}
        onClick={() => onTabChange('sentiment')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
        Sentiment
      </button>
      <button 
        className={cn(
          'px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2',
          activeTab === 'themes' 
            ? 'border-blue-600 text-blue-600' 
            : 'border-transparent text-neutral-600 hover:text-neutral-800'
        )}
        onClick={() => onTabChange('themes')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M7 7h10v2H7zM7 11h10v2H7zM7 15h4v2H7z" />
        </svg>
        Themes
      </button>
      <button 
        className={cn(
          'px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2',
          activeTab === 'keywords' 
            ? 'border-blue-600 text-blue-600' 
            : 'border-transparent text-neutral-600 hover:text-neutral-800'
        )}
        onClick={() => onTabChange('keywords')}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        Keywords
      </button>
    </div>
  );
} 