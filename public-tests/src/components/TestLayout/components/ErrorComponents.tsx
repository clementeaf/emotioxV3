import React from 'react';

/**
 * Componente para renderizar pasos desconocidos o con errores
 */
export const UnknownStepComponent: React.FC<{ data: unknown }> = ({ data }) => (
  <div className='flex flex-col items-center justify-center h-full gap-10'>
    <h2 className='text-2xl font-bold'>Componente desconocido</h2>
    <p>No se pudo renderizar este tipo de componente</p>
    <pre className='text-sm text-gray-500'>{JSON.stringify(data, null, 2)}</pre>
  </div>
);

/**
 * Componente para mostrar errores de carga
 */
export const ErrorComponent: React.FC<{ error: string; onRetry?: () => void }> = ({ 
  error, 
  onRetry 
}) => (
  <div className='flex flex-col items-center justify-center h-full gap-6'>
    <div className='text-center'>
      <h2 className='text-2xl font-bold text-red-600 mb-4'>Error</h2>
      <p className='text-gray-600 mb-6'>{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className='px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors'
        >
          Reintentar
        </button>
      )}
    </div>
  </div>
);

/**
 * Componente para mostrar estados de carga
 */
export const LoadingComponent: React.FC<{ message?: string }> = ({ 
  message = 'Cargando...' 
}) => (
  <div className='flex flex-col items-center justify-center h-full gap-6'>
    <div className='text-center'>
      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
      <p className='text-gray-600'>{message}</p>
    </div>
  </div>
);
