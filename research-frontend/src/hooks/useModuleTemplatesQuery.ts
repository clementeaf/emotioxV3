import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moduleTemplatesService } from '../services/moduleTemplates.service';
import { useToast } from './useToast';
import { requestDeduplicator } from '../utils/requestDeduplication';

interface UseModuleTemplatesOptions {
    enabled?: boolean;
}

/**
 * Query keys para React Query
 */
export const moduleTemplateKeys = {
    all: ['module-templates'] as const,
    lists: () => [...moduleTemplateKeys.all, 'list'] as const,
    list: () => [...moduleTemplateKeys.lists()] as const,
    details: () => [...moduleTemplateKeys.all, 'detail'] as const,
    detail: (id: string) => [...moduleTemplateKeys.details(), id] as const,
    usage: (id: string) => [...moduleTemplateKeys.all, 'usage', id] as const,
};

/**
 * Hook para obtener lista de module templates con caché
 */
export const useModuleTemplates = (options?: UseModuleTemplatesOptions) => {
    const toast = useToast();

    return useQuery({
        queryKey: moduleTemplateKeys.list(),
        queryFn: async () => {
            return requestDeduplicator.dedupe('module-templates-list', async () => {
                try {
                    return await moduleTemplatesService.list();
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to load module templates';
                    console.error('Failed to load module templates:', error);
                    toast.error(errorMessage);
                    throw error;
                }
            });
        },
        enabled: options?.enabled ?? true,
        staleTime: 5 * 60 * 1000, // 5 minutos
        gcTime: 10 * 60 * 1000, // 10 minutos
    });
};

/**
 * Hook para obtener un module template por ID
 */
export const useModuleTemplate = (id: string | null) => {
    const toast = useToast();

    return useQuery({
        queryKey: moduleTemplateKeys.detail(id || ''),
        queryFn: async () => {
            if (!id) throw new Error('Module template ID is required');
            
            return requestDeduplicator.dedupe(`module-template-${id}`, async () => {
                try {
                    return await moduleTemplatesService.getById(id);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to load module template';
                    console.error('Failed to load module template:', error);
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
 * Hook para obtener el usage de un module template
 */
export const useModuleTemplateUsage = (id: string | null) => {
    return useQuery({
        queryKey: moduleTemplateKeys.usage(id || ''),
        queryFn: async () => {
            if (!id) throw new Error('Module template ID is required');
            try {
                return await moduleTemplatesService.getUsage(id);
            } catch (error) {
                // Silently fail - backend endpoint might not be ready yet
                console.warn('Failed to load module usage:', error);
                return null;
            }
        },
        enabled: !!id,
        staleTime: 2 * 60 * 1000, // 2 minutos (más corto para usage)
        gcTime: 5 * 60 * 1000,
        retry: false, // No retry for usage
    });
};

/**
 * Hook para eliminar un module template
 */
export const useDeleteModuleTemplate = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    return useMutation({
        mutationFn: (id: string) => moduleTemplatesService.delete(id),
        onSuccess: () => {
            // Invalidar solo la lista, no todo
            queryClient.invalidateQueries({ queryKey: moduleTemplateKeys.lists() });
            toast.success('Module template deleted successfully');
        },
        onError: (error: Error) => {
            console.error('Failed to delete module template:', error);
            toast.error(error.message || 'Failed to delete module template');
        },
    });
};
