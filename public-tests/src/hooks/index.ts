/**
 * 🧪 HOOKS SIMPLIFICADOS PARA TEST DE PARTICIPANTE
 *
 * Este archivo exporta solo los hooks necesarios para el test,
 * sin lógica de backend.
 */

export { useDeleteState } from './useDeleteState';
export { useSidebarLogic } from './useSidebarLogic';
export { useStepStoreWithBackend } from './useStepStoreWithBackend';

// Mobile device detection
export { useEyeTrackingConfigQuery } from './useEyeTrackingConfigQuery';
export { useMobileDeviceCheck } from './useMobileDeviceCheck';
export { useMobileStepVerification } from './useMobileStepVerification';

// Location tracking
export { useLocationTracking } from './useLocationTracking';

// Quota verification
export { useQuotaVerification } from './useQuotaVerification';

// Tipos y utilidades
export * from './types';
export { useResponseTiming } from './useResponseTiming';
export { useUserJourneyTracking } from './useUserJourneyTracking';
export * from './utils';
