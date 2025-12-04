import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/alova';

export interface EyeTrackingConfig {
  id: string;
  researchId: string;
  linkConfig: {
    allowMobile: boolean;
    trackLocation: boolean;
    allowMultipleAttempts: boolean;
    showProgressBar: boolean; // 🎯 NUEVO
  };
  parameterOptions: {
    saveDeviceInfo: boolean;
    saveLocationInfo: boolean;
    saveResponseTimes: boolean;
    saveUserJourney: boolean;
  };
  participantLimit: {
    enabled: boolean;
    value: number;
  };
  demographicQuestions: Record<string, unknown>;
  backlinks: {
    complete: string;
    disqualified: string;
    overquota: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function useEyeTrackingConfigQuery(researchId: string) {
  return useQuery({
    queryKey: ['eyeTrackingConfig', researchId],
    queryFn: async (): Promise<EyeTrackingConfig | null> => {
      if (!researchId) {
        return null;
      }

      try {
        // 🎯 CORREGIR: Usar el endpoint correcto
        const data = await apiRequest<EyeTrackingConfig>(
          `/research/${researchId}/eye-tracking`,
          { method: 'GET' }
        );
        return data;
      } catch {
        return null;
      }
    },
    enabled: !!researchId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });
}
