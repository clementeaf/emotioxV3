import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';

export interface Response {
    id: string;
    research_id: string;
    question_id: string | null;
    module_id?: string | null;
    component_id?: string | null;
    participant_id: string;
    response_value: string | number | boolean | Record<string, unknown> | unknown[] | null;
    value?: string | number | boolean | Record<string, unknown> | unknown[] | null;
    created_at: string;
    updated_at: string;
}

export interface ResponsesListResponse {
    responses: Response[];
}

/**
 * Servicio de respuestas
 * Maneja todas las operaciones relacionadas con respuestas de participantes
 */
class ResponsesService {
    /**
     * Obtiene todas las respuestas de una investigación
     * @param researchId - ID de la investigación
     * @returns Lista de respuestas
     * @throws ApiErrorResponse si falla la petición
     */
    async getByResearch(researchId: string): Promise<ResponsesListResponse> {
        try {
            return await apiClient.get<ResponsesListResponse>(`/responses/research/${researchId}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch responses');
        }
    }

    /**
     * Obtiene las respuestas de un participante en una investigación
     * @param researchId - ID de la investigación
     * @param participantId - ID del participante
     * @returns Lista de respuestas
     * @throws ApiErrorResponse si falla la petición
     */
    async getByParticipant(researchId: string, participantId: string): Promise<ResponsesListResponse> {
        try {
            return await apiClient.get<ResponsesListResponse>(`/responses/research/${researchId}/participant/${participantId}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch participant responses');
        }
    }

    private handleError(error: unknown, defaultMessage: string): Error {
        if (error instanceof Error) {
            return error;
        }

        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as ApiErrorResponse;
            const message = axiosError.response?.data?.error || defaultMessage;
            return new Error(message);
        }

        return new Error(defaultMessage);
    }
}

export const responsesService = new ResponsesService();

