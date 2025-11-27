'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'form' | 'card' | 'table' | 'list' | 'full';
  rows?: number;
  animated?: boolean;
  title?: boolean;
}

export function LoadingSkeleton({ 
  className, 
  variant = 'form', 
  rows = 4, 
  animated = true,
  title = true 
}: LoadingSkeletonProps) {
  const pulseClass = animated ? 'animate-pulse' : '';
  
  // Renderizar un esqueleto de carga para formularios
  if (variant === 'form') {
    return (
      <div className={cn('p-6 bg-white rounded-lg border border-neutral-200', pulseClass, className)}>
        {title && (
          <div className="mb-6">
            <div className="h-7 bg-neutral-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
          </div>
        )}
        
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="mb-6">
            <div className="h-4 bg-neutral-200 rounded w-1/4 mb-3"></div>
            <div className="h-10 bg-neutral-200 rounded w-full"></div>
          </div>
        ))}
        
        <div className="flex justify-end mt-8">
          <div className="h-10 bg-neutral-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }
  
  // Renderizar un esqueleto de carga para tarjetas
  if (variant === 'card') {
    return (
      <div className={cn('p-6 bg-white rounded-lg border border-neutral-200', pulseClass, className)}>
        <div className="h-5 bg-neutral-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3 mb-4">
          <div className="h-4 bg-neutral-200 rounded w-full"></div>
          <div className="h-4 bg-neutral-200 rounded w-full"></div>
          <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
        </div>
        <div className="flex gap-3 pt-4">
          <div className="h-8 bg-neutral-200 rounded w-20"></div>
          <div className="h-8 bg-neutral-200 rounded w-20"></div>
        </div>
      </div>
    );
  }
  
  // Renderizar un esqueleto de carga para tablas
  if (variant === 'table') {
    return (
      <div className={cn('bg-white rounded-lg border border-neutral-200 overflow-hidden', pulseClass, className)}>
        <div className="h-12 bg-neutral-100 px-4 flex items-center border-b border-neutral-200">
          <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center">
            <div className="h-4 bg-neutral-200 rounded w-1/4"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/5"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/6"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/6"></div>
            <div className="h-8 bg-neutral-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    );
  }
  
  // Renderizar un esqueleto de carga para listas
  if (variant === 'list') {
    return (
      <div className={cn('bg-white rounded-lg border border-neutral-200', pulseClass, className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 border-b border-neutral-200 last:border-b-0">
            <div className="h-5 bg-neutral-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-neutral-200 rounded w-4/5 mb-1"></div>
            <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }
  
  // Renderizar un esqueleto de carga de pantalla completa
  return (
    <div className={cn('h-full min-h-[50vh] flex flex-col', pulseClass, className)}>
      <div className="mb-6">
        <div className="h-8 bg-neutral-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="h-32 bg-neutral-200 rounded"></div>
        <div className="h-32 bg-neutral-200 rounded"></div>
        <div className="h-32 bg-neutral-200 rounded"></div>
      </div>
      
      <div className="flex-1 h-64 bg-neutral-200 rounded"></div>
    </div>
  );
} 