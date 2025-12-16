import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth';
import * as responsesService from './responses.service';

export const handleResponsesRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin: string | null = (event.headers.Origin || event.headers.origin || null) as string | null;
    try {
        await requireAuth(event);

        const match = path.match(/^\/responses\/research\/([^\/]+)$/);
        if (match && httpMethod === 'GET') {
            const researchId = match[1];
            const responses = await responsesService.getByResearch(researchId);
            return success({ responses }, 200, undefined, origin);
        }

        const participantMatch = path.match(/^\/responses\/research\/([^\/]+)\/participant\/([^\/]+)$/);
        if (participantMatch && httpMethod === 'GET') {
            const [, researchId, participantId] = participantMatch;
            const responses = await responsesService.getByParticipant(researchId, participantId);
            return success({ responses }, 200, undefined, origin);
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Responses error:', err);
        return error(errorMessage, 500, undefined, origin);
    }
};
