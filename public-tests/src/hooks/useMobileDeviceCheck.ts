import { useEffect, useState } from 'react';

interface MobileDeviceCheckResult {
  isMobileOrTablet: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  allowMobile: boolean;
  configFound: boolean;
  shouldBlock: boolean;
  isLoading: boolean;
  error: string | null;
}

interface EyeTrackingConfig {
  linkConfig?: {
    allowMobile?: boolean;
    allowMobileDevices?: boolean;
  };
  allowMobile?: boolean;
  allowMobileDevices?: boolean;
}

/**
 * Hook para verificar si el dispositivo móvil debe ser bloqueado
 * basado en la configuración de la investigación
 */
export const useMobileDeviceCheck = (
  researchId: string | null,
  eyeTrackingConfig: EyeTrackingConfig | null
): MobileDeviceCheckResult => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detectar tipo de dispositivo
  const detectDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad|phone|blackberry|opera mini|windows phone/i.test(userAgent);
    const isTablet = /tablet|ipad|android(?=.*\b(?!.*mobile))/i.test(userAgent);

    if (isMobile && !isTablet) return 'mobile';
    if (isTablet) return 'tablet';
    return 'desktop';
  };

  // Obtener configuración de dispositivos móviles
  const getMobileConfig = (config: EyeTrackingConfig | null) => {
    if (!config) {
      return { allowMobile: true, configFound: false };
    }

    // Buscar en diferentes ubicaciones posibles de la configuración
    const possiblePaths = [
      config.linkConfig?.allowMobile,
      config.linkConfig?.allowMobileDevices,
      config.allowMobile,
      config.allowMobileDevices
    ];

    // Encontrar el primer valor definido (no undefined)
    const allowMobile = possiblePaths.find(value => value !== undefined);

    return {
      allowMobile: allowMobile !== undefined ? Boolean(allowMobile) : true,
      configFound: allowMobile !== undefined
    };
  };

  useEffect(() => {
    try {
      setIsLoading(true);
      setError(null);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('[useMobileDeviceCheck] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [researchId, eyeTrackingConfig]);

  const deviceType = detectDeviceType();
  const isMobileOrTablet = deviceType === 'mobile' || deviceType === 'tablet';
  const mobileConfig = getMobileConfig(eyeTrackingConfig);
  const shouldBlock = !isLoading && isMobileOrTablet && !mobileConfig.allowMobile;

  return {
    isMobileOrTablet,
    deviceType,
    allowMobile: mobileConfig.allowMobile,
    configFound: mobileConfig.configFound,
    shouldBlock,
    isLoading,
    error
  };
};
