/**
 * Eye-Tracking Domain Hooks
 * TanStack Query hooks for eye-tracking functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { eyeTrackingApi } from './eye-tracking.api';
import type {
  EyeTrackingData,
  EyeTrackingBuildConfig,
  EyeTrackingBuildRequest,
  EyeTrackingBuildUpdateRequest,
  EyeTrackingResults,
  EyeTrackingRecruitConfig,
  EyeTrackingRecruitParticipant,
  CreateEyeTrackingRecruitRequest,
  UpdateEyeTrackingRecruitRequest,
  ResultsExportParams,
  UseEyeTrackingDataReturn
} from './eye-tracking.types';

import { RecruitLinkType } from './eye-tracking.types';

/**
 * Query keys for eye-tracking
 */
export const eyeTrackingKeys = {
  all: ['eye-tracking'] as const,
  lists: () => [...eyeTrackingKeys.all, 'list'] as const,
  list: (filters?: any) => [...eyeTrackingKeys.lists(), filters] as const,
  details: () => [...eyeTrackingKeys.all, 'detail'] as const,
  detail: (id: string) => [...eyeTrackingKeys.details(), id] as const,
  build: (researchId: string) => [...eyeTrackingKeys.all, 'build', researchId] as const,
  recruit: (researchId: string) => [...eyeTrackingKeys.all, 'recruit', researchId] as const,
  results: (researchId: string) => [...eyeTrackingKeys.all, 'results', researchId] as const,
  participants: (configId: string) => [...eyeTrackingKeys.all, 'participants', configId] as const,
  stats: (configId: string) => [...eyeTrackingKeys.all, 'stats', configId] as const,
};

/**
 * Hook to get complete eye-tracking data
 */
export function useEyeTrackingData(researchId: string | null, options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: eyeTrackingKeys.detail(researchId || ''),
    queryFn: () => researchId ? eyeTrackingApi.getByResearchId(researchId) : Promise.resolve(null),
    enabled: Boolean(researchId) && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutations for updates
  const saveBuildConfig = useMutation({
    mutationFn: async (config: Partial<EyeTrackingBuildConfig>) => {
      if (!researchId) throw new Error('Research ID is required');

      if (config.id) {
        return eyeTrackingApi.build.update(config.id, config as EyeTrackingBuildUpdateRequest);
      } else {
        return eyeTrackingApi.build.create({ ...config, researchId } as EyeTrackingBuildRequest);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.detail(researchId!) });
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.build(researchId!) });
      toast.success('Build configuration saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save build configuration');
    }
  });

  const saveRecruitConfig = useMutation({
    mutationFn: async (config: Partial<EyeTrackingRecruitConfig>) => {
      if (!researchId) throw new Error('Research ID is required');

      const existingConfig = await eyeTrackingApi.recruit.getConfigByResearch(researchId);

      if (existingConfig) {
        return eyeTrackingApi.recruit.updateConfig(researchId, config as UpdateEyeTrackingRecruitRequest);
      } else {
        return eyeTrackingApi.recruit.createConfig(researchId, config as CreateEyeTrackingRecruitRequest);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.detail(researchId!) });
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.recruit(researchId!) });
      toast.success('Recruitment configuration saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save recruitment configuration');
    }
  });

  // Return structured data
  const result: UseEyeTrackingDataReturn = {
    data: data || null,
    loading: isLoading,
    error: error?.message || null,
    refetch: () => Promise.resolve()
  };

  return result;
}

/**
 * Hook for eye-tracking build operations
 */
