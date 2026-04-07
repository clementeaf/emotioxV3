import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';

export interface Enterprise {
    id: string;
    name: string;
    description?: string;
    created_by: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateEnterpriseData {
    name: string;
    description?: string;
}

export interface UpdateEnterpriseData {
    name?: string;
    description?: string;
}

export interface EnterpriseResponse {
    enterprise: Enterprise;
}

export interface EnterpriseListResponse {
    enterprises: Enterprise[];
}

export interface EnterpriseResearch {
    id: string;
    name: string;
    description?: string;
    status: string;
    enterprise_id: string;
    enterprise_name: string;
    research_type_name?: string;
    creator_first_name?: string;
    creator_last_name?: string;
    creator_email?: string;
    settings: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface EnterpriseResearchesResponse {
    researches: EnterpriseResearch[];
}

export interface DeleteResponse {
    message: string;
}

/**
 * Servicio de empresas
 * Maneja todas las operaciones relacionadas con empresas
 */
class EnterprisesService {
    /**
     * Obtiene la lista de empresas
     * @returns Lista de empresas
     * @throws ApiErrorResponse si falla la petición
     */
    async list(): Promise<EnterpriseListResponse> {
        try {
            return await apiClient.get<EnterpriseListResponse>('/enterprises');
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch enterprises');
        }
    }

    /**
     * Obtiene una empresa por ID
     * @param id - ID de la empresa
     * @returns Empresa
     * @throws ApiErrorResponse si falla la petición
     */
    async getById(id: string): Promise<EnterpriseResponse> {
        try {
            return await apiClient.get<EnterpriseResponse>(`/enterprises/${id}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch enterprise');
        }
    }

    /**
     * Crea una nueva empresa
     * @param data - Datos de la empresa
     * @returns Empresa creada
     * @throws ApiErrorResponse si falla la creación
     */
    async create(data: CreateEnterpriseData): Promise<EnterpriseResponse> {
        try {
            return await apiClient.post<EnterpriseResponse>('/enterprises', data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to create enterprise');
        }
    }

    /**
     * Actualiza una empresa
     * @param id - ID de la empresa
     * @param data - Datos a actualizar
     * @returns Empresa actualizada
     * @throws ApiErrorResponse si falla la actualización
     */
    async update(id: string, data: UpdateEnterpriseData): Promise<EnterpriseResponse> {
        try {
            return await apiClient.put<EnterpriseResponse>(`/enterprises/${id}`, data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to update enterprise');
        }
    }

    /**
     * Elimina una empresa
     * @param id - ID de la empresa
     * @returns Mensaje de confirmación
     * @throws ApiErrorResponse si falla la eliminación
     */
    async delete(id: string): Promise<DeleteResponse> {
        try {
            return await apiClient.delete<DeleteResponse>(`/enterprises/${id}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete enterprise');
        }
    }

    async listResearches(enterpriseId: string): Promise<EnterpriseResearchesResponse> {
        try {
            return await apiClient.get<EnterpriseResearchesResponse>(`/enterprises/${enterpriseId}/researches`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch enterprise researches');
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

export const enterprisesService = new EnterprisesService();

