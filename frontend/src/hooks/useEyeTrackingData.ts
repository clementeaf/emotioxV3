/**
 * 👁️ EYE TRACKING DATA HOOK - WRAPPER FOR NEW ARCHITECTURE
 * This file now acts as a compatibility layer that redirects to the new domain hooks
 */

import {
  useEyeTrackingData as useEyeTrackingDataDomain,
  useEyeTrackingBuild as useEyeTrackingBuildDomain,
  useEyeTrackingRecruit as useEyeTrackingRecruitDomain,
  useEyeTrackingResults as useEyeTrackingResultsDomain
} from '@/api/domains/eye-tracking';
import type {
  EyeTrackingBuildConfig,
  EyeTrackingRecruitFormDataLocal,
  EyeTrackingResults,
  EyeTrackingParticipantResult,
  UseEyeTrackingDataOptions,
  UseEyeTrackingDataReturn,
  EyeTrackingData
} from '../types/eye-tracking';
import type { EyeTrackingFormData } from '../../../shared/interfaces/eye-tracking.interface';

/**
 * Hook for eye tracking data (build and recruit configurations)
 * Now wraps the new domain hook for backward compatibility
 */
export function useEyeTrackingData(
  researchId: string,
  options: UseEyeTrackingDataOptions = {}
): UseEyeTrackingDataReturn {
  const { enabled = true } = options;

  // Use the new domain hook
  const domainResult = useEyeTrackingDataDomain(researchId, { enabled });
  
  // Adapt to expected interface
  return {
    ...domainResult,
    eyeTrackingData: domainResult.data as any,
    buildConfig: null,
    recruitConfig: null,
    results: null,
    isLoading: domainResult.loading,
    isLoadingBuild: false,
    isLoadingRecruit: false,
    isLoadingResults: false,
    error: domainResult.error,
    saveBuildConfig: async () => {},
    saveRecruitConfig: async () => {},
    generateRecruitmentLink: async () => '',
    exportResults: async () => {},
    refreshData: async () => {},
    validateBuildConfig: () => [],
    validateRecruitConfig: () => []
  } as any;
}

/**
 * Hook for eye tracking build configuration only
 * Now wraps the new domain hook
 */
export function useEyeTrackingBuildData(researchId: string) {
  const buildResult = useEyeTrackingBuildDomain(researchId);

  // Transform to match expected interface
  return {
    data: buildResult.data ? {
      id: `build-${Date.now()}`,
      researchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      build: buildResult.data
    } as EyeTrackingData : undefined,
    eyeTrackingData: null,
    buildConfig: buildResult.data,
    recruitConfig: null,
    results: null,
    isLoading: buildResult.isLoading,
    isLoadingBuild: buildResult.isLoading,
    isLoadingRecruit: false,
    isLoadingResults: false,
    error: buildResult.error ? String(buildResult.error) : null,
    saveBuildConfig: async (config: Partial<EyeTrackingBuildConfig>) => {
      if (config.id) {
        await buildResult.updateEyeTrackingBuild(config.id, config as any);
      } else {
        await buildResult.createEyeTrackingBuild({ ...config, researchId } as any);
      }
    },
    saveRecruitConfig: async () => {},
    generateRecruitmentLink: async () => '',
    exportResults: async () => {},
    refreshData: async () => {},
    validateBuildConfig: () => [],
    validateRecruitConfig: () => []
  };
}

/**
 * Hook for eye tracking recruit configuration only
 * Now wraps the new domain hook
 */
export function useEyeTrackingRecruitData(researchId: string) {
  const recruitResult = useEyeTrackingRecruitDomain(researchId);

  // Transform to match expected interface
  return {
    data: recruitResult.config ? {
      id: `recruit-${Date.now()}`,
      researchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recruit: recruitResult.config as any
    } as EyeTrackingData : undefined,
    eyeTrackingData: null,
    buildConfig: null,
    recruitConfig: recruitResult.config as any,
    results: null,
    isLoading: recruitResult.isLoading,
    isLoadingBuild: false,
    isLoadingRecruit: recruitResult.isLoading,
    isLoadingResults: false,
    error: recruitResult.error ? String(recruitResult.error) : null,
    saveBuildConfig: async () => {},
    saveRecruitConfig: async (config: Partial<EyeTrackingRecruitFormDataLocal>) => {
      recruitResult.updateConfig(config as any);
    },
    generateRecruitmentLink: async () => {
      const result = await recruitResult.generateLink({});
      return result.link;
    },
    exportResults: async () => {},
    refreshData: async () => {},
    validateBuildConfig: () => [],
    validateRecruitConfig: () => []
  };
}

/**
 * Hook for eye tracking results
 * Now wraps the new domain hook
 */
export function useEyeTrackingResults(researchId: string) {
  const resultsData = useEyeTrackingResultsDomain(researchId);

  return {
    results: resultsData.data ? [resultsData.data] : [],
    isLoading: resultsData.isLoading,
    error: resultsData.error ? String(resultsData.error) : null,
    refetch: async () => {},
  };
}

/**
 * Hook for specific participant eye tracking results
 * For now, returns empty data as this needs specific implementation
 */
export function useParticipantEyeTrackingResults(researchId: string, participantId: string) {
  // TODO: Implement participant-specific results in the domain
  return {
    results: null,
    isLoading: false,
    error: null,
    refetch: async () => {},
  };
}

/**
 * Utility function to validate eye tracking configuration
 */
export function validateEyeTrackingBuildConfig(
  config: Partial<EyeTrackingBuildConfig>
): boolean {
  const formData = config as unknown as EyeTrackingFormData;
  if (!formData.researchId || formData.researchId.trim().length === 0) {
    return false;
  }

  // Check required properties from EyeTrackingFormData
  if (!formData.config) {
    return false;
  }

  if (!formData.stimuli) {
    return false;
  }

  return true;
}

/**
 * Utility function to validate recruit configuration
 */
export function validateEyeTrackingRecruitConfig(
  config: Partial<EyeTrackingRecruitFormDataLocal>
): boolean {
  const recruitData = config as EyeTrackingFormData;
  if (!recruitData.researchId || recruitData.researchId.trim().length === 0) {
    return false;
  }

  // For now, just check basic structure since recruit config structure may vary
  return Boolean(config);
}