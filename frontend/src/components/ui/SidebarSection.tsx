'use client';

import { cn } from '@/lib/utils';

interface SidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function SidebarSection({ 
  title, 
  children, 
  className 
}: SidebarSectionProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {title && (
        <h3 className="px-3 text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
} 