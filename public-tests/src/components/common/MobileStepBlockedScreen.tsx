import React from 'react';

interface MobileStepBlockedScreenProps {
  deviceType: 'mobile' | 'tablet';
  researchId?: string;
  currentStep?: string;
}

export const MobileStepBlockedScreen: React.FC<MobileStepBlockedScreenProps> = ({
  deviceType,
  researchId,
  currentStep
}) => {
  const deviceName = deviceType === 'mobile' ? 'celular' : 'tablet';

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gray-50 z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md mx-4 text-center">
        <div className="mb-4 flex justify-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-3">
          Acceso Restringido
        </h1>

        <div className="space-y-3 mb-4">
          <p className="text-gray-700 leading-relaxed text-sm">
            Esta investigación no puede ser realizada desde {deviceName}s, solo desde laptop o computador de escritorio.
          </p>

          <p className="text-xs text-gray-600">
            Por favor, accede desde un computador de escritorio o laptop para continuar con la investigación.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <h3 className="text-xs font-medium text-blue-900 mb-1.5">
            ¿Por qué no puedo usar mi {deviceName}?
          </h3>
          <p className="text-xs text-blue-700">
            Esta investigación requiere características específicas que solo están disponibles en computadores de escritorio, como pantallas más grandes, funcionalidades especializadas o precisión en las respuestas.
          </p>
        </div>

        {currentStep && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <h3 className="text-xs font-medium text-yellow-900 mb-1.5">
              Paso Actual
            </h3>
            <p className="text-xs text-yellow-700">
              Estabas en: <span className="font-medium">{currentStep}</span>
            </p>
          </div>
        )}

        {researchId && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              ID de Investigación: <span className="font-mono">{researchId}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
