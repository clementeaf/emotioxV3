import { useQuery } from '@tanstack/react-query';
import { researchTypesService } from '../services/researchTypes.service';
import { useToast } from './useToast';

/**
 * Query keys para Research Types
 */
export const researchTypesKeys = {
    all: ['researchTypes'] as const,
    lists: () => [...researchTypesKeys.all, 'list'] as const,
    list: () => [...researchTypesKeys.lists()] as const,
};

/**
 * Hook optimizado para obtener lista de tipos de investigación
 */
export const useResearchTypes = () => {
    const toast = useToast();

    return useQuery({
        queryKey: researchTypesKeys.list(),
        queryFn: async () => {
            try {
                const response = await researchTypesService.list();
                return response.researchTypes;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Failed to load research types';
                console.error('Failed to load research types:', error);
                toast.error(errorMessage);
                throw error;
            }
        },
        staleTime: 10 * 60 * 1000, // 10 minutos (cambian menos frecuentemente)
        gcTime: 30 * 60 * 1000, // 30 minutos
    });
};

