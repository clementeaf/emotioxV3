import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';

export interface Module {
    id: string;
    research_id: string;
    module_type: string;
    order: number;
    config?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface CreateModuleData {
    research_id: string;
    module_type: string;
    order?: number;
    config?: Record<string, unknown>;
}

export interface UpdateModuleData {
    module_type?: string;
    order?: number;
    config?: Record<string, unknown>;
}

export interface ReorderModulesData {
    modules: string[];
}

export interface ModuleResponse {
    module: Module;
}

export interface DeleteResponse {
    message: string;
}

/**
 * Servicio de módulos
 * Maneja todas las operaciones relacionadas con módulos de investigación
 */
class ModulesService {
    /**
     * Crea un nuevo módulo
     * @param data - Datos del módulo
     * @returns Módulo creado
     * @throws ApiErrorResponse si falla la creación
     */
    async create(data: CreateModuleData): Promise<ModuleResponse> {
        try {
            return await apiClient.post<ModuleResponse>('/modules', data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to create module');
        }
    }

    /**
     * Actualiza un módulo
     * @param id - ID del módulo
     * @param data - Datos a actualizar
     * @returns Módulo actualizado
     * @throws ApiErrorResponse si falla la actualización
     */
    async update(id: string, data: UpdateModuleData): Promise<ModuleResponse> {
        try {
            return await apiClient.put<ModuleResponse>(`/modules/${id}`, data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to update module');
        }
    }

    /**
     * Reordena los módulos de una investigación
     * @param researchId - ID de la investigación
     * @param modules - Lista de IDs de módulos en el nuevo orden
     * @returns Resultado de la operación
     * @throws ApiErrorResponse si falla la operación
     */
    async reorder(researchId: string, modules: string[]): Promise<{ message: string }> {
        try {
            return await apiClient.post<{ message: string }>(`/modules/${researchId}/reorder`, { modules });
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to reorder modules');
        }
    }

    /**
     * Elimina un módulo
     * @param id - ID del módulo
     * @returns Mensaje de confirmación
     * @throws ApiErrorResponse si falla la eliminación
     */
    async delete(id: string): Promise<DeleteResponse> {
        try {
            return await apiClient.delete<DeleteResponse>(`/modules/${id}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete module');
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

export const modulesService = new ModulesService();

