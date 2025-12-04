import React from 'react';

interface LocationConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
  researchTitle?: string;
}

/**
 * Modal de consentimiento para tracking de ubicación
 * Optimizado para visualización en dispositivos móviles
 * @param isOpen - Indica si el modal está abierto
 * @param onAccept - Callback cuando el usuario acepta
 * @param onReject - Callback cuando el usuario rechaza
 * @param onClose - Callback para cerrar el modal sin acción
 * @param researchTitle - Título de la investigación
 */
export const LocationConsentModal: React.FC<LocationConsentModalProps> = ({
  isOpen,
  onAccept,
  onReject,
  onClose,
  researchTitle = 'esta investigación'
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md my-auto">
        {/* Header - Sticky en móvil */}
        <div className="flex items-center justify-between p-3 sm:p-5 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div className="flex items-center">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 sm:mr-2.5 flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Ubicación
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 touch-manipulation"
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-3 sm:p-5 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            Para mejorar la calidad de <strong>{researchTitle}</strong>, nos gustaría obtener tu ubicación aproximada.
          </p>

          {/* Aviso específico para Safari */}
          {/^((?!chrome|android).)*safari/i.test(navigator.userAgent) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 sm:p-3">
              <h3 className="font-medium text-yellow-900 mb-1.5 text-xs sm:text-sm">Usuarios de Safari</h3>
              <ul className="text-xs text-yellow-800 space-y-1">
                <li>• Asegúrate de que Safari tenga permisos de ubicación habilitados</li>
                <li>• Ve a Safari &gt; Preferencias &gt; Privacidad &gt; Servicios de ubicación</li>
                <li>• Si usas HTTPS, la ubicación funcionará mejor</li>
                <li>• Safari puede requerir más tiempo para obtener la ubicación</li>
              </ul>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3">
            <h3 className="font-medium text-blue-900 mb-1.5 text-xs sm:text-sm">¿Qué información recopilamos?</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Coordenadas GPS (latitud y longitud)</li>
              <li>• Precisión de la ubicación</li>
              <li>• Ciudad y país aproximados</li>
              <li>• Dirección IP (como respaldo)</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 sm:p-3">
            <h3 className="font-medium text-green-900 mb-1.5 text-xs sm:text-sm">¿Cómo protegemos tu privacidad?</h3>
            <ul className="text-xs text-green-800 space-y-1">
              <li>• Solo usamos ubicación para análisis de investigación</li>
              <li>• No compartimos datos con terceros</li>
              <li>• Puedes rechazar sin afectar tu participación</li>
              <li>• Cumplimos con GDPR y regulaciones de privacidad</li>
            </ul>
          </div>

          <p className="text-xs text-gray-600">
            Tu participación es completamente voluntaria. Puedes rechazar el tracking de ubicación y continuar con la investigación normalmente.
          </p>
        </div>

        {/* Actions - Sticky en móvil */}
        <div className="p-3 sm:p-5 border-t border-gray-200 bg-white rounded-b-xl sticky bottom-0">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onReject}
              className="flex-1 px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[44px] text-sm"
            >
              Rechazar
            </button>
            <button
              onClick={onAccept}
              className="flex-1 px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation min-h-[44px] text-sm"
            >
              Permitir Ubicación
            </button>
          </div>

          {/* Footer */}
          <div className="mt-3 text-center">
            <a
              href="/privacy"
              className="text-xs text-blue-600 hover:text-blue-800 underline touch-manipulation"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver política de privacidad
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
