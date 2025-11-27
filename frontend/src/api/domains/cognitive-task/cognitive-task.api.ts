/**
 * Cognitive Task Domain API
 * API methods for cognitive task functionality
 */

import { apiClient } from '@/api/config/axios';
import type {
  CognitiveTaskFormData,
  CreateCognitiveTaskRequest,
  UpdateCognitiveTaskRequest,
  ValidationResponse,
  ApiResponse
} from './cognitive-task.types';

/**
 * Cognitive Task API methods
 */
export const cognitiveTaskApi = {
  /**
   * Get cognitive task by research ID
   */
  getByResearchId: async (researchId: string): Promise<CognitiveTaskFormData | null> => {
    try {
      const response = await apiClient.get<ApiResponse<CognitiveTaskFormData>>(`/research/${researchId}/cognitive-task`);
      return response.data?.data || response.data || null;
    } catch (error) {
      // 🎯 Manejar 404 como null (no hay configuración aún, no es un error)
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 404) {
        return null;
      }
      // 🎯 Para otros errores, lanzar el error para que TanStack Query lo maneje
      throw error;
    }
  },

  /**
   * Create cognitive task
   */
  create: async (data: CreateCognitiveTaskRequest): Promise<CognitiveTaskFormData> => {
    const response = await apiClient.post<ApiResponse<CognitiveTaskFormData>>(
      `/research/${data.researchId}/cognitive-task`,
      data
    );
    return response.data.data || response.data;
  },

  /**
   * Update cognitive task
   */
  update: async (researchId: string, data: UpdateCognitiveTaskRequest): Promise<CognitiveTaskFormData> => {
    const response = await apiClient.put<ApiResponse<CognitiveTaskFormData>>(
      `/research/${researchId}/cognitive-task`,
      data
    );
    return response.data.data || response.data;
  },

  /**
   * Delete cognitive task
   */
  delete: async (researchId: string): Promise<void> => {
    await apiClient.delete(`/research/${researchId}/cognitive-task`);
  },

  /**
   * Validate cognitive task configuration
   */
  validate: async (researchId: string): Promise<ValidationResponse> => {
    const response = await apiClient.get<ValidationResponse>(`/research/${researchId}/cognitive-task/validate`);
    return response.data;
  }
};