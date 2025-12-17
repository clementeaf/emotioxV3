import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { isAuthError, requireAuth } from '../../utils/auth';
import * as questionsService from './questions.service';
import { getRequestOrigin } from '../../utils/request';

export const handleQuestionsRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin = getRequestOrigin(event);
    try {
        await requireAuth(event);
        const body = event.body ? JSON.parse(event.body) : {};

        if (path.match(/^\/questions\/([^\/]+)\/reorder$/) && httpMethod === 'POST') {
            const moduleId = path.match(/^\/questions\/([^\/]+)\/reorder$/)![1];
            const result = await questionsService.reorder(moduleId, body.questions);
            return success(result, 200, undefined, origin);
        }

        if (path === '/questions' && httpMethod === 'POST') {
            const question = await questionsService.create(body.module_id, body);
            return success({ question }, 201, undefined, origin);
        }

        const match = path.match(/^\/questions\/([^\/]+)$/);
        if (match) {
            const id = match[1];
            if (httpMethod === 'PUT') {
                const question = await questionsService.update(id, body);
                return success({ question }, 200, undefined, origin);
            }
            if (httpMethod === 'DELETE') {
                const result = await questionsService.deleteQuestion(id);
                return success(result, 200, undefined, origin);
            }
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Questions error:', err);
        if (isAuthError(err)) {
            return error(errorMessage, err.statusCode, undefined, origin);
        }
        return error(errorMessage, 500, undefined, origin);
    }
};
