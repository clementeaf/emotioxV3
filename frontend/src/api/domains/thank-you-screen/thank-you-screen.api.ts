/**
 * Thank You Screen Domain API
 * API methods for thank you screen functionality
 */

import { apiClient } from '@/api/config/axios';
import type {
  ThankYouScreenModel,
  CreateThankYouScreenRequest,
  UpdateThankYouScreenRequest,
  ValidationResponse,
  ApiResponse
} from './thank-you-screen.types';

/**
 * Thank You Screen API methods
 */
export const thankYouScreenApi = {
  /**
   * Get thank you screen by research ID
   */
  getByResearchId: async (researchId: string): Promise<ThankYouScreenModel | null> => {
    try {
      const response = await apiClient.get<ApiResponse<ThankYouScreenModel>>(`/research/${researchId}/thank-you-screen`);
      return response.data.data || response.data || null;
    } catch (error) {
      if ((error as any)?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create thank you screen
   */
  create: async (data: CreateThankYouScreenRequest): Promise<ThankYouScreenModel> => {
    const response = await apiClient.post<ApiResponse<ThankYouScreenModel>>(
      `/research/${data.researchId}/thank-you-screen`,
      data
    );
    return response.data.data || response.data;
  },

  /**
   * Update thank you screen
   */
  update: async (researchId: string, data: UpdateThankYouScreenRequest): Promise<ThankYouScreenModel> => {
    const response = await apiClient.put<ApiResponse<ThankYouScreenModel>>(
      `/research/${researchId}/thank-you-screen`,
      data
    );
    return response.data.data || response.data;
  },

  /**
   * Delete thank you screen
   */
  delete: async (researchId: string): Promise<void> => {
    await apiClient.delete(`/research/${researchId}/thank-you-screen`);
  },

  /**
   * Validate thank you screen configuration
   */
  validate: async (researchId: string): Promise<ValidationResponse> => {
    const response = await apiClient.get<ValidationResponse>(`/research/${researchId}/thank-you-screen/validate`);
    return response.data;
  }
};