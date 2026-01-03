import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { researchService, type CreateResearchData, type UpdateResearchData } from '../services/research.service';
import { useToast } from './useToast';
import { requestDeduplicator } from '../utils/requestDeduplication';

/**
 * Query keys para React Query
 */
export const researchKeys = {
    all: ['researches'] as const,
    lists: () => [...researchKeys.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => [...researchKeys.lists(), filters] as const,
    details: () => [...researchKeys.all, 'detail'] as const,
    detail: (id: string) => [...researchKeys.details(), id] as const,
};

/**
 * Hook optimizado para obtener lista de investigaciones
 * Usa React Query para caché y gestión automática de estado
 */
export const useResearches = () => {
    const toast = useToast();

    return useQuery({
        queryKey: researchKeys.list(),
        queryFn: async () => {
            try {
                const response = await researchService.list();
                console.log('[useResearches] API Response:', response);
                return response.researches;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to load researches';
                console.error('Failed to load researches:', error);
                toast.error(errorMessage);
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutos
        gcTime: 10 * 60 * 1000, // 10 minutos
    });
};

/**
 * Hook optimizado para obtener una investigación por ID
 */
export const useResearch = (id: string | null) => {
    const toast = useToast();

    return useQuery({
        queryKey: researchKeys.detail(id || ''),
        queryFn: async () => {
            if (!id) throw new Error('Research ID is required');

            // Deduplicate concurrent requests for the same research ID
            return requestDeduplicator.dedupe(`research-${id}`, async () => {
                console.log('[useResearch] Fetching research:', id);
                try {
                    const response = await researchService.getById(id);
                    console.log('[useResearch] Research loaded:', id);
                    return response.research;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to load research';
                    console.error('[useResearch] Failed to load research:', id, error);
                    toast.error(errorMessage);
                    throw error;
                }
            });
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
};

/**
 * Hook para crear una investigación
 */
export const useCreateResearch = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (data: CreateResearchData) => researchService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: researchKeys.lists() });
            toast.success('Research created successfully');
        },
        onError: (error: Error) => {
            console.error('Failed to create research:', error);
            toast.error('Failed to create research');
        },
    });
};

/**
 * Hook para actualizar una investigación
 */
export const useUpdateResearch = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateResearchData }) =>
            researchService.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: researchKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: researchKeys.lists() });
            toast.success('Research updated successfully');
        },
        onError: (error: Error) => {
            console.error('Failed to update research:', error);
            toast.error('Failed to update research');
        },
    });
};

/**
 * Hook para eliminar una investigación
 */
export const useDeleteResearch = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => researchService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: researchKeys.lists() });
            toast.success('Research deleted successfully');
        },
        onError: (error: Error) => {
            console.error('Failed to delete research:', error);
            toast.error('Failed to delete research');
        },
    });
};

