/**
 * Welcome Screen Domain API
 * API methods for welcome screen functionality
 */

import { apiClient } from '@/api/config/axios';
import type {
  WelcomeScreenModel,
  CreateWelcomeScreenRequest,
  UpdateWelcomeScreenRequest,
  ValidationResponse,
  ApiResponse
} from './welcome-screen.types';

/**
 * Welcome Screen API methods
 */
export const welcomeScreenApi = {
  /**
   * Get welcome screen by research ID
   */
  getByResearchId: async (researchId: string): Promise<WelcomeScreenModel | null> => {
    try {
      const response = await apiClient.get<ApiResponse<WelcomeScreenModel>>(`/research/${researchId}/welcome-screen`);
      return response.data.data || response.data || null;
    } catch (error) {
      if ((error as any)?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create welcome screen
   */
  create: async (data: CreateWelcomeScreenRequest): Promise<WelcomeScreenModel> => {
    const response = await apiClient.post<ApiResponse<WelcomeScreenModel>>(
      `/research/${data.researchId}/welcome-screen`,
      {
        ...data,
        questionKey: 'WELCOME_SCREEN'
      }
    );
    return response.data.data || response.data;
  },

  /**
   * Update welcome screen
   */
  update: async (researchId: string, data: UpdateWelcomeScreenRequest): Promise<WelcomeScreenModel> => {
    const response = await apiClient.put<ApiResponse<WelcomeScreenModel>>(
      `/research/${researchId}/welcome-screen`,
      data
    );
    return response.data.data || response.data;
  },

  /**
   * Delete welcome screen
   */
  delete: async (researchId: string): Promise<void> => {
    await apiClient.delete(`/research/${researchId}/welcome-screen`);
  },

  /**
   * Validate welcome screen configuration
   */
  validate: async (researchId: string): Promise<ValidationResponse> => {
    const response = await apiClient.get<ValidationResponse>(`/research/${researchId}/welcome-screen/validate`);
    return response.data;
  }
};

