import React from 'react';

interface MobileBlockedScreenProps {
  deviceType: 'mobile' | 'tablet';
  researchId?: string;
}

export const MobileBlockedScreen: React.FC<MobileBlockedScreenProps> = ({
  deviceType,
  researchId
}) => {
  const deviceName = deviceType === 'mobile' ? 'dispositivo móvil' : 'tablet';

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-gray-50 z-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md mx-4 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
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

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Acceso No Permitido
        </h1>

        <div className="space-y-4 mb-6">
          <p className="text-gray-700 leading-relaxed">
            Esta investigación no permite el acceso desde un {deviceName}.
          </p>

          <p className="text-sm text-gray-600">
            Por favor, accede desde un computador de escritorio o laptop para participar en esta investigación.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            ¿Por qué no puedo usar mi {deviceName}?
          </h3>
          <p className="text-sm text-blue-700">
            Esta investigación requiere características específicas que solo están disponibles en computadores de escritorio, como pantallas más grandes o funcionalidades especializadas.
          </p>
        </div>

        {researchId && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              ID de Investigación: <span className="font-mono">{researchId}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
