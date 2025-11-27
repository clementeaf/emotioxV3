/**
 * Eye-Tracking Domain API Methods
 * All API calls for eye-tracking functionality using Axios
 */

import { apiClient } from '@/api/config/axios';
import type {
  ApiResponse,
  EyeTrackingData,
  EyeTrackingBuildConfig,
  EyeTrackingBuildRequest,
  EyeTrackingBuildUpdateRequest,
  EyeTrackingResults,
  EyeTrackingRecruitConfig,
  EyeTrackingRecruitParticipant,
  EyeTrackingRecruitStats,
  CreateEyeTrackingRecruitRequest,
  UpdateEyeTrackingRecruitRequest,
  GenerateRecruitmentLinkResponse,
  RecruitmentLink,
  UploadStimuliResponse,
  ParticipantResultsParams,
  ResultsExportParams,
  ValidationResponse
} from './eye-tracking.types';

import { RecruitLinkType } from './eye-tracking.types';

/**
 * Eye-Tracking Build API Methods
 */
export const eyeTrackingBuildApi = {
  /**
   * Get eye-tracking build configuration
   */
  getByResearchId: async (researchId: string): Promise<EyeTrackingBuildConfig | null> => {
    try {
      const response = await apiClient.get<ApiResponse<EyeTrackingBuildConfig>>(
        `/eye-tracking/build/${researchId}`
      );
      return response.data.data;
    } catch (error) {
      // Return null if not found
      if ((error as any)?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create eye-tracking build configuration
   */
  create: async (data: EyeTrackingBuildRequest): Promise<EyeTrackingBuildConfig> => {
    const response = await apiClient.post<ApiResponse<EyeTrackingBuildConfig>>(
      '/eye-tracking',
      data
    );
    return response.data.data;
  },

  /**
   * Update eye-tracking build configuration
   */
  update: async (id: string, data: EyeTrackingBuildUpdateRequest): Promise<EyeTrackingBuildConfig> => {
    const response = await apiClient.put<ApiResponse<EyeTrackingBuildConfig>>(
      `/eye-tracking/${id}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete eye-tracking build configuration
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/eye-tracking/${id}`);
  },

  /**
   * Upload stimuli files
   */
  uploadStimuli: async (files: File[]): Promise<UploadStimuliResponse> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await apiClient.post<ApiResponse<UploadStimuliResponse>>(
      '/eye-tracking/upload-stimuli',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data.data;
  },

  /**
   * Validate build configuration
   */
  validate: async (researchId: string): Promise<ValidationResponse> => {
    const response = await apiClient.get<ApiResponse<ValidationResponse>>(
      `/eye-tracking/build/${researchId}/validate`
    );
    return response.data.data;
  }
};

/**
 * Eye-Tracking Recruit API Methods
 */
export const eyeTrackingRecruitApi = {
  /**
   * Get recruitment configuration by research ID
   */
  getConfigByResearch: async (researchId: string): Promise<EyeTrackingRecruitConfig | null> => {
    try {
      const response = await apiClient.get<ApiResponse<EyeTrackingRecruitConfig>>(
        `/eye-tracking-recruit/research/${researchId}`
      );
      // El backend devuelve los datos directamente en response.data, no en response.data.data
      const result = response.data.data || response.data;
      return result as EyeTrackingRecruitConfig;
    } catch (error) {
      if ((error as any)?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create recruitment configuration
   */
  createConfig: async (researchId: string, data: CreateEyeTrackingRecruitRequest): Promise<EyeTrackingRecruitConfig> => {
    const response = await apiClient.post<ApiResponse<EyeTrackingRecruitConfig>>(
      `/eye-tracking-recruit/research/${researchId}`,
      data
    );
    return response.data.data;
  },

  /**
   * Update recruitment configuration
   */
  updateConfig: async (researchId: string, data: UpdateEyeTrackingRecruitRequest): Promise<EyeTrackingRecruitConfig> => {
    const response = await apiClient.put<ApiResponse<EyeTrackingRecruitConfig>>(
      `/eye-tracking-recruit/research/${researchId}`,
      data
    );
    return response.data.data;
  },

  /**
   * Delete recruitment configuration
   */
  deleteConfig: async (researchId: string): Promise<void> => {
    await apiClient.delete(`/eye-tracking-recruit/research/${researchId}`);
  },

  /**
   * Create participant
   */
  createParticipant: async (configId: string, data: Partial<EyeTrackingRecruitParticipant>): Promise<EyeTrackingRecruitParticipant> => {
    const response = await apiClient.post<ApiResponse<EyeTrackingRecruitParticipant>>(
      `/eye-tracking-recruit/config/${configId}/participant`,
      data
    );
    return response.data.data;
  },

  /**
   * Update participant status
   */
  updateParticipantStatus: async (participantId: string, status: string): Promise<EyeTrackingRecruitParticipant> => {
    const response = await apiClient.put<ApiResponse<EyeTrackingRecruitParticipant>>(
      `/eye-tracking-recruit/participant/${participantId}/status`,
      { status }
    );
    return response.data.data;
  },

  /**
   * Get participants by config ID
   */
  getParticipants: async (configId: string): Promise<EyeTrackingRecruitParticipant[]> => {
    const response = await apiClient.get<ApiResponse<EyeTrackingRecruitParticipant[]>>(
      `/eye-tracking-recruit/config/${configId}/participants`
    );
    return response.data.data;
  },

  /**
   * Get statistics by config ID
   */
  getStats: async (configId: string): Promise<EyeTrackingRecruitStats> => {
    const response = await apiClient.get<ApiResponse<EyeTrackingRecruitStats>>(
      `/eye-tracking-recruit/config/${configId}/stats`
    );
    return response.data.data;
  },

  /**
   * Generate recruitment link
   */
  generateLink: async (
    configId: string,
    type: RecruitLinkType = RecruitLinkType.STANDARD,
    expirationDays?: number
  ): Promise<GenerateRecruitmentLinkResponse> => {
    const response = await apiClient.post<ApiResponse<GenerateRecruitmentLinkResponse>>(
      `/eye-tracking-recruit/config/${configId}/link`,
      { type, expirationDays }
    );
    return response.data.data;
  },

  /**
   * Get active links
   */
  getActiveLinks: async (configId: string): Promise<RecruitmentLink[]> => {
    const response = await apiClient.get<ApiResponse<RecruitmentLink[]>>(
      `/eye-tracking-recruit/config/${configId}/links`
    );
    return response.data.data;
  },

  /**
   * Deactivate link
   */
  deactivateLink: async (token: string): Promise<RecruitmentLink> => {
    const response = await apiClient.put<ApiResponse<RecruitmentLink>>(
      `/eye-tracking-recruit/link/${token}/deactivate`,
      {}
    );
    return response.data.data;
  },

  /**
   * Validate link
   */
  validateLink: async (token: string): Promise<{ valid: boolean; link?: RecruitmentLink }> => {
    const response = await apiClient.get<ApiResponse<{ valid: boolean; link?: RecruitmentLink }>>(
      `/eye-tracking-recruit/link/${token}/validate`
    );
    return response.data.data;
  },

  /**
   * Get research summary
   */
  getResearchSummary: async (researchId: string): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>(
      `/eye-tracking-recruit/research/${researchId}/summary`
    );
    return response.data.data;
  },

  /**
   * Register public participant
   */
  registerPublicParticipant: async (data: Partial<EyeTrackingRecruitParticipant>): Promise<EyeTrackingRecruitParticipant> => {
    const response = await apiClient.post<ApiResponse<EyeTrackingRecruitParticipant>>(
      '/eye-tracking-recruit/public/participant/start',
      data
    );
    return response.data.data;
  },

  /**
   * Update public participant status
   */
  updatePublicParticipantStatus: async (participantId: string, status: string): Promise<EyeTrackingRecruitParticipant> => {
    const response = await apiClient.put<ApiResponse<EyeTrackingRecruitParticipant>>(
      `/eye-tracking-recruit/public/participant/${participantId}/status`,
      { status }
    );
    return response.data.data;
  }
};

/**
 * Eye-Tracking Results API Methods
 */
export const eyeTrackingResultsApi = {
  /**
   * Get results by research ID
   */
  getByResearchId: async (researchId: string): Promise<EyeTrackingResults | null> => {
    try {
      const response = await apiClient.get<ApiResponse<EyeTrackingResults>>(
        `/eye-tracking/results/${researchId}`
      );
      return response.data.data;
    } catch (error) {
      if ((error as any)?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get participant-specific results
   */
  getParticipantResults: async (params: ParticipantResultsParams): Promise<any> => {
    const { researchId, participantId, ...queryParams } = params;
    const response = await apiClient.get<ApiResponse<any>>(
      `/eye-tracking/results/${researchId}/participant/${participantId}`,
      { params: queryParams }
    );
    return response.data.data;
  },

  /**
   * Export results in specified format
   */
  exportResults: async (researchId: string, params: ResultsExportParams): Promise<Blob> => {
    const response = await apiClient.post(
      `/eye-tracking/results/${researchId}/export`,
      params,
      {
        responseType: 'blob'
      }
    );
    return response.data;
  },

  /**
   * Get aggregated analytics
   */
  getAnalytics: async (researchId: string): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>(
      `/eye-tracking/results/${researchId}/analytics`
    );
    return response.data.data;
  }
};

/**
 * Unified Eye-Tracking API
 */
export const eyeTrackingApi = {
  /**
   * Get complete eye-tracking data for a research
   */
  getByResearchId: async (researchId: string): Promise<EyeTrackingData | null> => {
    try {
      const response = await apiClient.get<ApiResponse<EyeTrackingData>>(
        `/eye-tracking/${researchId}`
      );
      return response.data.data;
    } catch (error) {
      if ((error as any)?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Export sub-APIs for modular access
  build: eyeTrackingBuildApi,
  recruit: eyeTrackingRecruitApi,
  results: eyeTrackingResultsApi
};