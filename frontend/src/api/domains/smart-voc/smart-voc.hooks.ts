/**
 * Smart VOC Domain Hooks
 * TanStack Query hooks for smart VOC functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { smartVocApi } from './smart-voc.api';
import type {
  SmartVOCFormData,
  CreateSmartVOCRequest,
  UpdateSmartVOCRequest
} from './smart-voc.types';

/**
 * Query keys for smart VOC
 */
export const smartVocKeys = {
  all: ['smartVOC'] as const,
  byResearch: (researchId: string) => [...smartVocKeys.all, 'research', researchId] as const,
  validation: (researchId: string) => [...smartVocKeys.all, 'validation', researchId] as const,
};

/**
 * Hook to get smart VOC data by research ID
 */
export function useSmartVOCData(researchId: string | null) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: smartVocKeys.byResearch(researchId || ''),
    queryFn: () => researchId ? smartVocApi.getByResearchId(researchId) : Promise.resolve(null),
    enabled: !!researchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (antes cacheTime)
    refetchOnWindowFocus: false, // No refetch cuando la ventana recibe foco
    refetchOnMount: false, // No refetch si ya hay datos en caché
    retry: 1 // Solo reintentar una vez en caso de error
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateSmartVOCRequest) => smartVocApi.create(data),
    onMutate: async (newSmartVOC) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: smartVocKeys.byResearch(newSmartVOC.researchId) });

      // Snapshot previous value
      const previousSmartVOC = queryClient.getQueryData<SmartVOCFormData | null>(
        smartVocKeys.byResearch(newSmartVOC.researchId)
      );

      // Optimistically update
      const optimisticSmartVOC: SmartVOCFormData = {
        researchId: newSmartVOC.researchId,
        questions: newSmartVOC.questions || [],
        randomizeQuestions: newSmartVOC.randomizeQuestions || false,
        smartVocRequired: newSmartVOC.smartVocRequired || false,
        metadata: {
          ...newSmartVOC.metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      queryClient.setQueryData(
        smartVocKeys.byResearch(newSmartVOC.researchId),
        optimisticSmartVOC
      );

      return { previousSmartVOC };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: smartVocKeys.byResearch(variables.researchId) });
      toast.success('Smart VOC creado exitosamente');
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousSmartVOC !== undefined) {
        queryClient.setQueryData(
          smartVocKeys.byResearch(variables.researchId),
          context.previousSmartVOC
        );
      }

      toast.error(error.response?.data?.message || 'Error al crear Smart VOC');
    },
    onSettled: (_, __, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: smartVocKeys.byResearch(variables.researchId) });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ researchId, data }: { researchId: string; data: UpdateSmartVOCRequest }) =>
      smartVocApi.update(researchId, data),
    onMutate: async ({ researchId, data }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: smartVocKeys.byResearch(researchId) });

      // Snapshot previous value
      const previousSmartVOC = queryClient.getQueryData<SmartVOCFormData | null>(
        smartVocKeys.byResearch(researchId)
      );

      // Optimistically update
      if (previousSmartVOC) {
        const optimisticSmartVOC: SmartVOCFormData = {
          ...previousSmartVOC,
          questions: data.questions || previousSmartVOC.questions,
          randomizeQuestions: data.randomizeQuestions ?? previousSmartVOC.randomizeQuestions,
          smartVocRequired: data.smartVocRequired ?? previousSmartVOC.smartVocRequired,
          metadata: {
            ...previousSmartVOC.metadata,
            ...data.metadata,
            updatedAt: new Date().toISOString(),
          },
        };

        queryClient.setQueryData(
          smartVocKeys.byResearch(researchId),
          optimisticSmartVOC
        );
      }

      return { previousSmartVOC };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: smartVocKeys.byResearch(variables.researchId) });
      toast.success('Smart VOC actualizado exitosamente');
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousSmartVOC !== undefined) {
        queryClient.setQueryData(
          smartVocKeys.byResearch(variables.researchId),
          context.previousSmartVOC
        );
      }

      toast.error(error.response?.data?.message || 'Error al actualizar Smart VOC');
    },
    onSettled: (_, __, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: smartVocKeys.byResearch(variables.researchId) });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (researchId: string) => smartVocApi.delete(researchId),
    onMutate: async (researchId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: smartVocKeys.byResearch(researchId) });

      // Snapshot previous value
      const previousSmartVOC = queryClient.getQueryData<SmartVOCFormData | null>(
        smartVocKeys.byResearch(researchId)
      );

      // Optimistically update (set to null to indicate deletion)
      queryClient.setQueryData(
        smartVocKeys.byResearch(researchId),
        null
      );

      return { previousSmartVOC };
    },
    onSuccess: (_, researchId) => {
      queryClient.invalidateQueries({ queryKey: smartVocKeys.byResearch(researchId) });
      toast.success('Smart VOC eliminado exitosamente');
    },
    onError: (error: any, researchId, context) => {
      // Rollback on error
      if (context?.previousSmartVOC !== undefined) {
        queryClient.setQueryData(
          smartVocKeys.byResearch(researchId),
          context.previousSmartVOC
        );
      }

      toast.error(error.response?.data?.message || 'Error al eliminar Smart VOC');
    },
    onSettled: (_, __, researchId) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: smartVocKeys.byResearch(researchId) });
    }
  });

  // Wrapper functions for easier use
  const createSmartVOC = async (data: SmartVOCFormData): Promise<SmartVOCFormData> => {
    if (!researchId) throw new Error('Research ID is required');

    const createData: CreateSmartVOCRequest = {
      ...data,
      researchId
    };

    return createMutation.mutateAsync(createData);
  };

  const updateSmartVOC = async (data: Partial<SmartVOCFormData>): Promise<void> => {
    if (!researchId) throw new Error('Research ID is required');

    const updateData: UpdateSmartVOCRequest = {
      questions: data.questions,
      randomizeQuestions: data.randomizeQuestions,
      smartVocRequired: data.smartVocRequired,
      metadata: data.metadata
    };

    await updateMutation.mutateAsync({ researchId, data: updateData });
  };

  const deleteSmartVOC = async (): Promise<void> => {
    if (!researchId) throw new Error('Research ID is required');
    return deleteMutation.mutateAsync(researchId);
  };

  return {
    data: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
    createSmartVOC,
    updateSmartVOC,
    deleteSmartVOC,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for validating smart VOC configuration
 */
export function useSmartVOCValidation(researchId: string | null) {
  return useQuery({
    queryKey: smartVocKeys.validation(researchId || ''),
    queryFn: () => researchId ? smartVocApi.validate(researchId) : Promise.resolve(null),
    enabled: !!researchId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for creating smart VOC with optimistic updates
 */
export function useCreateSmartVOC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSmartVOCRequest) => smartVocApi.create(data),
    onMutate: async (newSmartVOC) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: smartVocKeys.byResearch(newSmartVOC.researchId) });

      // Snapshot previous value
      const previousSmartVOC = queryClient.getQueryData<SmartVOCFormData | null>(
        smartVocKeys.byResearch(newSmartVOC.researchId)
      );

      // Optimistically update
      const optimisticSmartVOC: SmartVOCFormData = {
        researchId: newSmartVOC.researchId,
        questions: newSmartVOC.questions || [],
        randomizeQuestions: newSmartVOC.randomizeQuestions || false,
        smartVocRequired: newSmartVOC.smartVocRequired || false,
        metadata: {
          ...newSmartVOC.metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      queryClient.setQueryData(
        smartVocKeys.byResearch(newSmartVOC.researchId),
        optimisticSmartVOC
      );

      return { previousSmartVOC };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: smartVocKeys.byResearch(variables.researchId) });
      toast.success('Smart VOC creado exitosamente');
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousSmartVOC !== undefined) {
        queryClient.setQueryData(
          smartVocKeys.byResearch(variables.researchId),
          context.previousSmartVOC
        );
      }

      toast.error(error.response?.data?.message || 'Error al crear Smart VOC');
    },
    onSettled: (_, __, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: smartVocKeys.byResearch(variables.researchId) });
    }
  });
}

