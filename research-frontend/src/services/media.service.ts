import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';
import { configService } from './api/config.service';
import type { AiAnalysisResult } from '../types/aiAnalysis.types';

/**
 * Resolves a relative media URL against the backend origin.
 * Backend returns paths like /api/media/research/... which need the backend origin prepended
 * when the frontend runs on a different origin (e.g. localhost dev).
 */
export function resolveMediaUrl(url: string): string {
    if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
        return url;
    }
    try {
        const baseUrl = configService.getBaseUrl(); // e.g. https://emotio.cx/api
        const origin = new URL(baseUrl).origin;     // e.g. https://emotio.cx
        const sep = url.startsWith('/') ? '' : '/';
        return `${origin}${sep}${url}`;
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

// In-memory cache for media URL lookups (avoids duplicate /media/by-key requests)
const s3KeyUrlCache = new Map<string, { url: string; expiresAt: number }>();
const S3_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
        // Return cached URL if still valid
        const cached = s3KeyUrlCache.get(s3Key);
        if (cached && cached.expiresAt > Date.now()) {
            return { url: cached.url, expires_in: Math.round((cached.expiresAt - Date.now()) / 1000) };
        }
        try {
            const result = await apiClient.get<MediaUrlResponse>(`/media/by-key?s3_key=${encodeURIComponent(s3Key)}`);
            result.url = resolveMediaUrl(result.url);
            s3KeyUrlCache.set(s3Key, { url: result.url, expiresAt: Date.now() + S3_CACHE_TTL });
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
     * Runs attention prediction on a stimulus image (synchronous — awaits result).
     * Backend runs TranSalNet and saves heatmapData to research config.
     */
    async predictAttention(researchId: string, mediaId: string, threshold?: number, profile?: Record<string, unknown>): Promise<{ status: string; mediaId: string }> {
        try {
            const body: Record<string, unknown> = {};
            if (threshold != null) body.threshold = threshold;
            if (profile) body.profile = profile;
            return await apiClient.post<{ status: string; mediaId: string }>(
                `/attention-prediction/research/${researchId}/predict/${mediaId}`,
                body
            );
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to run attention prediction');
        }
    }

    /**
     * Runs attention prediction on an Eye Tracking module stimulus (synchronous).
     */
    async predictModuleAttention(researchId: string, moduleId: string, threshold?: number): Promise<{ status: string; moduleId: string }> {
        try {
            return await apiClient.post<{ status: string; moduleId: string }>(
                `/attention-prediction/research/${researchId}/module/${moduleId}/predict`,
                threshold != null ? { threshold } : {}
            );
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to start module attention prediction');
        }
    }

    /** Triggers LLM analysis for an Insights Finding file (fire-and-forget, returns 202) */
    async analyzeInsights(researchId: string, fileMediaId: string): Promise<{ status: string }> {
        try {
            return await apiClient.post<{ status: string }>(
                `/insights/research/${researchId}/analyze/${fileMediaId}`
            );
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to start insights analysis');
        }
    }

    /** Polls analysis status for an Insights Finding file */
    async getInsightsStatus(researchId: string, fileMediaId: string): Promise<{ status: string; analyzedAt: string | null }> {
        try {
            return await apiClient.get<{ status: string; analyzedAt: string | null }>(
                `/insights/research/${researchId}/status/${fileMediaId}`
            );
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to check insights status');
        }
    }

    /**
     * Runs GPT-4o Vision analysis on a stimulus that already has TranSalNet heatmap data.
     * Synchronous — awaits the full analysis and returns structured results.
     */
    async analyzeAttention(researchId: string, mediaId: string): Promise<{ analysis: AiAnalysisResult; status: string }> {
        try {
            return await apiClient.post<{ analysis: AiAnalysisResult; status: string }>(
                `/attention-prediction/research/${researchId}/analyze/${mediaId}`
            );
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to run AI attention analysis');
        }
    }

    async hybridPredict(
        researchId: string,
        mediaId: string,
        options?: { alpha?: number; beta?: number; threshold?: number; profile?: Record<string, unknown> }
    ): Promise<{ heatmapData: Array<{ x: number; y: number; value: number }>; totalPoints: number; hybrid: boolean }> {
        try {
            return await apiClient.post(
                `/attention-prediction/research/${researchId}/module/${mediaId}/hybrid-predict`,
                options || {}
            );
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to run hybrid prediction');
        }
    }

    /**
     * Convenience: generate upload URL → PUT file → save metadata → return media ID.
     * Used for programmatic uploads (e.g. video frame extraction).
     */
    async uploadFile(researchId: string, file: File): Promise<{ mediaId: string; s3Key: string }> {
        // 1. Get presigned upload URL
        const { upload_url, s3_key } = await this.generateUploadUrl({
            research_id: researchId,
            file_name: file.name,
            content_type: file.type,
        });

        // 2. PUT the file
        const uploadRes = await fetch(upload_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
        });
        if (!uploadRes.ok) {
            throw new Error(`File upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
        }

        // 3. Save metadata
        const { media } = await this.saveMetadata({
            research_id: researchId,
            s3_key,
        });

        return { mediaId: media.id, s3Key: s3_key };
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

