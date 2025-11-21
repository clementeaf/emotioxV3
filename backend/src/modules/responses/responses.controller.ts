import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth';
import * as responsesService from './responses.service';

export const handleResponsesRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    try {
        await requireAuth(event);

        const match = path.match(/^\/responses\/research\/([^\/]+)$/);
        if (match && httpMethod === 'GET') {
            const researchId = match[1];
            const responses = await responsesService.getByResearch(researchId);
            return success({ responses });
        }

        const participantMatch = path.match(/^\/responses\/research\/([^\/]+)\/participant\/([^\/]+)$/);
        if (participantMatch && httpMethod === 'GET') {
            const [, researchId, participantId] = participantMatch;
            const responses = await responsesService.getByParticipant(researchId, participantId);
            return success({ responses });
        }

        return error('Route not found', 404);
    } catch (err: any) {
        return error(err.message || 'Internal server error', 500);
    }
};
