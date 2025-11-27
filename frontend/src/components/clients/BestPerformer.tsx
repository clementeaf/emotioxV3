'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';

interface BestPerformerProps {
  className?: string;
  data?: {
    id: string;
    title: string;
    imageUrl: string;
    score: number;
    researchId: string;
  };
}

export function BestPerformer({ className, data }: BestPerformerProps) {
  return (
    <div className={cn('bg-white rounded-lg shadow-sm overflow-hidden', className)}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-neutral-900">
            The best option's performance
          </h3>
        </div>

        {data ? (
          <div className="space-y-4">
            <div className="aspect-video relative overflow-hidden rounded-lg bg-neutral-100">
              {/* Placeholder para la imagen - En producción usaríamos next/image */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-sm text-neutral-500">Product Image</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">{data.title}</span>
                <span className="text-sm font-medium text-neutral-900">
                  Score: {data.score}
                </span>
              </div>
              <Link
                href={`/research/${data.researchId}`}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
              >
                See Research
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-600">
              No performance data available
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 