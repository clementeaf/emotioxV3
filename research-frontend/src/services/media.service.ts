import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';
import { configService } from './api/config.service';

/**
 * Resolves a relative media URL against the backend origin.
 * Backend returns paths like /api/media/research/... which need the backend origin prepended
 * when the frontend runs on a different origin (e.g. localhost dev).
 */
function resolveMediaUrl(url: string): string {
    if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
        return url;
    }
    try {
        const baseUrl = configService.getBaseUrl(); // e.g. https://emotio.cx/api
        const origin = new URL(baseUrl).origin;     // e.g. https://emotio.cx
        return `${origin}${url}`;
    } catch {
        return url;
    }
}

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
    id?: string;
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
            const result = await apiClient.post<UploadUrlResponse>('/media/upload', data);
            result.upload_url = resolveMediaUrl(result.upload_url);
            return result;
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
            const result = await apiClient.get<MediaUrlResponse>(`/media/${id}`);
            result.url = resolveMediaUrl(result.url);
            return result;
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to get media URL');
        }
    }

    /**
     * Obtiene la URL de descarga de un archivo por su s3Key
     * @param s3Key - Clave S3 del archivo
     * @returns URL de descarga y ID del media
     * @throws ApiErrorResponse si falla la petición
     */
    async getMediaUrlByS3Key(s3Key: string): Promise<MediaUrlResponse> {
        try {
            const result = await apiClient.get<MediaUrlResponse>(`/media/by-key?s3_key=${encodeURIComponent(s3Key)}`);
            result.url = resolveMediaUrl(result.url);
            return result;
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to get media URL by s3Key');
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

    /**
     * Starts attention prediction on a stimulus image (async — returns immediately).
     * The backend processes in background and saves heatmapData to research config.
     */
    async predictAttention(researchId: string, mediaId: string, threshold?: number): Promise<{ status: string; mediaId: string }> {
        try {
            return await apiClient.post<{ status: string; mediaId: string }>(
                `/attention-prediction/research/${researchId}/predict/${mediaId}`,
                threshold != null ? { threshold } : {}
            );
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to start attention prediction');
        }
    }

    /**
     * Checks prediction status for a stimulus.
     */
    async getPredictionStatus(researchId: string, mediaId: string): Promise<{ status: string; pointCount: number; processedAt: string | null }> {
        try {
            return await apiClient.get<{ status: string; pointCount: number; processedAt: string | null }>(
                `/attention-prediction/research/${researchId}/status/${mediaId}`
            );
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to check prediction status');
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

