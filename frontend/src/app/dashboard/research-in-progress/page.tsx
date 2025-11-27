'use client';

import { Suspense } from 'react';
import { ResearchInProgressContent } from '@/components/research/ResearchInProgress/ResearchInProgressContent';

export default function ResearchInProgressPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Cargando investigación...</span>
        </div>
      </div>
    }>
      <ResearchInProgressContent />
    </Suspense>
  );
}
