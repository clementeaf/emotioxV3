/**
 * Research Domain API
 */

import { apiClient } from '@/api/config/axios';
// import type {
//   Research,
//   CreateResearchRequest,
//   UpdateResearchRequest,
//   ResearchAPIResponse,
//   ResearchListParams
// } from './research.types'; // Comentado - tipos no existen

export const researchApi = {
  /**
   * Get all research
   */
  getAll: async (params?: any): Promise<any[]> => {
    const response = await apiClient.get<any[] | { data: any[] }>('/research', { params });
    // Handle both direct array response and wrapped response
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return (response.data as { data: any[] }).data || [];
  },

  /**
   * Get research by ID
   */
  getById: async (id: string): Promise<any> => {
    const response = await apiClient.get<{ data: any }>(`/research/${id}`);
    return response.data.data;
  },

  /**
   * Create new research
   */
  create: async (data: any): Promise<any> => {
    const response = await apiClient.post<{ data: any }>('/research', data);
    return response.data.data;
  },

  /**
   * Update research
   */
  update: async (id: string, data: any): Promise<any> => {
    const response = await apiClient.put<{ data: any }>(`/research/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete research
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/research/${id}`);
  },

  /**
   * Get user research
   */
  getUserResearch: async (): Promise<any[]> => {
    const response = await apiClient.get<{ data: any[] }>('/research/user');
    return response.data.data || [];
  },

  /**
   * Update research status
   */
  updateStatus: async (id: string, status: string): Promise<any> => {
    const response = await apiClient.patch<{ data: any }>(`/research/${id}/status`, { status });
    return response.data.data;
  },
};