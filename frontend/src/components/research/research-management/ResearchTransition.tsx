'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ResearchTransitionProps {
  researchId: string;
}

export function ResearchTransition({ researchId }: ResearchTransitionProps) {
  const router = useRouter();

  useEffect(() => {
    // Redirigir a la primera etapa con el nuevo formato de URL
    router.push(`/research/${researchId}?section=build&stage=welcome`);
  }, [researchId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50">
      <div className="text-center">
        <div className="mb-4">
          <svg
            className="w-12 h-12 mx-auto text-neutral-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <p className="text-sm text-neutral-600">Creating your research...</p>
      </div>
    </div>
  );
} 