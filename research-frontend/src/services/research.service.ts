import apiClient from './api/client';
import { configService } from './api/config.service';
import type { ApiErrorResponse } from './api/types';

export interface Question {
    id: string;
    type: string;
    text: string;
    order: number;
    config: Record<string, unknown>;
    validation: Record<string, unknown>;
    required: boolean;
}

export interface Module {
    id: string;
    name: string;
    description?: string;
    order_index: number;
    is_from_template: boolean;
    config: Record<string, unknown>;
    questions: Question[];
}

export interface Stage {
    id: string;
    name: string;
    description?: string;
    order_index: number;
    stage_type?: 'single_module' | 'module_collection';
    modules: Module[];
}

export interface Research {
    id: string;
    name: string;
    description?: string;
    status: string;
    research_type_id: string;
    research_type_name?: string;
    research_technique_name?: string;
    enterprise_name?: string;
    technique_default_stages?: { name: string; order: number; is_default?: boolean }[] | null;
    created_by?: string;
    creator_first_name?: string;
    creator_last_name?: string;
    creator_email?: string;
    created_at: string;
    updated_at: string;
    stages?: Stage[];
    settings?: Record<string, unknown>;
}

export interface CreateResearchData {
    name: string;
    description?: string;
    research_type_id: string;
    enterprise_id?: string;
    research_technique_id?: string;
    settings?: Record<string, unknown>;
}

export interface UpdateResearchData {
    title?: string;
    name?: string;
    description?: string;
    research_type_id?: string;
    settings?: Record<string, unknown>;
}

export interface ResearchResponse {
    research: Research;
}

export interface ResearchListResponse {
    researches: Research[];
}

export interface UpdateStatusData {
    status: string;
}

export interface DeleteResponse {
    message: string;
}

/**
 * Servicio de investigaciones
 * Maneja todas las operaciones relacionadas con investigaciones
 */
