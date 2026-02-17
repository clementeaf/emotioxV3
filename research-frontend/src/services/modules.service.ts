import apiClient from './api/client';
import { configService } from './api/config.service';
import type { ApiErrorResponse } from './api/types';
import { moduleTemplatesService } from './moduleTemplates.service';

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

export interface CreateModuleFromTemplateData {
    research_id: string;
    stage_id: string;
    template_id: string;
    order_index?: number;
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
            const endpoint = configService.getEndpoint('modules', 'create');
            return await apiClient.post<ModuleResponse>(endpoint, data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to create module');
        }
    }

    /**
     * Obtiene un módulo por su ID
     * @param id - ID del módulo
     * @param researchId - ID de la investigación (opcional, para fallback)
     * @returns Módulo encontrado
     * @throws ApiErrorResponse si falla la búsqueda
     */
    async getById(id: string, researchId?: string): Promise<ModuleResponse> {
        try {
            // Intenta primero con el endpoint estándar /modules/:id
            let endpoint: string;
            try {
                endpoint = configService.getEndpoint('modules', 'getById', { id });
            } catch {
                endpoint = `/modules/${id}`;
            }

            return await apiClient.get<ModuleResponse>(endpoint);
        } catch (error: unknown) {
            // Si falla y tenemos researchId, intentamos con el endpoint anidado
            if (researchId) {
                try {
                    const fallbackEndpoint = `/research/${researchId}/modules/${id}`;
                    return await apiClient.get<ModuleResponse>(fallbackEndpoint);
                } catch {
                    // Si también falla, lanzamos el error original
                    throw this.handleError(error, 'Failed to fetch module');
                }
            }
            throw this.handleError(error, 'Failed to fetch module');
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
            const endpoint = configService.getEndpoint('modules', 'update', { id });
            return await apiClient.put<ModuleResponse>(endpoint, data);
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
            const endpoint = `/modules/${researchId}/reorder`;
            return await apiClient.post<{ message: string }>(endpoint, { modules });
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to reorder modules');
        }
    }

    /**
     * Actualiza el order_index de múltiples módulos en un stage
     * @param stageId - ID del stage
     * @param updates - Array de {moduleId, order_index}
     * @returns Resultado de la operación
     * @throws ApiErrorResponse si falla la operación
     */
    async updateModulesOrder(
        stageId: string,
        updates: Array<{ moduleId: string; order_index: number }>
    ): Promise<{ message: string }> {
        try {
            const endpoint = `/stages/${stageId}/modules/reorder`;
            return await apiClient.put<{ message: string }>(endpoint, { updates });
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to update modules order');
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
            const endpoint = configService.getEndpoint('modules', 'delete', { id });
            return await apiClient.delete<DeleteResponse>(endpoint);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete module');
        }
    }

    /**
     * Crea un módulo desde un template
     * @param data - Datos para crear el módulo desde template
     * @returns Módulo creado
     * @throws ApiErrorResponse si falla la creación
     */
    async createFromTemplate(data: CreateModuleFromTemplateData): Promise<ModuleResponse> {
        try {
            // Get the template
            const template = await moduleTemplatesService.getById(data.template_id);

            // Prepare module data using template structure
            const moduleData = {
                research_id: data.research_id,
                stage_id: data.stage_id,
                name: template.name,
                description: template.description,
                order_index: data.order_index ?? 0,
                is_from_template: true,
                config: {
                    structure: template.structure
                }
            };

            const endpoint = configService.getEndpoint('modules', 'create');
            return await apiClient.post<ModuleResponse>(endpoint, moduleData);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to create module from template');
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

