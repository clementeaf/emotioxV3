import apiClient from './api/client';

export interface ModuleTemplate {
    id: string;
    name: string;
    description?: string;
    structure: Record<string, unknown>[];
    created_by: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateModuleTemplateData {
    name: string;
    description?: string;
    structure?: Record<string, unknown>[];
}

export interface UpdateModuleTemplateData {
    name?: string;
    description?: string;
    structure?: Record<string, unknown>[];
}

export const moduleTemplatesService = {
    list: async (): Promise<ModuleTemplate[]> => {
        const response = await apiClient.get<ModuleTemplate[]>('/module-templates');
        return response;
    },

    getById: async (id: string): Promise<ModuleTemplate> => {
        const response = await apiClient.get<ModuleTemplate>(`/module-templates/${id}`);
        return response;
    },

    create: async (data: CreateModuleTemplateData): Promise<ModuleTemplate> => {
        const response = await apiClient.post<ModuleTemplate>('/module-templates', data);
        return response;
    },

    update: async (id: string, data: UpdateModuleTemplateData): Promise<ModuleTemplate> => {
        const response = await apiClient.put<ModuleTemplate>(`/module-templates/${id}`, data);
        return response;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/module-templates/${id}`);
    },
};
