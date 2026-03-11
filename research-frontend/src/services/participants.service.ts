import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';

export interface Participant {
  id: string;
  research_id: string;
  participant_id: string;
  email: string | null;
  name: string | null;
  external_id: string | null;
  status: 'pending' | 'responded' | 'disqualified' | 'overquota';
  invited_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  participants: Participant[];
}

interface ListResponse {
  participants: Participant[];
}

const handleError = (err: unknown, defaultMessage: string): never => {
  const axiosError = err as ApiErrorResponse;
  const message = axiosError.response?.data?.error || defaultMessage;
  throw new Error(message);
};

export const participantsService = {
  async list(researchId: string): Promise<Participant[]> {
    try {
      const data = await apiClient.get<ListResponse>(`/participants/${researchId}`);
      return data.participants;
    } catch (err) {
      return handleError(err, 'Failed to load participants');
    }
  },

  async importCSV(researchId: string, csvText: string): Promise<ImportResult> {
    try {
      return await apiClient.post<ImportResult>(`/participants/${researchId}/import`, { csv: csvText });
    } catch (err) {
      return handleError(err, 'Failed to import participants');
    }
  },

  async deleteOne(researchId: string, participantDbId: string): Promise<void> {
    try {
      await apiClient.delete(`/participants/${researchId}/${participantDbId}`);
    } catch (err) {
      handleError(err, 'Failed to delete participant');
    }
  },

  async deleteAll(researchId: string): Promise<void> {
    try {
      await apiClient.delete(`/participants/${researchId}`);
    } catch (err) {
      handleError(err, 'Failed to delete participants');
    }
  },
};
