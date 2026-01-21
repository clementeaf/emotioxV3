import apiClient from './api/client';
import { configService } from './api/config.service';
import type { ApiErrorResponse } from './api/types';
import type { ResearchTechnique } from './researchTechniques.service';

export interface ResearchType {
    id: string;
    name: string;
    description?: string;
    default_modules?: any[];
    created_at: string;
    updated_at: string;
    created_by?: string;
    is_active?: boolean;
    research_techniques?: ResearchTechnique[];
}

export interface CreateResearchTypeData {
    name: string;
    description?: string;
    research_technique_ids?: string[];
    settings?: Record<string, unknown>;
}

export interface UpdateResearchTypeData {
    name?: string;
    description?: string;
    research_technique_ids?: string[];
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
            const endpoint = configService.getEndpoint('researchTypes', 'list');
            return await apiClient.get<ResearchTypeListResponse>(endpoint);
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
            const endpoint = configService.getEndpoint('researchTypes', 'getById', { id });
            return await apiClient.get<ResearchTypeResponse>(endpoint);
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
            const endpoint = configService.getEndpoint('researchTypes', 'create');
            return await apiClient.post<ResearchTypeResponse>(endpoint, data);
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
            const endpoint = configService.getEndpoint('researchTypes', 'update', { id });
            return await apiClient.put<ResearchTypeResponse>(endpoint, data);
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
            const endpoint = configService.getEndpoint('researchTypes', 'delete', { id });
            return await apiClient.delete<DeleteResponse>(endpoint);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete research type');
        }
    }

    /**
     * Obtiene las técnicas de investigación asociadas a un tipo de investigación
     * @param id - ID del tipo de investigación
     * @returns Lista de técnicas de investigación
     */
    async getTechniquesByType(id: string): Promise<ResearchTechnique[]> {
        try {
            console.log('[ResearchTypesService] getTechniquesByType called with id:', id);
            console.log('[ResearchTypesService] Making GET request to:', `/research-types/${id}/techniques`);
            
            const response = await apiClient.get<{ researchTechniques: ResearchTechnique[] }>(
                `/research-types/${id}/techniques`
            );
            
            console.log('[ResearchTypesService] Received response:', response);
            console.log('[ResearchTypesService] Response type:', typeof response);
            console.log('[ResearchTypesService] Response isArray:', Array.isArray(response));
            
            // Ensure we always return an array, even if the response structure is different
            if (!response) {
                console.warn('[ResearchTypesService] Empty response from getTechniquesByType');
                return [];
            }
            if (Array.isArray(response)) {
                // If response is directly an array (shouldn't happen, but handle it)
                console.log('[ResearchTypesService] Response is directly an array, returning as-is');
                return response;
            }
            if (response.researchTechniques && Array.isArray(response.researchTechniques)) {
                console.log('[ResearchTypesService] Found researchTechniques array with', response.researchTechniques.length, 'items');
                return response.researchTechniques;
            }
            console.warn('[ResearchTypesService] Unexpected response format from getTechniquesByType:', response);
            console.warn('[ResearchTypesService] Response keys:', Object.keys(response));
            return [];
        } catch (error: unknown) {
            console.error('[ResearchTypesService] ERROR in getTechniquesByType:', error);
            console.error('[ResearchTypesService] Error type:', typeof error);
            
            if (error instanceof Error) {
                console.error('[ResearchTypesService] Error message:', error.message);
                console.error('[ResearchTypesService] Error stack:', error.stack);
            }
            
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number; data?: unknown; statusText?: string } };
                console.error('[ResearchTypesService] Axios error details:', {
                    status: axiosError.response?.status,
                    statusText: axiosError.response?.statusText,
                    data: axiosError.response?.data,
                });
            }
            
            throw this.handleError(error, 'Failed to fetch research techniques');
        }
    }

    /**
     * Obtiene los module templates asignados a un tipo de investigación
     */
    async getModuleAssignments(id: string): Promise<string[]> {
        const response = await apiClient.get<{ moduleTemplates: { id: string }[] }>(
            `/research-types/${id}/module-assignments`
        );
        return response.moduleTemplates.map(m => m.id);
    }

    /**
     * Actualiza los module templates asignados a un tipo de investigación
     */
    async updateModuleAssignments(id: string, moduleTemplateIds: string[]): Promise<{ success: boolean }> {
        return await apiClient.put<{ success: boolean }>(
            `/research-types/${id}/module-assignments`,
            { moduleTemplateIds }
        );
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

