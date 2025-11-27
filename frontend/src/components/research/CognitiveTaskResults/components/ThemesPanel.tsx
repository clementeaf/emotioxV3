'use client';

import React from 'react';

import { ThemeResult } from '../types';

import { AnalysisImage } from './AnalysisImage';

interface ThemesPanelProps {
  themes?: ThemeResult[];
  imageSrc?: string;
}

export function ThemesPanel({ themes, imageSrc }: ThemesPanelProps) {
  if (!themes || themes.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-neutral-500">No hay temas disponibles.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">Themes</h3>
      <ul className="space-y-3 mb-6">
        {themes.map((theme) => (
          <li key={theme.id} className="flex items-center justify-between">
            <span className="text-neutral-700">{theme.name}</span>
            <span className="px-2 py-1 bg-neutral-100 rounded text-neutral-700 text-sm">
              {theme.count}
            </span>
          </li>
        ))}
      </ul>

      {imageSrc && (
        <AnalysisImage 
          src={imageSrc} 
          alt="Theme analysis visualization" 
          className="mt-6"
        />
      )}
    </div>
  );
} 