export function useEyeTrackingBuild(researchId: string | null) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: eyeTrackingKeys.build(researchId || ''),
    queryFn: () => researchId ? eyeTrackingApi.build.getByResearchId(researchId) : Promise.resolve(null),
    enabled: Boolean(researchId),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: EyeTrackingBuildRequest) => eyeTrackingApi.build.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.build(researchId!) });
      toast.success('Build configuration created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EyeTrackingBuildUpdateRequest }) =>
      eyeTrackingApi.build.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.build(researchId!) });
      toast.success('Build configuration updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eyeTrackingApi.build.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.build(researchId!) });
      toast.success('Build configuration deleted');
    },
  });

  const uploadStimuliMutation = useMutation({
    mutationFn: (files: File[]) => eyeTrackingApi.build.uploadStimuli(files),
    onSuccess: () => {
      toast.success('Stimuli uploaded successfully');
    },
  });

  // Wrapper functions for easier use
  const createEyeTrackingBuild = async (data: EyeTrackingBuildRequest): Promise<EyeTrackingBuildConfig> => {
    if (!researchId) throw new Error('Research ID is required');
    return createMutation.mutateAsync(data);
  };

  const updateEyeTrackingBuild = async (id: string, data: EyeTrackingBuildUpdateRequest): Promise<EyeTrackingBuildConfig> => {
    if (!researchId) throw new Error('Research ID is required');
    return updateMutation.mutateAsync({ id, data });
  };

  const deleteEyeTrackingBuild = async (id: string): Promise<void> => {
    if (!researchId) throw new Error('Research ID is required');
    return deleteMutation.mutateAsync(id);
  };

  return {
    data,
    isLoading,
    error,
    createEyeTrackingBuild,
    updateEyeTrackingBuild,
    deleteEyeTrackingBuild,
    uploadStimuli: uploadStimuliMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUploadingStimuli: uploadStimuliMutation.isPending,
  };
}

/**
 * Hook for eye-tracking recruitment operations
 */
export function useEyeTrackingRecruit(researchId: string | null) {
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: eyeTrackingKeys.recruit(researchId || ''),
    queryFn: () => researchId ? eyeTrackingApi.recruit.getConfigByResearch(researchId) : Promise.resolve(null),
    enabled: Boolean(researchId),
    staleTime: 5 * 60 * 1000,
  });

  const { data: participants } = useQuery({
    queryKey: eyeTrackingKeys.participants(config?.id || ''),
    queryFn: () => config?.id ? eyeTrackingApi.recruit.getParticipants(config.id) : Promise.resolve([]),
    enabled: Boolean(config?.id),
  });

  const { data: stats } = useQuery({
    queryKey: eyeTrackingKeys.stats(config?.id || ''),
    queryFn: () => config?.id ? eyeTrackingApi.recruit.getStats(config.id) : Promise.resolve(null),
    enabled: Boolean(config?.id),
  });

  const createConfigMutation = useMutation({
    mutationFn: (data: CreateEyeTrackingRecruitRequest) =>
      eyeTrackingApi.recruit.createConfig(researchId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.recruit(researchId!) });
      toast.success('Recruitment configuration created');
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: UpdateEyeTrackingRecruitRequest) =>
      eyeTrackingApi.recruit.updateConfig(researchId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.recruit(researchId!) });
      toast.success('Recruitment configuration updated');
    },
  });

  const generateLinkMutation = useMutation({
    mutationFn: ({ type = RecruitLinkType.STANDARD, expirationDays }: {
      type?: RecruitLinkType;
      expirationDays?: number
    }) => eyeTrackingApi.recruit.generateLink(config?.id!, type, expirationDays),
    onSuccess: () => {
      toast.success('Recruitment link generated');
    },
  });

  const updateParticipantStatusMutation = useMutation({
    mutationFn: ({ participantId, status }: { participantId: string; status: string }) =>
      eyeTrackingApi.recruit.updateParticipantStatus(participantId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.participants(config?.id!) });
      queryClient.invalidateQueries({ queryKey: eyeTrackingKeys.stats(config?.id!) });
    },
  });

  return {
    config,
    participants,
    stats,
    isLoading,
    error,
    createConfig: createConfigMutation.mutate,
    updateConfig: updateConfigMutation.mutate,
    generateLink: generateLinkMutation.mutateAsync,
    updateParticipantStatus: updateParticipantStatusMutation.mutate,
    isCreatingConfig: createConfigMutation.isPending,
    isUpdatingConfig: updateConfigMutation.isPending,
    isGeneratingLink: generateLinkMutation.isPending,
  };
}

/**
 * Hook for eye-tracking results
 */
export function useEyeTrackingResults(researchId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: eyeTrackingKeys.results(researchId || ''),
    queryFn: () => researchId ? eyeTrackingApi.results.getByResearchId(researchId) : Promise.resolve(null),
    enabled: Boolean(researchId),
    staleTime: 5 * 60 * 1000,
  });

  const exportResultsMutation = useMutation({
    mutationFn: (params: ResultsExportParams) =>
      eyeTrackingApi.results.exportResults(researchId!, params),
    onSuccess: (blob, variables) => {
      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eye-tracking-results-${researchId}.${variables.format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Results exported successfully');
    },
  });

  return {
    data,
    isLoading,
    error,
    exportResults: exportResultsMutation.mutateAsync,
    isExporting: exportResultsMutation.isPending,
  };
}