import { memo } from 'react';

import { ErrorSectionProps } from '@shared/interfaces/research-creation.interface';

/**
 * Sección de error para pasos no válidos
 */
export const ErrorSection = memo<ErrorSectionProps>(({ onNavigateToStart }) => (
  <div className="p-6 bg-red-50 rounded-lg border border-red-200">
    <h2 className="text-xl font-medium text-red-800 mb-2">Paso no válido</h2>
    <p className="text-red-700">
      El paso especificado no es válido. Por favor, regresa al
      <button
        onClick={onNavigateToStart}
        className="ml-1 text-red-800 underline hover:text-red-900"
      >
        inicio del proceso
      </button>.
    </p>
  </div>
));

ErrorSection.displayName = 'ErrorSection';
