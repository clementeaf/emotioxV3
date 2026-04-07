import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';

export interface DefaultStageRef {
    name: string;
    order: number;
    is_default: boolean;
}

export interface ResearchTechnique {
    id: string;
    name: string;
    description: string;
    default_stages?: DefaultStageRef[] | null;
    created_by: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateResearchTechniqueData {
    name: string;
    description: string;
}

export interface UpdateResearchTechniqueData {
    name?: string;
    description?: string;
}

export interface ResearchTechniqueResponse {
    researchTechnique: ResearchTechnique;
}

export interface ResearchTechniqueListResponse {
    researchTechniques: ResearchTechnique[];
}

export interface DeleteResponse {
    message: string;
}

/**
 * Servicio de técnicas de investigación
 * Maneja todas las operaciones relacionadas con técnicas de investigación (solo admin)
 */
class ResearchTechniquesService {
    /**
     * Obtiene la lista de técnicas de investigación
     * @returns Lista de técnicas de investigación
     * @throws ApiErrorResponse si falla la petición
     */
    async list(): Promise<ResearchTechniqueListResponse> {
        try {
            return await apiClient.get<ResearchTechniqueListResponse>('/research-techniques');
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch research techniques');
        }
    }

    /**
     * Obtiene una técnica de investigación por ID
     * @param id - ID de la técnica de investigación
     * @returns Técnica de investigación
     * @throws ApiErrorResponse si falla la petición
     */
    async getById(id: string): Promise<ResearchTechniqueResponse> {
        try {
            return await apiClient.get<ResearchTechniqueResponse>(`/research-techniques/${id}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch research technique');
        }
    }

    /**
     * Crea una nueva técnica de investigación
     * @param data - Datos de la técnica de investigación
     * @returns Técnica de investigación creada
     * @throws ApiErrorResponse si falla la creación
     */
    async create(data: CreateResearchTechniqueData): Promise<ResearchTechniqueResponse> {
        try {
            return await apiClient.post<ResearchTechniqueResponse>('/research-techniques', data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to create research technique');
        }
    }

    /**
     * Actualiza una técnica de investigación
     * @param id - ID de la técnica de investigación
     * @param data - Datos a actualizar
     * @returns Técnica de investigación actualizada
     * @throws ApiErrorResponse si falla la actualización
     */
    async update(id: string, data: UpdateResearchTechniqueData): Promise<ResearchTechniqueResponse> {
        try {
            return await apiClient.put<ResearchTechniqueResponse>(`/research-techniques/${id}`, data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to update research technique');
        }
    }

    /**
     * Elimina una técnica de investigación
     * @param id - ID de la técnica de investigación
     * @returns Mensaje de confirmación
     * @throws ApiErrorResponse si falla la eliminación
     */
    async delete(id: string): Promise<DeleteResponse> {
        try {
            return await apiClient.delete<DeleteResponse>(`/research-techniques/${id}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete research technique');
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

export const researchTechniquesService = new ResearchTechniquesService();

