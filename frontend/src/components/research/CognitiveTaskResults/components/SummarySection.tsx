'use client';

import React from 'react';

import { cn } from '@/lib/utils';

import { CognitiveSummary } from '../types';

import { MetricCard } from './MetricCard';

interface SummarySectionProps {
  data: CognitiveSummary;
  className?: string;
}

export function SummarySection({ data, className }: SummarySectionProps) {
  const { averagePerformance, completionRate, averageTime, errorRate } = data;
  
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6', className)}>
      <MetricCard 
        title="Rendimiento Promedio" 
        metric={averagePerformance} 
      />
      <MetricCard 
        title="Tasa de Finalización" 
        metric={completionRate} 
      />
      <MetricCard 
        title="Tiempo Promedio" 
        metric={averageTime} 
      />
      <MetricCard 
        title="Tasa de Error" 
        metric={errorRate} 
      />
    </div>
  );
} 