import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import * as publicService from './public.service';

export const handlePublicRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin: string | null = (event.headers.Origin || event.headers.origin || null) as string | null;
    try {
        // No auth required for public routes

        // GET /public/research/:id
        const researchMatch = path.match(/^\/public\/research\/([^\/]+)$/);
        if (researchMatch && httpMethod === 'GET') {
            const researchId = researchMatch[1];
            const research = await publicService.getResearch(researchId);
            return success({ research }, 200, undefined, origin);
        }

        // POST /public/research/:id/responses
        const responsesMatch = path.match(/^\/public\/research\/([^\/]+)\/responses$/);
        if (responsesMatch && httpMethod === 'POST') {
            const researchId = responsesMatch[1];
            const body = JSON.parse(event.body || '{}');
            const result = await publicService.saveParticipantResponses(researchId, body);
            return success(result, 201, undefined, origin);
        }

        // Legacy endpoint (deprecated)
        if (path === '/public/responses' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const response = await publicService.saveResponse(body);
            return success({ response }, 201, undefined, origin);
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Public API error:', err);
        return error(errorMessage, 500, undefined, origin);
    }
};
