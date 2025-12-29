import { memo } from 'react';

import { CreateResearchFormOptimized as CreateResearchForm } from '@/components/research/research-management/CreateResearchFormOptimized';

import { CreateSectionProps } from '@shared/interfaces/research-creation.interface';

/**
 * Sección de creación de investigación
 */
export const CreateSection = memo<CreateSectionProps>(({ onResearchCreated }) => (
  <>
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-neutral-900">
        Nueva Investigación
      </h1>
    </div>

    <CreateResearchForm onResearchCreated={onResearchCreated} />
  </>
));

CreateSection.displayName = 'CreateSection';
