import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth';
import * as mediaService from './media.service';

export const handleMediaRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    try {
        await requireAuth(event);
        const body = event.body ? JSON.parse(event.body) : {};

        if (path === '/media/upload' && httpMethod === 'POST') {
            const { research_id, file_name, content_type } = body;
            const result = await mediaService.generateUploadUrl(research_id, file_name, content_type);
            return success(result);
        }

        if (path === '/media' && httpMethod === 'POST') {
            const { research_id, question_id, s3_key, metadata } = body;
            const media = await mediaService.saveMetadata(research_id, question_id, s3_key, metadata);
            return success({ media }, 201);
        }

        const getMatch = path.match(/^\/media\/([^\/]+)$/);
        if (getMatch && httpMethod === 'GET') {
            const id = getMatch[1];
            const result = await mediaService.getMediaUrl(id);
            return success(result);
        }

        const deleteMatch = path.match(/^\/media\/([^\/]+)$/);
        if (deleteMatch && httpMethod === 'DELETE') {
            const id = deleteMatch[1];
            const result = await mediaService.deleteMedia(id);
            return success(result);
        }

        return error('Route not found', 404);
    } catch (err: any) {
        return error(err.message || 'Internal server error', 500);
    }
};
