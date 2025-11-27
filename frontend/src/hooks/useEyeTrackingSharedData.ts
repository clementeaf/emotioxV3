import { eyeTrackingApi } from '@/api/domains/eye-tracking';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook centralizado para compartir datos de eye-tracking entre componentes
 * Evita llamadas duplicadas usando React Query con caching optimizado
 */
export const useEyeTrackingSharedData = (researchId: string, options?: {
  enabled?: boolean;
  type?: 'build' | 'recruit' | 'both';
}) => {
  const type = options?.type || 'recruit'; // Optimized: default to recruit only for performance

  // Query para configuración de build con caching optimizado
  const buildQuery = useQuery({
    queryKey: ['eyeTracking', 'build', 'shared', researchId],
    queryFn: async () => {
      if (!researchId) return null;
      try {
        const response = await eyeTrackingApi.build.getByResearchId(researchId);
        return response || null;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.message?.includes('not found')) {
          return null;
        }
        throw error;
      }
    },
    enabled: (type === 'build' || type === 'both') && options?.enabled !== false && !!researchId,
    staleTime: 10 * 60 * 1000, // 10 minutos - datos que no cambian frecuentemente
    gcTime: 60 * 60 * 1000, // 1 hora - mantener en cache más tiempo
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false, // No reintentar en caso de error
  });

  // Query para configuración de recruit con caching optimizado
  const recruitQuery = useQuery({
    queryKey: ['eyeTracking', 'recruit', 'shared', researchId],
    queryFn: async () => {
      if (!researchId) return null;
      try {
        const response = await eyeTrackingApi.recruit.getConfigByResearch(researchId);
        return response || null;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.message?.includes('not found')) {
          return null;
        }
        throw error;
      }
    },
    enabled: (type === 'recruit' || type === 'both') && options?.enabled !== false && !!researchId,
    staleTime: 5 * 60 * 1000, // 5 minutos - reducido para mayor frescura de datos
    gcTime: 30 * 60 * 1000, // 30 minutos - reducido
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Cambio: refetch cuando se monta para asegurar datos frescos
    refetchOnReconnect: false,
    retry: false, // No reintentar en caso de error
  });

  return {
    // Datos combinados
    data: type === 'both' ? {
      build: buildQuery.data,
      recruit: recruitQuery.data
    } : type === 'build' ? buildQuery.data : recruitQuery.data,

    // Estados de carga
    isLoading: buildQuery.isLoading || recruitQuery.isLoading,
    isLoadingBuild: buildQuery.isLoading,
    isLoadingRecruit: recruitQuery.isLoading,

    // Estados de error
    error: buildQuery.error || recruitQuery.error,
    errorBuild: buildQuery.error,
    errorRecruit: recruitQuery.error,

    // Métodos de refetch
    refetch: () => {
      buildQuery.refetch();
      recruitQuery.refetch();
    },
    refetchBuild: buildQuery.refetch,
    refetchRecruit: recruitQuery.refetch,
  };
};
