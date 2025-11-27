import { memo } from 'react';

import { ResearchStageManager } from '@/components/research/research-management/ResearchStageManager';

import { StagesSectionProps } from '../../../../../shared/interfaces/research-creation.interface';

/**
 * Sección de configuración de etapas
 */
export const StagesSection = memo<StagesSectionProps>(({ id }) => (
  <div className="space-y-6">
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-neutral-900">
        Configurar Etapas
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Configura las etapas de tu investigación
      </p>
    </div>

    <ResearchStageManager researchId={id} />
  </div>
));

StagesSection.displayName = 'StagesSection';
