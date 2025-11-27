'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  progress: number;
  max?: number;
  width?: string;
  height?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  className?: string;
}

export function ProgressBar({
  progress,
  max = 100,
  width = 'w-16',
  height = 'h-2',
  showPercentage = true,
  color = 'blue',
  className
}: ProgressBarProps) {
  // Asegurar que el progreso esté entre 0 y max
  const clampedProgress = Math.max(0, Math.min(max, progress));
  const percentage = (clampedProgress / max) * 100;

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'yellow':
        return 'bg-yellow-500';
      case 'red':
        return 'bg-red-500';
      case 'purple':
        return 'bg-purple-500';
      case 'blue':
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('rounded-full bg-neutral-100', width, height)}>
        <div
          className={cn('rounded-full transition-all duration-300', height, getColorClasses(color))}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <span className="text-sm text-neutral-600">
          {clampedProgress}%
        </span>
      )}
    </div>
  );
}