class ResearchService {
    /**
     * Obtiene la lista de investigaciones del usuario
     * @returns Lista de investigaciones
     * @throws ApiErrorResponse si falla la petición
     */
    async list(): Promise<ResearchListResponse> {
        try {
            console.log('[ResearchService] list() called');
            const endpoint = configService.getEndpoint('research', 'list');
            console.log('[ResearchService] Fetching list from endpoint:', endpoint);
            console.log('[ResearchService] API base URL:', apiClient.getInstance().defaults.baseURL);
            
            const response = await apiClient.get<ResearchListResponse>(endpoint);
            console.log('[ResearchService] Raw response received:', response);
            console.log('[ResearchService] Response type:', typeof response);
            console.log('[ResearchService] Response has researches:', 'researches' in response);
            
            if (!response) {
                console.error('[ResearchService] Empty response received');
                throw new Error('Empty response from server');
            }
            
            if (!response.researches) {
                console.error('[ResearchService] Response missing researches property:', response);
                throw new Error('Invalid response format: missing researches property');
            }
            
            console.log('[ResearchService] Returning', response.researches.length, 'researches');
            return response;
        } catch (error: unknown) {
            console.error('[ResearchService] ERROR in list():', error);
            console.error('[ResearchService] Error type:', typeof error);
            console.error('[ResearchService] Error constructor:', error?.constructor?.name);
            
            if (error instanceof Error) {
                console.error('[ResearchService] Error message:', error.message);
                console.error('[ResearchService] Error stack:', error.stack);
            }
            
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number; data?: unknown; statusText?: string } };
                console.error('[ResearchService] Axios error details:', {
                    status: axiosError.response?.status,
                    statusText: axiosError.response?.statusText,
                    data: axiosError.response?.data,
                });
            }
            
            throw this.handleError(error, 'Failed to fetch researches');
        }
    }

    /**
     * Obtiene una investigación por ID
     * @param id - ID de la investigación
     * @returns Investigación
     * @throws ApiErrorResponse si falla la petición
     */
    async getById(id: string): Promise<ResearchResponse> {
        try {
            const endpoint = configService.getEndpoint('research', 'getById', { id });
            return await apiClient.get<ResearchResponse>(endpoint);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch research');
        }
    }

    /**
     * Crea una nueva investigación
     * @param data - Datos de la investigación
     * @returns Investigación creada
     * @throws ApiErrorResponse si falla la creación
     */
    async create(data: CreateResearchData): Promise<ResearchResponse> {
        try {
            const endpoint = configService.getEndpoint('research', 'create');
            return await apiClient.post<ResearchResponse>(endpoint, data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to create research');
        }
    }

    /**
     * Actualiza una investigación
     * @param id - ID de la investigación
     * @param data - Datos a actualizar
     * @returns Investigación actualizada
     * @throws ApiErrorResponse si falla la actualización
     */
    async update(id: string, data: UpdateResearchData): Promise<ResearchResponse> {
        try {
            const endpoint = configService.getEndpoint('research', 'update', { id });
            return await apiClient.put<ResearchResponse>(endpoint, data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to update research');
        }
    }

    /**
     * Actualiza el estado de una investigación
     * @param id - ID de la investigación
     * @param status - Nuevo estado
     * @returns Investigación actualizada
     * @throws ApiErrorResponse si falla la actualización
     */
    async updateStatus(id: string, status: string): Promise<ResearchResponse> {
        try {
            const endpoint = `/research/${id}/status`;
            return await apiClient.patch<ResearchResponse>(endpoint, { status });
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to update research status');
        }
    }

    /**
     * Activa una investigación cambiando su estado a 'active'
     * @param id - ID de la investigación
     * @returns Investigación actualizada
     * @throws ApiErrorResponse si falla la activación
     */
    async activate(id: string): Promise<ResearchResponse> {
        try {
            const endpoint = configService.getEndpoint('research', 'activate', { id });
            return await apiClient.post<ResearchResponse>(endpoint);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to activate research');
        }
    }

    /**
     * Elimina una investigación
     * @param id - ID de la investigación
     * @returns Mensaje de confirmación
     * @throws ApiErrorResponse si falla la eliminación
     */
    async delete(id: string): Promise<DeleteResponse> {
        try {
            const endpoint = configService.getEndpoint('research', 'delete', { id });
            return await apiClient.delete<DeleteResponse>(endpoint);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete research');
        }
    }

    /**
     * Crea un nuevo stage en un research
     * @param researchId - ID del research
     * @param name - Nombre del stage
     * @param description - Descripción opcional del stage
     * @returns Stage creado
     * @throws ApiErrorResponse si falla la creación
     */
    async addStage(researchId: string, name: string, description?: string, defaultModuleName?: string): Promise<{ stage: Stage }> {
        try {
            const endpoint = configService.getEndpoint('research', 'stages', { id: researchId });
            return await apiClient.post<{ stage: Stage }>(endpoint, {
                name,
                description,
                ...(defaultModuleName ? { defaultModuleName } : {}),
            });
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to add stage');
        }
    }

    /**
     * Elimina un stage de un research
     * @param researchId - ID del research
     * @param stageId - ID del stage a eliminar
     * @returns Mensaje de confirmación
     * @throws ApiErrorResponse si falla la eliminación
     */
    async deleteStage(researchId: string, stageId: string): Promise<DeleteResponse> {
        try {
            return await apiClient.delete<DeleteResponse>(`/research/${researchId}/stages/${stageId}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete stage');
        }
    }

    /**
     * Elimina un módulo de un research
     * @param researchId - ID del research
     * @param moduleId - ID del módulo a eliminar
     * @returns Mensaje de confirmación
     * @throws ApiErrorResponse si falla la eliminación
     */
    async deleteModule(researchId: string, moduleId: string): Promise<DeleteResponse> {
        try {
            return await apiClient.delete<DeleteResponse>(`/research/${researchId}/modules/${moduleId}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete module');
        }
    }

    /**
     * Agrega Welcome Screen y Thank You Screen a un research si no existen
     * @param researchId - ID del research
     * @returns Información sobre qué stages se agregaron
     * @throws ApiErrorResponse si falla la operación
     */
    async addWelcomeAndThankYouStages(researchId: string): Promise<{ result: { added: string[]; alreadyExists: string[] } }> {
        try {
            return await apiClient.post<{ result: { added: string[]; alreadyExists: string[] } }>(
                `/research/${researchId}/add-welcome-thankyou`
            );
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to add Welcome and Thank You stages');
        }
    }

    async duplicate(id: string): Promise<ResearchResponse> {
        try {
            return await apiClient.post<ResearchResponse>(`/research/${id}/duplicate`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to duplicate research');
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

export const researchService = new ResearchService();

