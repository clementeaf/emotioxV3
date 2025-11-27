'use client';

import { Suspense } from 'react';

import { ConfigCard } from '@/components/common/ConfigCard';
import { withSearchParams } from '@/components/common/SearchParamsWrapper';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useStageManager } from '../hooks/useStageManager';


interface ResearchStageManagerProps {
  researchId: string;
}

// Componente interno que usa useSearchParams
function ResearchStageManagerContent({ researchId }: ResearchStageManagerProps) {
  const { stageTitle, renderStageContent } = useStageManager(researchId);

  return (
    <div className="flex flex-col justify-start pt-3">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">{stageTitle}</h1>
      </div>
      <ConfigCard>
        {renderStageContent()}
      </ConfigCard>
    </div>
  );
}

// Usar el HOC para envolver el componente
const ResearchStageManagerContentWithParams = withSearchParams(ResearchStageManagerContent);

// Componente público que exportamos
export function ResearchStageManager(props: ResearchStageManagerProps) {
  return (
    <Suspense fallback={<LoadingSkeleton type="layout" />}>
      <ResearchStageManagerContentWithParams {...props} />
    </Suspense>
  );
}

