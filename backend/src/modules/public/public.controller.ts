import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import * as publicService from './public.service';

export const handlePublicRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    try {
        // No auth required for public routes

        const match = path.match(/^\/public\/research\/([^\/]+)$/);
        if (match && httpMethod === 'GET') {
            const researchId = match[1];
            const research = await publicService.getResearch(researchId);
            return success({ research });
        }

        if (path === '/public/responses' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const response = await publicService.saveResponse(body);
            return success({ response }, 201);
        }

        return error('Route not found', 404);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Public API error:', err);
        return error(errorMessage, 500);
    }
};
