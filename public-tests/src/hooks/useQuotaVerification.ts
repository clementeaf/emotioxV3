import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiRequest } from '../lib/alova';

export interface QuotaVerificationResponse {
  isExceeded: boolean;
  currentCount: number;
  limit: number;
  researchId: string;
  // 🎯 NUEVO: Información específica de cuotas dinámicas
  demographicType?: string;
  demographicValue?: string;
  reason?: string;
}

export interface QuotaVerificationParams {
  researchId: string;
  participantId: string;
  // 🎯 NUEVO: Demográficos para validación dinámica
  demographics?: {
    age?: string;
    country?: string;
    gender?: string;
    educationLevel?: string;
    householdIncome?: string;
    employmentStatus?: string;
    dailyHoursOnline?: string;
    technicalProficiency?: string;
  };
}

/**
 * Hook para verificar si el usuario excede la cuota de participantes
 * 🎯 NUEVO: Soporta tanto el sistema actual como el nuevo sistema de cuotas dinámicas
 */
export const useQuotaVerification = (
  params: QuotaVerificationParams,
  options?: UseQueryOptions<QuotaVerificationResponse, Error>
) => {
  return useQuery<QuotaVerificationResponse, Error>({
    queryKey: ['quotaVerification', params.researchId, params.participantId, params.demographics],
    queryFn: async () => {
      try {
        // 🎯 NUEVO: Si hay demográficos, usar el nuevo sistema de cuotas dinámicas
        if (params.demographics) {
          try {
            const data = await apiRequest<{
              isValid: boolean;
              quotaInfo?: {
                currentCount?: number;
                maxQuota?: number;
                demographicType?: string;
                demographicValue?: string;
              };
              reason?: string;
            }>('/quota-validation/validate', {
              method: 'POST',
              data: {
                researchId: params.researchId,
                demographics: params.demographics
              }
            });

            // 🎯 CONVERTIR RESPUESTA DEL NUEVO SISTEMA AL FORMATO COMPATIBLE
            return {
              isExceeded: !data.isValid,
              currentCount: data.quotaInfo?.currentCount || 0,
              limit: data.quotaInfo?.maxQuota || 999,
              researchId: params.researchId,
              demographicType: data.quotaInfo?.demographicType,
              demographicValue: data.quotaInfo?.demographicValue,
              reason: data.reason
            };
          } catch {
            // Fallback al sistema actual
            return await checkLegacyQuota(params);
          }
        }

        // 🎯 SISTEMA ACTUAL: Consultar el estado de cuota desde el backend
        return await checkLegacyQuota(params);

      } catch (error) {
        // En caso de error, asumir que no excede la cuota
        return {
          isExceeded: false,
          currentCount: 0,
          limit: 999,
          researchId: params.researchId
        };
      }
    },
    enabled: !!params.researchId && !!params.participantId,
    staleTime: 1000 * 60 * 1, // 1 minuto
    gcTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 1000,
    ...options,
  });
};

/**
 * 🎯 FUNCIÓN AUXILIAR: Verificar cuota usando el sistema actual
 */
async function checkLegacyQuota(params: QuotaVerificationParams): Promise<QuotaVerificationResponse> {
  try {
    const data = await apiRequest<QuotaVerificationResponse>(
      `/research/${params.researchId}/participants/${params.participantId}/quota-status`,
      { method: 'GET' }
    );
    return data;
  } catch {
    // Si el endpoint no existe, asumir que no excede la cuota
    return {
      isExceeded: false,
      currentCount: 0,
      limit: 999,
      researchId: params.researchId
    };
  }
}
