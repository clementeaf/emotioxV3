import { memo } from 'react';

import { ResearchConfirmation } from '@/components/research/research-management/ResearchConfirmation';

import { SuccessSectionProps } from '@shared/interfaces/research-creation.interface';

/**
 * Sección de investigación exitosa
 */
export const SuccessSection = memo<SuccessSectionProps>(({ id, name, onClose }) => (
  <div className="space-y-6">
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-neutral-900">
        Investigación Creada
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Tu investigación ha sido creada exitosamente
      </p>
    </div>

    <ResearchConfirmation
      researchId={id}
      researchName={name}
      onClose={onClose}
    />
  </div>
));

SuccessSection.displayName = 'SuccessSection';
