import { useEffect, useRef } from 'react';
import { useSaveModuleResponseMutation } from '../../../hooks/useApiQueries';
import { getDeviceInfo, getLocationInfo } from '../../../utils/deviceUtils';
import { UseThankYouScreenProps } from './ThankYouScreenTypes';

/**
 * Hook para manejar la lógica de API del ThankYouScreen
 */
export const useThankYouScreen = ({
  currentQuestionKey,
  researchId,
  participantId,
  eyeTrackingConfig
}: UseThankYouScreenProps) => {
  const saveModuleResponseMutation = useSaveModuleResponseMutation();
  const hasSentRef = useRef(false);

  useEffect(() => {
    // Solo ejecutar una vez cuando se llega a thank_you_screen
    if (currentQuestionKey === 'thank_you_screen' && researchId && participantId && !hasSentRef.current) {
      hasSentRef.current = true;
      
      const sendToAPI = async () => {
        try {
          const timestamp = new Date().toISOString();
          
          // Obtener información del dispositivo
          let deviceInfo = null;
          if (eyeTrackingConfig?.parameterOptions?.saveDeviceInfo) {
            deviceInfo = getDeviceInfo();
          }

          // Obtener información de ubicación
          let location = null;
          if (eyeTrackingConfig?.parameterOptions?.saveLocationInfo) {
            location = await getLocationInfo();
          }

          const createData = {
            researchId,
            participantId,
            questionKey: currentQuestionKey,
            responses: [{
              questionKey: currentQuestionKey,
              response: { visited: true },
              timestamp,
              createdAt: timestamp,
              ...(deviceInfo && { deviceInfo }),
              ...(location && { location })
            }],
            metadata: {}
          };

          await saveModuleResponseMutation.mutateAsync(createData);
        } catch (error) {
          // Error saving device info - fail silently
          console.error('[ThankYouScreen] Error al enviar datos:', error);
        }
      };

      sendToAPI();
    }
    
    // Reset el ref si se sale de thank_you_screen
    if (currentQuestionKey !== 'thank_you_screen') {
      hasSentRef.current = false;
    }
  }, [
    currentQuestionKey, 
    researchId, 
    participantId, 
    eyeTrackingConfig?.parameterOptions?.saveDeviceInfo, 
    eyeTrackingConfig?.parameterOptions?.saveLocationInfo,
    saveModuleResponseMutation
  ]);

  return {
    saveModuleResponseMutation
  };
};
