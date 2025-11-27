/**
 * Research In Progress Domain API
 * Placeholder implementation for research progress functionality
 */

import { apiClient } from '@/api/config/axios';

export const researchInProgressApi = {
  /**
   * Get overview metrics
   */
  getOverviewMetrics: async (researchId: string): Promise<any> => {
    const response = await apiClient.get(`/research/${researchId}/metrics`);
    return response.data;
  },

  /**
   * Get participants with status
   */
  getParticipantsWithStatus: async (researchId: string): Promise<any> => {
    const response = await apiClient.get(`/research/${researchId}/participants/status`);
    return response.data;
  },

  /**
   * Get research configuration
   */
  getResearchConfiguration: async (researchId: string): Promise<any> => {
    const response = await apiClient.get(`/eye-tracking-recruit/research/${researchId}`);
    return response.data;
  },

  /**
   * Get participant details
   */
  getParticipantDetails: async (researchId: string, participantId: string): Promise<any> => {
    const response = await apiClient.get(`/research/${researchId}/participants/${participantId}`);
    return response.data;
  },

  /**
   * Delete participant
   */
  deleteParticipant: async (researchId: string, participantId: string): Promise<any> => {
    const response = await apiClient.delete(`/research/${researchId}/participants/${participantId}`);
    return response.data;
  },
};