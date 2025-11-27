'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import { useResearchClient } from '@/hooks/useResearchClient';
import dynamic from 'next/dynamic';

interface ResearchClientProps {
  id: string;
}

const DynamicResearchStageManager = dynamic(
  () => import('@/components/research/research-management/ResearchStageManager').then(mod => ({ default: mod.ResearchStageManager })),
  {
    ssr: false
  }
);

export default function ResearchClient({ id }: ResearchClientProps) {
  const { isClient } = useResearchClient();

  if (!isClient) {
    return null;
  }

  return (
    <ErrorBoundary>
      <DynamicResearchStageManager researchId={id} />
    </ErrorBoundary>
  );
}
