'use client';

import React from 'react';

import { cn } from '@/lib/utils';

import { SummaryMetric } from '../types';

interface MetricCardProps {
  title: string;
  metric: SummaryMetric;
  className?: string;
}

export function MetricCard({ title, metric, className }: MetricCardProps) {
  const { value, trend, trendDirection, comparisonText } = metric;
  
  const getTrendIcon = () => {
    if (trendDirection === 'up') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
          <polyline points="17 18 23 18 23 12"></polyline>
        </svg>
      );
    }
  };
  
  // Determinar el color del texto para la tendencia
  // Para métricas donde "down" es positivo (como tasa de error), invertimos la lógica
  const isTrendPositive = title.toLowerCase().includes('error') 
    ? trendDirection === 'down' 
    : trendDirection === 'up';
  
  const trendColorClass = isTrendPositive ? 'text-green-600' : 'text-red-600';
  
  return (
    <div className={cn('bg-white p-4 rounded-lg border border-neutral-200', className)}>
      <h3 className="text-sm font-medium text-neutral-700">{title}</h3>
      <div className="mt-2 flex items-center">
        <span className="text-2xl font-bold text-neutral-900">
          {typeof value === 'number' && title.toLowerCase().includes('rate') ? `${value}%` : value}
        </span>
        <span className={cn('text-sm ml-2 flex items-center', trendColorClass)}>
          {getTrendIcon()}
          {typeof trend === 'number' && (
            title.toLowerCase().includes('time') 
              ? `+${Math.floor(trend / 60)}:${(trend % 60).toString().padStart(2, '0')}`
              : (trendDirection === 'down' ? '-' : '+') + trend.toFixed(1) + '%'
          )}
        </span>
      </div>
      <div className="mt-1 text-xs text-neutral-500">{comparisonText}</div>
    </div>
  );
} 