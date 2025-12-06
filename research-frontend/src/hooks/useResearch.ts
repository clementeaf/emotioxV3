import { useResearch as useResearchQuery } from './useResearchQuery';

/**
 * Hook personalizado para cargar y gestionar datos de un research
 * Ahora usa React Query para caché y optimización
 * @deprecated Use useResearchQuery directly from useResearchQuery
 */
export const useResearch = (researchId: string | undefined) => {
    const { data: research, isLoading: loading, error, refetch } = useResearchQuery(researchId || null);

    return {
        research: research || null,
        loading,
        error: error ? (error instanceof Error ? error.message : 'Failed to load research') : '',
        refetch: async () => {
            await refetch();
        },
    };
};
