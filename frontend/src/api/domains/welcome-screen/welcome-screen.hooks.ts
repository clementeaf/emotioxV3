/**
 * Welcome Screen Domain Hooks
 * TanStack Query hooks for welcome screen functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { welcomeScreenApi } from './welcome-screen.api';
import type {
  WelcomeScreenModel,
  WelcomeScreenFormData,
  CreateWelcomeScreenRequest,
  UpdateWelcomeScreenRequest
} from './welcome-screen.types';

/**
 * Query keys for welcome screen
 */
export const welcomeScreenKeys = {
  all: ['welcomeScreen'] as const,
  byResearch: (researchId: string) => [...welcomeScreenKeys.all, 'research', researchId] as const,
  validation: (researchId: string) => [...welcomeScreenKeys.all, 'validation', researchId] as const,
};

/**
 * Hook to get welcome screen data by research ID
 */
export function useWelcomeScreenData(researchId: string | null) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: welcomeScreenKeys.byResearch(researchId || ''),
    queryFn: () => researchId ? welcomeScreenApi.getByResearchId(researchId) : Promise.resolve(null),
    enabled: !!researchId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateWelcomeScreenRequest) => welcomeScreenApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: welcomeScreenKeys.byResearch(researchId!) });
      toast.success('Welcome screen created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create welcome screen');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ researchId, data }: { researchId: string; data: UpdateWelcomeScreenRequest }) =>
      welcomeScreenApi.update(researchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: welcomeScreenKeys.byResearch(researchId!) });
      toast.success('Welcome screen updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update welcome screen');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (researchId: string) => welcomeScreenApi.delete(researchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: welcomeScreenKeys.byResearch(researchId!) });
      toast.success('Welcome screen deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete welcome screen');
    }
  });

  // Wrapper functions for easier use
  const createWelcomeScreen = async (data: WelcomeScreenFormData): Promise<WelcomeScreenModel> => {
    if (!researchId) throw new Error('Research ID is required');

    const createData: CreateWelcomeScreenRequest = {
      ...data,
      researchId
    };

    return createMutation.mutateAsync(createData);
  };

  const updateWelcomeScreen = async (researchId: string, data: Partial<WelcomeScreenFormData>): Promise<WelcomeScreenModel> => {
    const updateData: UpdateWelcomeScreenRequest = {
      isEnabled: data.isEnabled,
      title: data.title,
      message: data.message,
      startButtonText: data.startButtonText,
      metadata: data.metadata
    };

    return updateMutation.mutateAsync({ researchId, data: updateData });
  };

  const deleteWelcomeScreen = async (): Promise<void> => {
    if (!researchId) throw new Error('Research ID is required');
    return deleteMutation.mutateAsync(researchId);
  };

  return {
    data: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
    createWelcomeScreen,
    updateWelcomeScreen,
    deleteWelcomeScreen,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

/**
 * Hook for validating welcome screen configuration
 */
export function useWelcomeScreenValidation(researchId: string | null) {
  return useQuery({
    queryKey: welcomeScreenKeys.validation(researchId || ''),
    queryFn: () => researchId ? welcomeScreenApi.validate(researchId) : Promise.resolve(null),
    enabled: !!researchId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for creating welcome screen
 */
export function useCreateWelcomeScreen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWelcomeScreenRequest) => welcomeScreenApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: welcomeScreenKeys.byResearch(variables.researchId) });
      toast.success('Welcome screen created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create welcome screen');
    }
  });
}

/**
 * Hook for updating welcome screen
 */
export function useUpdateWelcomeScreen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ researchId, data }: { researchId: string; data: UpdateWelcomeScreenRequest }) =>
      welcomeScreenApi.update(researchId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: welcomeScreenKeys.byResearch(variables.researchId) });
      toast.success('Welcome screen updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update welcome screen');
    }
  });
}

/**
 * Hook for deleting welcome screen
 */
export function useDeleteWelcomeScreen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (researchId: string) => welcomeScreenApi.delete(researchId),
    onSuccess: (_, researchId) => {
      queryClient.invalidateQueries({ queryKey: welcomeScreenKeys.byResearch(researchId) });
      toast.success('Welcome screen deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete welcome screen');
    }
  });
}

