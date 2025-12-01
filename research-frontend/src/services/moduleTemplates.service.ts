import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';

export interface ModuleTemplate {
    id: string;
    name: string;
    description?: string;
    structure: Record<string, unknown>;
    created_by: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateModuleTemplateData {
    name: string;
    description?: string;
    structure?: Record<string, unknown>;
}

export interface UpdateModuleTemplateData {
    name?: string;
    description?: string;
    structure?: Record<string, unknown>;
}

/**
 * Handles API errors and extracts error messages from backend responses
 * @param error - Caught error
 * @param defaultMessage - Default message if cannot be extracted
 * @returns Error with formatted message
 */
const handleError = (error: unknown, defaultMessage: string): Error => {
    if (error instanceof Error) {
        return error;
    }

    if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as ApiErrorResponse;
        const message = axiosError.response?.data?.error || defaultMessage;
        return new Error(message);
    }

    return new Error(defaultMessage);
};

export const moduleTemplatesService = {
    list: async (): Promise<ModuleTemplate[]> => {
        try {
            const response = await apiClient.get<ModuleTemplate[]>('/module-templates');
            return response;
        } catch (error: unknown) {
            throw handleError(error, 'Failed to load module templates');
        }
    },

    getById: async (id: string): Promise<ModuleTemplate> => {
        try {
            const response = await apiClient.get<ModuleTemplate>(`/module-templates/${id}`);
            return response;
        } catch (error: unknown) {
            throw handleError(error, 'Failed to load module template');
        }
    },

    create: async (data: CreateModuleTemplateData): Promise<ModuleTemplate> => {
        try {
            const response = await apiClient.post<ModuleTemplate>('/module-templates', data);
            return response;
        } catch (error: unknown) {
            throw handleError(error, 'Failed to create module template');
        }
    },

    update: async (id: string, data: UpdateModuleTemplateData): Promise<ModuleTemplate> => {
        try {
            const response = await apiClient.put<ModuleTemplate>(`/module-templates/${id}`, data);
            return response;
        } catch (error: unknown) {
            throw handleError(error, 'Failed to update module template');
        }
    },

    delete: async (id: string): Promise<void> => {
        try {
            await apiClient.delete(`/module-templates/${id}`);
        } catch (error: unknown) {
            throw handleError(error, 'Failed to delete module template');
        }
    },

    duplicate: async (id: string, newName?: string): Promise<ModuleTemplate> => {
        try {
            const original = await apiClient.get<ModuleTemplate>(`/module-templates/${id}`);
            const duplicateName = newName || `${original.name} (Copy)`;
            const data: CreateModuleTemplateData = {
                name: duplicateName,
                description: original.description,
                structure: original.structure,
            };
            const response = await apiClient.post<ModuleTemplate>('/module-templates', data);
            return response;
        } catch (error: unknown) {
            throw handleError(error, 'Failed to duplicate module template');
        }
    },

    bulkDelete: async (ids: string[]): Promise<void> => {
        try {
            await Promise.all(ids.map(id => apiClient.delete(`/module-templates/${id}`)));
        } catch (error: unknown) {
            throw handleError(error, 'Failed to delete module templates');
        }
    },

    getUsage: async (id: string): Promise<{ count: number; researches: Array<{ id: string; name: string }> }> => {
        try {
            const response = await apiClient.get<{ count: number; researches: Array<{ id: string; name: string }> }>(`/module-templates/${id}/usage`);
            return response;
        } catch (error: unknown) {
            throw handleError(error, 'Failed to get module usage');
        }
    },

    importFromJson: async (modules: Partial<ModuleTemplate>[]): Promise<{ imported: number; errors: string[] }> => {
        try {
            const results = {
                imported: 0,
                errors: [] as string[]
            };

            for (const module of modules) {
                try {
                    if (!module.name || !module.structure) {
                        results.errors.push(`Skipped invalid module: ${module.name || 'unnamed'}`);
                        continue;
                    }

                    const data: CreateModuleTemplateData = {
                        name: module.name,
                        description: module.description,
                        structure: module.structure,
                    };

                    await apiClient.post<ModuleTemplate>('/module-templates', data);
                    results.imported++;
                } catch (err) {
                    results.errors.push(`Failed to import "${module.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
            }

            return results;
        } catch (error: unknown) {
            throw handleError(error, 'Failed to import module templates');
        }
    },
};
