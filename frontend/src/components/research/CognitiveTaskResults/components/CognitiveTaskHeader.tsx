'use client';

import React from 'react';

interface CognitiveTaskHeaderProps {
  title: string;
}

export function CognitiveTaskHeader({ title }: CognitiveTaskHeaderProps) {
  return (
    <div className="py-4 border-b border-neutral-200 -mx-8 px-8">
      <h2 className="text-xl font-semibold text-neutral-800">{title}</h2>
    </div>
  );
} 