import React, { useEffect } from 'react';
import { SuccessScreenProps } from './ThankYouScreenTypes';
import { useBacklinkRedirect } from '../../../hooks/useBacklinkRedirect';

/**
 * Componente para pantalla de éxito (gracias)
 * Redirige automáticamente al backlink de completado si está configurado
 */
export const SuccessScreen: React.FC<SuccessScreenProps> = ({ 
  contentConfiguration,
  eyeTrackingConfig
}) => {
  const { redirectToComplete } = useBacklinkRedirect();
  const hasRedirectedRef = React.useRef(false);

  useEffect(() => {
    // Redirigir automáticamente después de mostrar el mensaje brevemente
    if (eyeTrackingConfig?.backlinks?.complete && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      
      // Esperar 2 segundos para que el usuario vea el mensaje de agradecimiento
      const redirectTimeout = setTimeout(() => {
        redirectToComplete(eyeTrackingConfig);
      }, 2000);

      return () => {
        clearTimeout(redirectTimeout);
      };
    }
  }, [eyeTrackingConfig, redirectToComplete]);

  const title = contentConfiguration?.title || '¡Gracias por tu participación!';
  const message = contentConfiguration?.message;

  return (
    <div className='flex flex-col items-center justify-center h-full gap-6 p-8'>
      <h2 className='text-2xl font-bold text-gray-800 text-center'>
        {title}
      </h2>
      {message && (
        <p className='text-gray-600 text-center max-w-2xl'>
          {message}
        </p>
      )}
      {eyeTrackingConfig?.backlinks?.complete && (
        <p className='text-sm text-gray-500 text-center mt-4'>
          Serás redirigido automáticamente en unos segundos...
        </p>
      )}
    </div>
  );
};
