import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { isAuthError, requireAuth } from '../../utils/auth.local';
import * as mediaService from './media.service.local';
import { getRequestOrigin } from '../../utils/request';

export const handleMediaRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin = getRequestOrigin(event);
    try {
        await requireAuth(event);
        const body = event.body ? JSON.parse(event.body) : {};

        if (path === '/media/upload' && httpMethod === 'POST') {
            const { research_id, file_name, content_type } = body;
            const result = await mediaService.generateUploadUrl(research_id, file_name, content_type);
            return success(result, 200, undefined, origin);
        }

        if (path === '/media' && httpMethod === 'POST') {
            const { research_id, question_id, media_path, s3_key, metadata } = body;
            // Compatibilidad: aceptar s3_key o media_path
            const pathToUse = media_path || s3_key;
            if (!pathToUse) {
                return error('media_path or s3_key is required', 400, undefined, origin);
            }
            const media = await mediaService.saveMetadata(research_id, question_id, pathToUse, metadata);
            return success({ media }, 201, undefined, origin);
        }

        if (path === '/media/by-key' && httpMethod === 'GET') {
            const mediaPath = event.queryStringParameters?.media_path || event.queryStringParameters?.s3_key;
            if (!mediaPath) {
                return error('media_path or s3_key query parameter is required', 400, undefined, origin);
            }
            const result = await mediaService.getMediaUrlByPath(mediaPath);
            return success(result, 200, undefined, origin);
        }

        const getMatch = path.match(/^\/media\/([^\/]+)$/);
        if (getMatch && httpMethod === 'GET') {
            const id = getMatch[1];
            const result = await mediaService.getMediaUrlById(id);
            return success(result, 200, undefined, origin);
        }

        const deleteMatch = path.match(/^\/media\/([^\/]+)$/);
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
        if (errorMessage.includes('not found') || errorMessage.includes('Not found')) {
            return error(errorMessage, 404, undefined, origin);
        }
        return error(errorMessage, 500, undefined, origin);
    }
};
