/**
 * Controller de media para almacenamiento local (cPanel)
 * Maneja uploads directos y URLs locales
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { isAuthError, requireAuth } from '../../utils/auth.local';
import * as mediaService from './media.service.local';
import { getRequestOrigin } from '../../utils/request';
import { getMediaPath, ensureDirectoryExists, getMediaUrl } from '../../config/local-storage';
import fs from 'fs';
import path from 'path';

/**
 * Maneja upload directo de archivos (multipart/form-data)
 * Nota: En Express, esto se manejaría con multer middleware
 * Aquí adaptamos para el formato Lambda/Express híbrido
 */
export const handleDirectUpload = async (
    researchId: string,
    questionId: string | null,
    file: { name: string; data: Buffer; mimetype: string }
): Promise<{ media: unknown }> => {
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
    const relativePath = `research/${researchId}/${timestamp}-${safeFileName}`;
    const filePath = getMediaPath(relativePath);
    
    // Asegurar que el directorio existe
    ensureDirectoryExists(filePath);
    
    // Guardar archivo
    fs.writeFileSync(filePath, file.data);
    
    // Guardar metadata en DB
    const metadata = {
        fileName: file.name,
        fileType: file.mimetype,
        fileSize: file.data.length,
    };
    
    const media = await mediaService.saveMetadata(researchId, questionId, relativePath, metadata);
    
    return { media };
};

export const handleMediaRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path: routePath } = event;
    const origin = getRequestOrigin(event);
    
    try {
        await requireAuth(event);
        const body = event.body ? JSON.parse(event.body) : {};

        // Generar información para upload
        if (routePath === '/media/upload' && httpMethod === 'POST') {
            const { research_id, file_name, content_type } = body;
            const result = await mediaService.generateUploadUrl(research_id, file_name, content_type);
            return success(result, 200, undefined, origin);
        }

        // Guardar metadata después de upload
        if (routePath === '/media' && httpMethod === 'POST') {
            const { research_id, question_id, media_path, metadata } = body;
            const media = await mediaService.saveMetadata(research_id, question_id, media_path, metadata);
            return success({ media }, 201, undefined, origin);
        }

        // Obtener URL por key
        if (routePath === '/media/by-key' && httpMethod === 'GET') {
            const mediaPath = event.queryStringParameters?.media_path || event.queryStringParameters?.s3_key;
            if (!mediaPath) {
                return error('media_path or s3_key query parameter is required', 400, undefined, origin);
            }
            const result = await mediaService.getMediaUrlByPath(mediaPath);
            return success(result, 200, undefined, origin);
        }

        // Obtener URL por ID
        const getMatch = routePath.match(/^\/media\/([^\/]+)$/);
        if (getMatch && httpMethod === 'GET') {
            const id = getMatch[1];
            const result = await mediaService.getMediaUrlById(id);
            return success(result, 200, undefined, origin);
        }

        // Eliminar media
        const deleteMatch = routePath.match(/^\/media\/([^\/]+)$/);
        if (deleteMatch && httpMethod === 'DELETE') {
            const id = deleteMatch[1];
            const result = await mediaService.deleteMedia(id);
            return success(result, 200, undefined, origin);
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Media error:', err);
        if (isAuthError(err)) {
            return error(errorMessage, err.statusCode, undefined, origin);
        }
        return error(errorMessage, 500, undefined, origin);
    }
};
