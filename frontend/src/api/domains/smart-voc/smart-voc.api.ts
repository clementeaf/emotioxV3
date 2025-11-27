/**
 * Smart VOC Domain API
 * API methods for smart VOC functionality
 */

import { apiClient } from '@/api/config/axios';
import type {
  SmartVOCFormData,
  CreateSmartVOCRequest,
  UpdateSmartVOCRequest,
  ValidationResponse,
  ApiResponse
} from './smart-voc.types';

/**
 * Smart VOC API methods
 */
export const smartVocApi = {
  /**
   * Get smart VOC by research ID
   */
  getByResearchId: async (researchId: string): Promise<SmartVOCFormData | null> => {
    try {
      const response = await apiClient.get<ApiResponse<SmartVOCFormData>>(`/research/${researchId}/smart-voc`);
      return response.data.data || response.data || null;
    } catch (error) {
      if ((error as any)?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create smart VOC
   */
  create: async (data: CreateSmartVOCRequest): Promise<SmartVOCFormData> => {
    const response = await apiClient.post<ApiResponse<SmartVOCFormData>>(
      `/research/${data.researchId}/smart-voc`,
      data
    );
    return response.data.data || response.data;
  },

  /**
   * Update smart VOC
   */
  update: async (researchId: string, data: UpdateSmartVOCRequest): Promise<SmartVOCFormData> => {
    const response = await apiClient.post<ApiResponse<SmartVOCFormData>>(
      `/research/${researchId}/smart-voc`,
      data
    );
    return response.data.data || response.data;
  },

  /**
   * Delete smart VOC
   */
  delete: async (researchId: string): Promise<void> => {
    await apiClient.delete(`/research/${researchId}/smart-voc`);
  },

  /**
   * Validate smart VOC configuration
   */
  validate: async (researchId: string): Promise<ValidationResponse> => {
    const response = await apiClient.get<ValidationResponse>(`/research/${researchId}/smart-voc/validate`);
    return response.data;
  }
};