'use client';

import { cn } from '@/lib/utils';

export interface ConfigCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ConfigCard({
  children,
  className,
  style
}: ConfigCardProps) {
  return (
    <div
      className={cn(
        'max-h-[calc(100vh-160px)] min-h-[400px] overflow-y-auto p-8',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
