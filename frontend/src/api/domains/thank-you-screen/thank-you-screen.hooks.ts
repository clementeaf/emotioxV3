/**
 * Thank You Screen Domain Hooks
 * TanStack Query hooks for thank you screen functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { thankYouScreenApi } from './thank-you-screen.api';
import type {
  ThankYouScreenModel,
  ThankYouScreenFormData,
  CreateThankYouScreenRequest,
  UpdateThankYouScreenRequest
} from './thank-you-screen.types';

/**
 * Query keys for thank you screen
 */
export const thankYouScreenKeys = {
  all: ['thankYouScreen'] as const,
  byResearch: (researchId: string) => [...thankYouScreenKeys.all, 'research', researchId] as const,
  validation: (researchId: string) => [...thankYouScreenKeys.all, 'validation', researchId] as const,
};

/**
 * Hook to get thank you screen data by research ID
 */
export function useThankYouScreenData(researchId: string | null) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: thankYouScreenKeys.byResearch(researchId || ''),
    queryFn: () => researchId ? thankYouScreenApi.getByResearchId(researchId) : Promise.resolve(null),
    enabled: !!researchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateThankYouScreenRequest) => thankYouScreenApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: thankYouScreenKeys.byResearch(researchId!) });
      toast.success('Thank you screen created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create thank you screen');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ researchId, data }: { researchId: string; data: UpdateThankYouScreenRequest }) =>
      thankYouScreenApi.update(researchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: thankYouScreenKeys.byResearch(researchId!) });
      toast.success('Thank you screen updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update thank you screen');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (researchId: string) => thankYouScreenApi.delete(researchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: thankYouScreenKeys.byResearch(researchId!) });
      toast.success('Thank you screen deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete thank you screen');
    }
  });

  // Wrapper functions for easier use
  const createThankYouScreen = async (data: ThankYouScreenFormData): Promise<ThankYouScreenModel> => {
    if (!researchId) throw new Error('Research ID is required');

    const createData: CreateThankYouScreenRequest = {
      ...data,
      researchId
    };

    return createMutation.mutateAsync(createData);
  };

  const updateThankYouScreen = async (researchId: string, data: Partial<ThankYouScreenFormData>): Promise<ThankYouScreenModel> => {
    const updateData: UpdateThankYouScreenRequest = {
      isEnabled: data.isEnabled,
      title: data.title,
      message: data.message,
      redirectUrl: data.redirectUrl,
      metadata: data.metadata
    };

    return updateMutation.mutateAsync({ researchId, data: updateData });
  };

  const deleteThankYouScreen = async (): Promise<void> => {
    if (!researchId) throw new Error('Research ID is required');
    return deleteMutation.mutateAsync(researchId);
  };

  return {
    data: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
    createThankYouScreen,
    updateThankYouScreen,
    deleteThankYouScreen,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for validating thank you screen configuration
 */
export function useThankYouScreenValidation(researchId: string | null) {
  return useQuery({
    queryKey: thankYouScreenKeys.validation(researchId || ''),
    queryFn: () => researchId ? thankYouScreenApi.validate(researchId) : Promise.resolve(null),
    enabled: !!researchId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for creating thank you screen
 */
export function useCreateThankYouScreen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateThankYouScreenRequest) => thankYouScreenApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: thankYouScreenKeys.byResearch(variables.researchId) });
      toast.success('Thank you screen created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create thank you screen');
    }
  });
}

/**
 * Hook for updating thank you screen
 */
export function useUpdateThankYouScreen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ researchId, data }: { researchId: string; data: UpdateThankYouScreenRequest }) =>
      thankYouScreenApi.update(researchId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: thankYouScreenKeys.byResearch(variables.researchId) });
      toast.success('Thank you screen updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update thank you screen');
    }
  });
}

/**
 * Hook for deleting thank you screen
 */
export function useDeleteThankYouScreen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (researchId: string) => thankYouScreenApi.delete(researchId),
    onSuccess: (_, researchId) => {
      queryClient.invalidateQueries({ queryKey: thankYouScreenKeys.byResearch(researchId) });
      toast.success('Thank you screen deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete thank you screen');
    }
  });
}