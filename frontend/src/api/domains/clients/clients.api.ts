/**
 * Clients Domain API Methods
 * All API calls for clients functionality using Axios
 */

import { apiClient } from '@/api/config/axios';
import type {
  ApiResponse,
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  ClientsListParams
} from './clients.types';

/**
 * Clients API Methods
 */
export const clientsApi = {
  /**
   * Get all clients
   */
  getAll: async (params?: ClientsListParams): Promise<Client[]> => {
    const response = await apiClient.get<ApiResponse<Client[]>>('/clients', { params });
    return response.data.data || [];
  },

  /**
   * Get client by ID
   */
  getById: async (id: string): Promise<Client | null> => {
    try {
      const response = await apiClient.get<ApiResponse<Client>>(`/clients/${id}`);
      return response.data.data;
    } catch (error) {
      if ((error as any)?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create new client
   */
  create: async (data: CreateClientRequest): Promise<Client> => {
    const response = await apiClient.post<ApiResponse<Client>>('/clients', data);
    return response.data.data;
  },

  /**
   * Update client
   */
  update: async (id: string, data: UpdateClientRequest): Promise<Client> => {
    const response = await apiClient.put<ApiResponse<Client>>(`/clients/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete client
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/clients/${id}`);
  },

  /**
   * Get clients from research data (special case for this app)
   * Since clients are derived from research data
   */
  getFromResearch: async (): Promise<Client[]> => {
    try {
      const response = await apiClient.get('/research');
      const researchData = Array.isArray(response.data) ? response.data : response.data.data || [];

      // Transform research data to clients
      const clientsMap = new Map<string, Client>();

      researchData.forEach((research: any) => {
        const companyId = research.companyId || research.basic?.companyId;
        const companyName = research.companyName || research.basic?.enterprise || research.basic?.title || 'Unknown';

        if (companyId && !clientsMap.has(companyId)) {
          clientsMap.set(companyId, {
            id: companyId,
            name: companyName,
            company: companyName,
            email: research.contactEmail || undefined,
            status: 'active' as const,
            researchCount: 1,
            lastActivity: research.updatedAt || research.createdAt || new Date().toISOString(),
            createdAt: research.createdAt || new Date().toISOString(),
            updatedAt: research.updatedAt || new Date().toISOString()
          });
        } else if (companyId) {
          // Update existing client's research count
          const existingClient = clientsMap.get(companyId)!;
          existingClient.researchCount += 1;
          if (new Date(research.updatedAt) > new Date(existingClient.lastActivity)) {
            existingClient.lastActivity = research.updatedAt;
          }
        }
      });

      return Array.from(clientsMap.values());
    } catch (error) {
      console.error('Failed to get clients from research:', error);
      return [];
    }
  }
};