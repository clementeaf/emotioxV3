'use client';

import React from 'react';

import { cn } from '@/lib/utils';

import { ActionBar } from './ActionBar';

interface HeaderSectionProps {
  title: string;
  description?: string;
  className?: string;
  onFilter?: () => void;
  onExport?: () => void;
  showFilter?: boolean;
  showExport?: boolean;
}

export function HeaderSection({
  title,
  description,
  className,
  onFilter,
  onExport,
  showFilter = true,
  showExport = true
}: HeaderSectionProps) {
  return (
    <div className={cn('flex justify-between items-center mb-6', className)}>
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
        {description && <p className="text-sm text-neutral-600 mt-1">{description}</p>}
      </div>
      
      <ActionBar 
        onFilter={onFilter}
        onExport={onExport}
        showFilter={showFilter}
        showExport={showExport}
      />
    </div>
  );
} 