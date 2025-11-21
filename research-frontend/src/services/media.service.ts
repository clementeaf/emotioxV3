import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';

export interface Media {
    id: string;
    research_id: string;
    question_id?: string;
    s3_key: string;
    file_name: string;
    content_type: string;
    file_size?: number;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface GenerateUploadUrlData {
    research_id: string;
    file_name: string;
    content_type: string;
}

export interface UploadUrlResponse {
    upload_url: string;
    s3_key: string;
    expires_in: number;
}

export interface SaveMediaData {
    research_id: string;
    question_id?: string;
    s3_key: string;
    metadata?: Record<string, unknown>;
}

export interface MediaResponse {
    media: Media;
}

export interface MediaUrlResponse {
    url: string;
    expires_in: number;
}

export interface DeleteResponse {
    message: string;
}

/**
 * Servicio de medios
 * Maneja todas las operaciones relacionadas con archivos multimedia
 */
class MediaService {
    /**
     * Genera una URL de subida para un archivo
     * @param data - Datos del archivo a subir
     * @returns URL de subida y clave S3
     * @throws ApiErrorResponse si falla la generación
     */
    async generateUploadUrl(data: GenerateUploadUrlData): Promise<UploadUrlResponse> {
        try {
            return await apiClient.post<UploadUrlResponse>('/media/upload', data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to generate upload URL');
        }
    }

    /**
     * Guarda los metadatos de un archivo subido
     * @param data - Metadatos del archivo
     * @returns Media creado
     * @throws ApiErrorResponse si falla la creación
     */
    async saveMetadata(data: SaveMediaData): Promise<MediaResponse> {
        try {
            return await apiClient.post<MediaResponse>('/media', data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to save media metadata');
        }
    }

    /**
     * Obtiene la URL de descarga de un archivo
     * @param id - ID del media
     * @returns URL de descarga
     * @throws ApiErrorResponse si falla la petición
     */
    async getMediaUrl(id: string): Promise<MediaUrlResponse> {
        try {
            return await apiClient.get<MediaUrlResponse>(`/media/${id}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to get media URL');
        }
    }

    /**
     * Elimina un archivo multimedia
     * @param id - ID del media
     * @returns Mensaje de confirmación
     * @throws ApiErrorResponse si falla la eliminación
     */
    async delete(id: string): Promise<DeleteResponse> {
        try {
            return await apiClient.delete<DeleteResponse>(`/media/${id}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete media');
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

export const mediaService = new MediaService();

