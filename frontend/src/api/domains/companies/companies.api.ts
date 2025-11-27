/**
 * Companies Domain API
 */

import { apiClient } from '@/api/config/axios';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest, ApiResponse } from './companies.types';

export const companiesApi = {
  /**
   * Get all companies
   */
  getAll: async (): Promise<ApiResponse<Company[]>> => {
    const response = await apiClient.get<ApiResponse<Company[]>>('/companies');
    return response.data;
  },

  /**
   * Get company by ID
   */
  getById: async (id: string): Promise<ApiResponse<Company>> => {
    const response = await apiClient.get<ApiResponse<Company>>(`/companies/${id}`);
    return response.data;
  },

  /**
   * Create new company
   */
  create: async (data: CreateCompanyRequest): Promise<ApiResponse<Company>> => {
    const response = await apiClient.post<ApiResponse<Company>>('/companies', data);
    return response.data;
  },

  /**
   * Update company
   */
  update: async (id: string, data: UpdateCompanyRequest): Promise<ApiResponse<Company>> => {
    const response = await apiClient.put<ApiResponse<Company>>(`/companies/${id}`, data);
    return response.data;
  },

  /**
   * Delete company
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/companies/${id}`);
    return response.data;
  },
};