import { useEffect, useState } from 'react';
import { useEyeTrackingConfigQuery } from './useEyeTrackingConfigQuery';
import { useMobileDeviceCheck } from './useMobileDeviceCheck';

interface MobileStepVerificationResult {
  isBlocked: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  allowMobile: boolean;
  configFound: boolean;
  isLoading: boolean;
  error: string | null;
  shouldShowBlockScreen: boolean;
}

/**
 * Hook para verificar si el dispositivo móvil está permitido en los steps del test
 * Se ejecuta en cada step para asegurar que el bloqueo sea consistente
 */
export const useMobileStepVerification = (
  researchId: string | null
): MobileStepVerificationResult => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [shouldShowBlockScreen, setShouldShowBlockScreen] = useState(false);

  // Obtener configuración de eye-tracking
  const {
    data: eyeTrackingConfig,
    isLoading: isLoadingConfig,
    error: configError
  } = useEyeTrackingConfigQuery(researchId || '');

  // Verificar dispositivo móvil
  const {
    isMobileOrTablet,
    deviceType,
    allowMobile,
    configFound,
    shouldBlock,
    isLoading: isLoadingMobileCheck,
    error: mobileCheckError
  } = useMobileDeviceCheck(researchId, eyeTrackingConfig || null);

  // Determinar si debe bloquear
  useEffect(() => {
    if (!isLoadingConfig && !isLoadingMobileCheck) {
      const blocked = shouldBlock && isMobileOrTablet;
      setIsBlocked(blocked);
      setShouldShowBlockScreen(blocked);

      // Estado de verificación logging removido
    }
  }, [
    researchId,
    deviceType,
    isMobileOrTablet,
    allowMobile,
    configFound,
    shouldBlock,
    isLoadingConfig,
    isLoadingMobileCheck
  ]);

  // Manejar errores
  const error = configError?.message || mobileCheckError;

  return {
    isBlocked,
    deviceType,
    allowMobile,
    configFound,
    isLoading: isLoadingConfig || isLoadingMobileCheck,
    error,
    shouldShowBlockScreen
  };
};
