import apiClient from './api/client';
import type { StageTemplate, StageTemplateWithModules } from '../types/moduleBuilder.types';

export interface CreateStageTemplateData {
    name: string;
    description?: string;
}

export interface UpdateStageTemplateData {
    name?: string;
    description?: string;
}

export interface AddModuleToStageData {
    moduleId: string;
    displayOrder?: number;
}

export const stageTemplatesService = {
    async getAll(): Promise<StageTemplateWithModules[]> {
        return await apiClient.get<StageTemplateWithModules[]>('/stage-templates');
    },

    async getById(id: string): Promise<StageTemplateWithModules> {
        return await apiClient.get<StageTemplateWithModules>(`/stage-templates/${id}`);
    },

    async create(data: CreateStageTemplateData): Promise<StageTemplate> {
        return await apiClient.post<StageTemplate>('/stage-templates', data);
    },

    async update(id: string, data: UpdateStageTemplateData): Promise<StageTemplate> {
        return await apiClient.put<StageTemplate>(`/stage-templates/${id}`, data);
    },

    async delete(id: string): Promise<{ message: string }> {
        return await apiClient.delete<{ message: string }>(`/stage-templates/${id}`);
    },

    async addModule(stageId: string, data: AddModuleToStageData): Promise<any> {
        return await apiClient.post(`/stage-templates/${stageId}/modules`, data);
    },

    async removeModule(stageId: string, moduleId: string): Promise<{ message: string }> {
        return await apiClient.delete<{ message: string }>(`/stage-templates/${stageId}/modules/${moduleId}`);
    },
};
