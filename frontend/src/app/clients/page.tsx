'use client';

import { ClientsContent } from '@/components/clients/ClientsContent';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SearchParamsWrapper } from '@/components/common/SearchParamsWrapper';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

export default function ClientsPage() {
  const { token } = useProtectedRoute();

  if (!token) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SearchParamsWrapper>
        <ClientsContent />
      </SearchParamsWrapper>
    </ErrorBoundary>
  );
}
