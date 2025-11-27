/**
 * Cognitive Task Domain Hooks
 * TanStack Query hooks for cognitive task functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { cognitiveTaskApi } from './cognitive-task.api';
import type {
  CognitiveTaskFormData,
  CreateCognitiveTaskRequest,
  UpdateCognitiveTaskRequest
} from './cognitive-task.types';

/**
 * Query keys for cognitive task
 */
export const cognitiveTaskKeys = {
  all: ['cognitiveTask'] as const,
  byResearch: (researchId: string) => [...cognitiveTaskKeys.all, 'research', researchId] as const,
  validation: (researchId: string) => [...cognitiveTaskKeys.all, 'validation', researchId] as const,
};

/**
 * Hook to get cognitive task data by research ID
 */
export function useCognitiveTaskData(researchId: string | null) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: cognitiveTaskKeys.byResearch(researchId || ''),
    queryFn: async () => {
      if (!researchId) return null;
      try {
        return await cognitiveTaskApi.getByResearchId(researchId);
      } catch (err) {
        // 🎯 Si es un 404, devolver null en lugar de lanzar error
        const axiosError = err as { response?: { status?: number } };
        if (axiosError?.response?.status === 404) {
          return null;
        }
        // Para otros errores, lanzar el error
        throw err;
      }
    },
    enabled: !!researchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // No refetch cuando la ventana recibe foco
    refetchOnMount: false, // No refetch si ya hay datos en cache
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // 🎯 No reintentar si es un 404 (no hay configuración, no es un error)
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 404) {
        return false;
      }
      // Reintentar otros errores hasta 1 vez
      return failureCount < 1;
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateCognitiveTaskRequest) => cognitiveTaskApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cognitiveTaskKeys.byResearch(researchId!) });
      toast.success('Cognitive task created successfully');
    },
    onError: (error: unknown) => {
      toast.error((error as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Failed to create cognitive task');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ researchId, data }: { researchId: string; data: UpdateCognitiveTaskRequest }) =>
      cognitiveTaskApi.update(researchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cognitiveTaskKeys.byResearch(researchId!) });
      toast.success('Cognitive task updated successfully');
    },
    onError: (error: unknown) => {
      toast.error((error as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Failed to update cognitive task');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (researchId: string) => cognitiveTaskApi.delete(researchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cognitiveTaskKeys.byResearch(researchId!) });
      toast.success('Cognitive task deleted successfully');
    },
    onError: (error: unknown) => {
      toast.error((error as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Failed to delete cognitive task');
    }
  });

  // Wrapper functions for easier use - following the same pattern as cognitiveTaskService
  const createCognitiveTask = async (data: CognitiveTaskFormData): Promise<CognitiveTaskFormData> => {
    if (!researchId) throw new Error('Research ID is required');

    const createData: CreateCognitiveTaskRequest = {
      ...data,
      researchId
    };

    return createMutation.mutateAsync(createData);
  };

  const updateCognitiveTask = async (data: Partial<CognitiveTaskFormData>): Promise<CognitiveTaskFormData> => {
    if (!researchId) throw new Error('Research ID is required');

    const updateData: UpdateCognitiveTaskRequest = {
      questions: data.questions,
      randomizeQuestions: data.randomizeQuestions,
      metadata: data.metadata,
      title: data.title,
      description: data.description
    };

    return updateMutation.mutateAsync({ researchId, data: updateData });
  };

  const deleteCognitiveTask = async (): Promise<void> => {
    if (!researchId) throw new Error('Research ID is required');
    return deleteMutation.mutateAsync(researchId);
  };

  // Save function that replicates cognitiveTaskService.save behavior
  const saveCognitiveTask = async (data: CognitiveTaskFormData): Promise<CognitiveTaskFormData> => {
    if (!researchId) throw new Error('Research ID is required');

    // Check if task exists to determine create or update
    try {
      const existing = await cognitiveTaskApi.getByResearchId(researchId);
      if (existing) {
        return updateCognitiveTask(data);
      } else {
        return createCognitiveTask(data);
      }
    } catch (error) {
      // If error getting existing, try to create
      return createCognitiveTask(data);
    }
  };

  return {
    data: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
    createCognitiveTask,
    updateCognitiveTask,
    deleteCognitiveTask,
    saveCognitiveTask, // Adding save method for backward compatibility
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for validating cognitive task configuration
 */
export function useCognitiveTaskValidation(researchId: string | null) {
  return useQuery({
    queryKey: cognitiveTaskKeys.validation(researchId || ''),
    queryFn: () => researchId ? cognitiveTaskApi.validate(researchId) : Promise.resolve(null),
    enabled: !!researchId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for creating cognitive task with optimistic updates
 */
export function useCreateCognitiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCognitiveTaskRequest) => cognitiveTaskApi.create(data),
    onMutate: async (newTask) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: cognitiveTaskKeys.byResearch(newTask.researchId) });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData<CognitiveTaskFormData | null>(
        cognitiveTaskKeys.byResearch(newTask.researchId)
      );

      // Optimistically update
      const optimisticTask: CognitiveTaskFormData = {
        researchId: newTask.researchId,
        questions: newTask.questions || [],
        randomizeQuestions: newTask.randomizeQuestions || false,
        metadata: {
          ...newTask.metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        title: newTask.title,
        description: newTask.description,
      };

      queryClient.setQueryData(
        cognitiveTaskKeys.byResearch(newTask.researchId),
        optimisticTask
      );

      return { previousTask };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cognitiveTaskKeys.byResearch(variables.researchId) });
      toast.success('Tarea cognitiva creada exitosamente');
    },
    onError: (error: unknown, variables, context) => {
      // Rollback on error
      if (context?.previousTask !== undefined) {
        queryClient.setQueryData(
          cognitiveTaskKeys.byResearch(variables.researchId),
          context.previousTask
        );
      }

      toast.error((error as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Error al crear tarea cognitiva');
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: cognitiveTaskKeys.byResearch(variables.researchId) });
    }
  });
}

