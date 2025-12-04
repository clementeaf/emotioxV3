import { useCallback } from 'react';
import { EyeTrackingConfig } from './useEyeTrackingConfigQuery';
import { useBacklinkRedirect } from './useBacklinkRedirect';

/**
 * Hook para redirección de descalificación
 * Usa el hook genérico useBacklinkRedirect internamente
 * Mantiene compatibilidad con código existente
 */
export const useDisqualificationRedirect = () => {
  const { redirectToDisqualified } = useBacklinkRedirect();

  const redirectToDisqualification = useCallback((
    eyeTrackingConfig: EyeTrackingConfig | undefined,
    reason?: string
  ) => {
    // Usar el hook genérico que maneja todos los fallbacks
    redirectToDisqualified(eyeTrackingConfig, reason);
  }, [redirectToDisqualified]);

  return { redirectToDisqualification };
};
