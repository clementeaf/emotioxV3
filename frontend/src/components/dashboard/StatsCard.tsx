'use client';

import { ErrorBoundary } from '../common/ErrorBoundary';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  className?: string;
}

function StatsCardContent({ title, value, icon }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 p-6 hover:scale-[1.02]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-3">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function StatsCard(props: StatsCardProps) {
  return (
    <ErrorBoundary>
      <StatsCardContent {...props} />
    </ErrorBoundary>
  );
} 