/**
 * Hook for updating smart VOC with optimistic updates
 */
export function useUpdateSmartVOC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ researchId, data }: { researchId: string; data: UpdateSmartVOCRequest }) =>
      smartVocApi.update(researchId, data),
    onMutate: async ({ researchId, data }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: smartVocKeys.byResearch(researchId) });

      // Snapshot previous value
      const previousSmartVOC = queryClient.getQueryData<SmartVOCFormData | null>(
        smartVocKeys.byResearch(researchId)
      );

      // Optimistically update
      if (previousSmartVOC) {
        const optimisticSmartVOC: SmartVOCFormData = {
          ...previousSmartVOC,
          questions: data.questions || previousSmartVOC.questions,
          randomizeQuestions: data.randomizeQuestions ?? previousSmartVOC.randomizeQuestions,
          smartVocRequired: data.smartVocRequired ?? previousSmartVOC.smartVocRequired,
          metadata: {
            ...previousSmartVOC.metadata,
            ...data.metadata,
            updatedAt: new Date().toISOString(),
          },
        };

        queryClient.setQueryData(
          smartVocKeys.byResearch(researchId),
          optimisticSmartVOC
        );
      }

      return { previousSmartVOC };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: smartVocKeys.byResearch(variables.researchId) });
      toast.success('Smart VOC actualizado exitosamente');
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousSmartVOC !== undefined) {
        queryClient.setQueryData(
          smartVocKeys.byResearch(variables.researchId),
          context.previousSmartVOC
        );
      }

      toast.error(error.response?.data?.message || 'Error al actualizar Smart VOC');
    },
    onSettled: (_, __, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: smartVocKeys.byResearch(variables.researchId) });
    }
  });
}

/**
 * Hook for deleting smart VOC with optimistic updates
 */
export function useDeleteSmartVOC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (researchId: string) => smartVocApi.delete(researchId),
    onMutate: async (researchId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: smartVocKeys.byResearch(researchId) });

      // Snapshot previous value
      const previousSmartVOC = queryClient.getQueryData<SmartVOCFormData | null>(
        smartVocKeys.byResearch(researchId)
      );

      // Optimistically update (set to null to indicate deletion)
      queryClient.setQueryData(
        smartVocKeys.byResearch(researchId),
        null
      );

      return { previousSmartVOC };
    },
    onSuccess: (_, researchId) => {
      queryClient.invalidateQueries({ queryKey: smartVocKeys.byResearch(researchId) });
      toast.success('Smart VOC eliminado exitosamente');
    },
    onError: (error: any, researchId, context) => {
      // Rollback on error
      if (context?.previousSmartVOC !== undefined) {
        queryClient.setQueryData(
          smartVocKeys.byResearch(researchId),
          context.previousSmartVOC
        );
      }

      toast.error(error.response?.data?.message || 'Error al eliminar Smart VOC');
    },
    onSettled: (_, __, researchId) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: smartVocKeys.byResearch(researchId) });
    }
  });
}