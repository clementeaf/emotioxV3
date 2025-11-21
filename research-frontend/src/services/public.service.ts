import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';

export interface PublicResearch {
    id: string;
    title: string;
    description?: string;
    status: string;
    research_type_id: string;
    modules?: unknown[];
}

export interface PublicResearchResponse {
    research: PublicResearch;
}

export interface SaveResponseData {
    research_id: string;
    participant_id: string;
    responses: Array<{
        question_id: string;
        response_value: string | number | boolean | Record<string, unknown>;
    }>;
}

export interface Response {
    id: string;
    research_id: string;
    question_id: string;
    participant_id: string;
    response_value: string | number | boolean | Record<string, unknown>;
    created_at: string;
}

export interface SaveResponseResponse {
    response: Response;
}

/**
 * Servicio de API pública
 * Maneja operaciones públicas que no requieren autenticación
 */
class PublicService {
    /**
     * Obtiene una investigación pública por ID
     * @param researchId - ID de la investigación
     * @returns Investigación pública
     * @throws ApiErrorResponse si falla la petición
     */
    async getResearch(researchId: string): Promise<PublicResearchResponse> {
        try {
            return await apiClient.get<PublicResearchResponse>(`/public/research/${researchId}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch public research');
        }
    }

    /**
     * Guarda las respuestas de un participante
     * @param data - Datos de las respuestas
     * @returns Respuesta guardada
     * @throws ApiErrorResponse si falla la creación
     */
    async saveResponse(data: SaveResponseData): Promise<SaveResponseResponse> {
        try {
            return await apiClient.post<SaveResponseResponse>('/public/responses', data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to save response');
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

export const publicService = new PublicService();

