'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { withSearchParams } from '@/components/common/SearchParamsWrapper';
import { NewResearchContent } from '@/components/research/research-management/NewResearchContent';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { Suspense } from 'react';

/**
 * Página de creación de nueva investigación
 */
const NewResearchContentWithSuspense = withSearchParams(NewResearchContent);

export default function NewResearchPage() {
  const { token } = useProtectedRoute();

  if (!token) {
    return null;
  }

  return (
    <div className="flex flex-col justify-start">
      <div className="mx-auto px-6 py-8 w-full">
        <ErrorBoundary>
          <Suspense fallback={<div className="p-4 text-center">Cargando...</div>}>
            <NewResearchContentWithSuspense />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
