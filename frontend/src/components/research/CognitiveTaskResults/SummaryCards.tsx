'use client';


import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  className?: string;
  averageScore?: number;
  completionRate?: number;
  averageTime?: string;
  errorRate?: number;
}

export function SummaryCards({
  className,
  averageScore = 0,
  completionRate = 0,
  averageTime = '0:00',
  errorRate = 0
}: SummaryCardsProps) {
  return (
    <div className={cn('grid grid-cols-4 gap-6 mb-6', className)}>
      {/* Rendimiento Promedio */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200">
        <h3 className="text-sm font-medium text-neutral-700">Rendimiento Promedio</h3>
        <div className="mt-2 flex items-center">
          <span className="text-2xl font-bold text-neutral-900">{averageScore}</span>
          <span className="text-sm text-gray-400 ml-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            --
          </span>
        </div>
        <div className="mt-1 text-xs text-neutral-500">vs. promedio de grupo</div>
      </div>

      {/* Tasa de Finalización */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200">
        <h3 className="text-sm font-medium text-neutral-700">Tasa de Finalización</h3>
        <div className="mt-2 flex items-center">
          <span className="text-2xl font-bold text-neutral-900">{completionRate}%</span>
          <span className="text-sm text-gray-400 ml-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            --
          </span>
        </div>
        <div className="mt-1 text-xs text-neutral-500">vs. promedio histórico</div>
      </div>

      {/* Tiempo Promedio */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200">
        <h3 className="text-sm font-medium text-neutral-700">Tiempo Promedio</h3>
        <div className="mt-2 flex items-center">
          <span className="text-2xl font-bold text-neutral-900">{averageTime}</span>
          <span className="text-sm text-gray-400 ml-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
              <polyline points="17 18 23 18 23 12"></polyline>
            </svg>
            --
          </span>
        </div>
        <div className="mt-1 text-xs text-neutral-500">vs. última evaluación</div>
      </div>

      {/* Tasa de Error */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200">
        <h3 className="text-sm font-medium text-neutral-700">Tasa de Error</h3>
        <div className="mt-2 flex items-center">
          <span className="text-2xl font-bold text-neutral-900">{errorRate}%</span>
          <span className="text-sm text-gray-400 ml-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
              <polyline points="17 18 23 18 23 12"></polyline>
            </svg>
            --
          </span>
        </div>
        <div className="mt-1 text-xs text-neutral-500">vs. promedio de grupo</div>
      </div>
    </div>
  );
}
