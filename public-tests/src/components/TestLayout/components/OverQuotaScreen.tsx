import React, { useEffect } from 'react';
import { OverQuotaScreenProps } from './ThankYouScreenTypes';
import { useBacklinkRedirect } from '../../../hooks/useBacklinkRedirect';

/**
 * Componente para pantalla de cuota alcanzada
 * Redirige automáticamente al backlink de sobre cuota si está configurado
 */
export const OverQuotaScreen: React.FC<OverQuotaScreenProps> = ({ 
  quotaResult, 
  eyeTrackingConfig 
}) => {
  const { redirectToOverquota } = useBacklinkRedirect();
  const hasRedirectedRef = React.useRef(false);

  useEffect(() => {
    // Redirigir automáticamente después de mostrar el mensaje brevemente
    if (eyeTrackingConfig?.backlinks?.overquota && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      
      // Esperar 3 segundos para que el usuario vea el mensaje
      const redirectTimeout = setTimeout(() => {
        redirectToOverquota(eyeTrackingConfig);
      }, 3000);

      return () => {
        clearTimeout(redirectTimeout);
      };
    }
  }, [eyeTrackingConfig, redirectToOverquota]);

  const hasSpecificQuotaInfo = quotaResult && 
    quotaResult.demographicType && 
    quotaResult.demographicValue;

  return (
    <div className='flex flex-col items-center justify-center h-full w-full'>
      <div className="text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        {hasSpecificQuotaInfo ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Cuota alcanzada para {quotaResult.demographicType}
            </h2>
            <p className="text-gray-600 mb-4">
              Lamentamos informarte que ya se ha alcanzado el límite máximo de participantes
              para el criterio: <strong>{quotaResult.demographicType}</strong> con valor <strong>{quotaResult.demographicValue}</strong>.
            </p>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 mb-4">
              <p className="text-sm text-orange-800">
                <strong>Límite configurado:</strong> {quotaResult.quotaLimit} participantes
              </p>
              <p className="text-sm text-orange-800">
                <strong>Participantes actuales:</strong> {quotaResult.order}
              </p>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Cuota de participantes alcanzada
            </h2>
            <p className="text-gray-600 mb-6">
              Lamentamos informarte que ya se ha alcanzado el límite máximo de participantes para esta investigación.
            </p>
          </>
        )}
        
        {eyeTrackingConfig.backlinks?.overquota ? (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Información adicional
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Serás redirigido automáticamente en unos segundos...
            </p>
            <a
              href={eyeTrackingConfig.backlinks.overquota}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ir ahora
            </a>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Información adicional
            </h3>
            <p className="text-sm text-gray-600">
              Gracias por tu interés en participar. Puedes cerrar esta ventana cuando desees.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
