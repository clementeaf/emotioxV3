import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';
import type { ResearchTechnique } from './researchTechniques.service';

export interface ResearchType {
    id: string;
    name: string;
    description?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface CreateResearchTypeData {
    name: string;
    description?: string;
    research_technique_id?: string;
    settings?: Record<string, unknown>;
}

export interface UpdateResearchTypeData {
    name?: string;
    description?: string;
}

export interface ResearchTypeResponse {
    researchType: ResearchType;
}

export interface ResearchTypeListResponse {
    researchTypes: ResearchType[];
}

export interface UpdateModulesData {
    modules: string[];
}

export interface DeleteResponse {
    message: string;
}

/**
 * Servicio de tipos de investigación
 * Maneja todas las operaciones relacionadas con tipos de investigación (solo admin)
 */
class ResearchTypesService {
    /**
     * Obtiene la lista de tipos de investigación
     * @returns Lista de tipos de investigación
     * @throws ApiErrorResponse si falla la petición
     */
    async list(): Promise<ResearchTypeListResponse> {
        try {
            return await apiClient.get<ResearchTypeListResponse>('/research-types');
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch research types');
        }
    }

    /**
     * Obtiene un tipo de investigación por ID
     * @param id - ID del tipo de investigación
     * @returns Tipo de investigación
     * @throws ApiErrorResponse si falla la petición
     */
    async getById(id: string): Promise<ResearchTypeResponse> {
        try {
            return await apiClient.get<ResearchTypeResponse>(`/research-types/${id}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch research type');
        }
    }

    /**
     * Crea un nuevo tipo de investigación
     * @param data - Datos del tipo de investigación
     * @returns Tipo de investigación creado
     * @throws ApiErrorResponse si falla la creación
     */
    async create(data: CreateResearchTypeData): Promise<ResearchTypeResponse> {
        try {
            return await apiClient.post<ResearchTypeResponse>('/research-types', data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to create research type');
        }
    }

    /**
     * Actualiza un tipo de investigación
     * @param id - ID del tipo de investigación
     * @param data - Datos a actualizar
     * @returns Tipo de investigación actualizado
     * @throws ApiErrorResponse si falla la actualización
     */
    async update(id: string, data: UpdateResearchTypeData): Promise<ResearchTypeResponse> {
        try {
            return await apiClient.put<ResearchTypeResponse>(`/research-types/${id}`, data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to update research type');
        }
    }

    /**
     * Actualiza los módulos de un tipo de investigación
     * @param id - ID del tipo de investigación
     * @param modules - Lista de IDs de módulos
     * @returns Tipo de investigación actualizado
     * @throws ApiErrorResponse si falla la actualización
     */
    async updateModules(id: string, modules: string[]): Promise<ResearchTypeResponse> {
        try {
            return await apiClient.patch<ResearchTypeResponse>(`/research-types/${id}/modules`, { modules });
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to update research type modules');
        }
    }

    /**
     * Elimina un tipo de investigación
     * @param id - ID del tipo de investigación
     * @returns Mensaje de confirmación
     * @throws ApiErrorResponse si falla la eliminación
     */
    async delete(id: string): Promise<DeleteResponse> {
        try {
            return await apiClient.delete<DeleteResponse>(`/research-types/${id}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete research type');
        }
    }

    /**
     * Obtiene las técnicas de investigación asociadas a un tipo de investigación
     * @param id - ID del tipo de investigación
     * @returns Lista de técnicas de investigación
     * @throws ApiErrorResponse si falla la petición
     */
    async getTechniquesByType(id: string): Promise<{ researchTechniques: ResearchTechnique[] }> {
        try {
            return await apiClient.get<{ researchTechniques: ResearchTechnique[] }>(`/research-types/${id}/techniques`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch research techniques for type');
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

export const researchTypesService = new ResearchTypesService();

