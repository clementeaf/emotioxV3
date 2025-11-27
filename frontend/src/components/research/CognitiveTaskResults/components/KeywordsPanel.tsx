'use client';

import React from 'react';

import { KeywordResult } from '../types';

interface KeywordsPanelProps {
  keywords?: KeywordResult[];
}

export function KeywordsPanel({ keywords }: KeywordsPanelProps) {
  if (!keywords || keywords.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-neutral-500">No hay palabras clave disponibles.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">Keywords</h3>
      <ul className="space-y-3">
        {keywords.map((keyword) => (
          <li key={keyword.id} className="flex items-center justify-between">
            <span className="text-neutral-700">{keyword.name}</span>
            <span className="px-2 py-1 bg-neutral-100 rounded text-neutral-700 text-sm">
              {keyword.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
} 