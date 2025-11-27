'use client';

import { cn } from '@/lib/utils';

interface DataPoint {
  id: string;
  name: string;
  perceivedValue: number;
  benefitAssociation: number;
}

interface BenchmarkChartProps {
  className?: string;
  data?: DataPoint[];
}

export function BenchmarkChart({ className, data = [] }: BenchmarkChartProps) {
  return (
    <div className={cn('bg-white rounded-lg p-6 shadow-sm', className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-neutral-900">
            Affordances & Signifiers' Benchmark
          </h3>
        </div>
        
        {/* Placeholder para el gráfico - Aquí se integrará la librería de gráficos */}
        <div className="aspect-[16/9] bg-neutral-50 rounded-lg flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="text-sm text-neutral-600">
              Perceived Value vs Benefit Association Chart
            </div>
            <div className="text-xs text-neutral-500">
              Chart visualization will be implemented with a charting library
            </div>
          </div>
        </div>

        <div className="text-xs text-neutral-500">
          This chart shows the relationship between perceived value and benefit association
          across different projects, helping identify the most effective designs.
        </div>
      </div>
    </div>
  );
} 