import React from 'react';

interface GlobalLoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

/**
 * Overlay global de carga para mostrar durante transiciones
 * @param isVisible - Si el overlay debe ser visible
 * @param message - Mensaje opcional a mostrar
 */
export const GlobalLoadingOverlay: React.FC<GlobalLoadingOverlayProps> = ({
  isVisible,
  message = 'Cargando...'
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-gray-700 font-medium text-lg">{message}</p>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default GlobalLoadingOverlay;

