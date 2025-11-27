'use client';

import { cn } from '@/lib/utils';

export type StatusType = 'pending' | 'in_progress' | 'completed' | 'draft' | 'archived';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = false }: StatusBadgeProps) {
  const getStatusConfig = (status: StatusType) => {
    const baseClasses = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset';

    switch (status) {
      case 'pending':
        return {
          classes: cn(baseClasses, 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'),
          text: 'Pending',
          icon: '⏳'
        };
      case 'in_progress':
        return {
          classes: cn(baseClasses, 'bg-blue-50 text-blue-700 ring-blue-600/20'),
          text: 'In Progress',
          icon: '🔄'
        };
      case 'completed':
        return {
          classes: cn(baseClasses, 'bg-green-50 text-green-700 ring-green-600/20'),
          text: 'Completed',
          icon: '✅'
        };
      case 'draft':
        return {
          classes: cn(baseClasses, 'bg-gray-50 text-gray-700 ring-gray-600/20'),
          text: 'Draft',
          icon: '📝'
        };
      case 'archived':
        return {
          classes: cn(baseClasses, 'bg-purple-50 text-purple-700 ring-purple-600/20'),
          text: 'Archived',
          icon: '📦'
        };
      default:
        return {
          classes: cn(baseClasses, 'bg-neutral-50 text-neutral-700 ring-neutral-600/20'),
          text: String(status).replace('_', ' '),
          icon: '❓'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={cn(config.classes, className)}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.text}
    </span>
  );
}
