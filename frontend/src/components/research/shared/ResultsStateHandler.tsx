/**
 * Componente compartido para manejar estados de carga y error en componentes de resultados
 */

import React from 'react';

interface ResultsStateHandlerProps {
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  loadingSkeleton?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Maneja estados de carga y error de forma consistente
 * @param props - Propiedades del componente
 * @returns Componente renderizado según el estado
 */
export function ResultsStateHandler({
  isLoading,
  error,
  onRetry,
  loadingSkeleton,
  children
}: ResultsStateHandlerProps): React.ReactElement {
  if (isLoading) {
    if (loadingSkeleton) {
      return <>{loadingSkeleton}</>;
    }
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error al cargar resultados
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            No se pudieron cargar los datos. Por favor, intenta nuevamente.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
