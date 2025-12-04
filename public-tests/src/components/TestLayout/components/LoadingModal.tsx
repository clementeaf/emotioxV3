import React from 'react';

interface LoadingModalProps {
  title?: string;
  message?: string;
  showSpinner?: boolean;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  title = 'Cargando respuestas...',
  message = 'Recuperando tus datos del servidor',
  showSpinner = true
}) => {
  return (
    <div className='flex flex-col items-center justify-center h-full gap-6'>
      <div className='text-center'>
        {showSpinner && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        )}
        <h3 className='text-lg font-semibold mb-2'>{title}</h3>
        <p className='text-sm text-gray-600'>{message}</p>
      </div>
    </div>
  );
};