/**
 * Hook for updating cognitive task with optimistic updates
 */
export function useUpdateCognitiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ researchId, data }: { researchId: string; data: UpdateCognitiveTaskRequest }) =>
      cognitiveTaskApi.update(researchId, data),
    onMutate: async ({ researchId, data }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: cognitiveTaskKeys.byResearch(researchId) });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData<CognitiveTaskFormData | null>(
        cognitiveTaskKeys.byResearch(researchId)
      );

      // Optimistically update
      if (previousTask) {
        const optimisticTask: CognitiveTaskFormData = {
          ...previousTask,
          questions: data.questions || previousTask.questions,
          randomizeQuestions: data.randomizeQuestions ?? previousTask.randomizeQuestions,
          title: data.title || previousTask.title,
          description: data.description || previousTask.description,
          metadata: {
            ...previousTask.metadata,
            ...data.metadata,
            updatedAt: new Date().toISOString(),
          },
        };

        queryClient.setQueryData(
          cognitiveTaskKeys.byResearch(researchId),
          optimisticTask
        );
      }

      return { previousTask };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cognitiveTaskKeys.byResearch(variables.researchId) });
      toast.success('Tarea cognitiva actualizada exitosamente');
    },
    onError: (error: unknown, variables, context) => {
      // Rollback on error
      if (context?.previousTask !== undefined) {
        queryClient.setQueryData(
          cognitiveTaskKeys.byResearch(variables.researchId),
          context.previousTask
        );
      }

      toast.error((error as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Error al actualizar tarea cognitiva');
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: cognitiveTaskKeys.byResearch(variables.researchId) });
    }
  });
}

/**
 * Hook for deleting cognitive task with optimistic updates
 */
export function useDeleteCognitiveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (researchId: string) => cognitiveTaskApi.delete(researchId),
    onMutate: async (researchId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: cognitiveTaskKeys.byResearch(researchId) });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData<CognitiveTaskFormData | null>(
        cognitiveTaskKeys.byResearch(researchId)
      );

      // Optimistically update (set to null to indicate deletion)
      queryClient.setQueryData(
        cognitiveTaskKeys.byResearch(researchId),
        null
      );

      return { previousTask };
    },
    onSuccess: (_, researchId) => {
      queryClient.invalidateQueries({ queryKey: cognitiveTaskKeys.byResearch(researchId) });
      toast.success('Tarea cognitiva eliminada exitosamente');
    },
    onError: (error: unknown, researchId, context) => {
      // Rollback on error
      if (context?.previousTask !== undefined) {
        queryClient.setQueryData(
          cognitiveTaskKeys.byResearch(researchId),
          context.previousTask
        );
      }

      toast.error((error as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Error al eliminar tarea cognitiva');
    },
    onSettled: (_, __, researchId) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: cognitiveTaskKeys.byResearch(researchId) });
    }
  });
}