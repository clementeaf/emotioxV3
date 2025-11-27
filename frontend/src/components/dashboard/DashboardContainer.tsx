'use client';

import { ResearchStageManager } from '@/components/research/research-management/ResearchStageManager';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import { useDashboardResearch } from '@/hooks/useDashboardResearch';
import { useResearchList } from '@/api/domains/research';
import { memo } from 'react';
import { DashboardContent } from './DashboardContent';

/**
 * Container que maneja la lógica compleja del dashboard
 * Decide qué renderizar basado en el estado de la investigación
 */
export const DashboardContainer = memo(() => {
  const { section, isAimFramework, activeResearch, isLoading } = useDashboardResearch();
  const { data: researchList = [], isLoading: isLoadingResearch } = useResearchList();

  // Validar que researchList sea un array
  const safeResearchList = Array.isArray(researchList) ? researchList : [];

  // Solo mostrar loading si NO hay datos en cache
  const hasData = safeResearchList.length > 0;
  const shouldShowLoading = (isLoading || isLoadingResearch) && !hasData;

  if (shouldShowLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto px-6 py-8 w-full">
          <LoadingSkeleton type="dashboard" />
        </div>
      </div>
    );
  }

  // Solo mostrar ResearchStageManager si hay parámetros específicos que requieren configuración
  // No mostrar para el dashboard principal
  if (activeResearch && section && section !== 'dashboard') {
    return <ResearchStageManager researchId={activeResearch.id} />;
  }

  // Dashboard principal
  return <DashboardContent researchList={safeResearchList} />;
});

DashboardContainer.displayName = 'DashboardContainer';
