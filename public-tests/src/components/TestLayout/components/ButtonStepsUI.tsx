import React from 'react';

interface ButtonStepsUIProps {
  buttonText: string;
  isDisabled: boolean;
  onClick: () => void;
  isLoading?: boolean;
}

/**
 * Componente UI para el botón de navegación entre steps
 * @param buttonText - Texto del botón
 * @param isDisabled - Si el botón está deshabilitado
 * @param onClick - Función a ejecutar al hacer clic
 * @param isLoading - Si está en estado de carga
 */
export const ButtonStepsUI: React.FC<ButtonStepsUIProps> = ({
  buttonText,
  isDisabled,
  onClick,
  isLoading = false
}) => {
  return (
    <div className="flex justify-center mt-8">
      <button
        onClick={onClick}
        disabled={isDisabled || isLoading}
        className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
          isDisabled || isLoading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }`}
      >
        {isLoading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        )}
        <span>{buttonText}</span>
      </button>
    </div>
  );
};
