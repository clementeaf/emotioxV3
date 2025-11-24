import axios from 'axios';
import type { StageTemplate, StageTemplateWithModules } from '../types/moduleBuilder.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

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
        const response = await api.get<StageTemplateWithModules[]>('/stage-templates');
        return response.data;
    },

    async getById(id: string): Promise<StageTemplateWithModules> {
        const response = await api.get<StageTemplateWithModules>(`/stage-templates/${id}`);
        return response.data;
    },

    async create(data: CreateStageTemplateData): Promise<StageTemplate> {
        const response = await api.post<StageTemplate>('/stage-templates', data);
        return response.data;
    },

    async update(id: string, data: UpdateStageTemplateData): Promise<StageTemplate> {
        const response = await api.put<StageTemplate>(`/stage-templates/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<{ message: string }> {
        const response = await api.delete<{ message: string }>(`/stage-templates/${id}`);
        return response.data;
    },

    async addModule(stageId: string, data: AddModuleToStageData): Promise<any> {
        const response = await api.post(`/stage-templates/${stageId}/modules`, data);
        return response.data;
    },

    async removeModule(stageId: string, moduleId: string): Promise<{ message: string }> {
        const response = await api.delete<{ message: string }>(`/stage-templates/${stageId}/modules/${moduleId}`);
        return response.data;
    },
};
