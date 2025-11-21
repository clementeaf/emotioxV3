import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth';
import * as questionsService from './questions.service';

export const handleQuestionsRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    try {
        await requireAuth(event);
        const body = event.body ? JSON.parse(event.body) : {};

        if (path.match(/^\/questions\/([^\/]+)\/reorder$/) && httpMethod === 'POST') {
            const moduleId = path.match(/^\/questions\/([^\/]+)\/reorder$/)![1];
            const result = await questionsService.reorder(moduleId, body.questions);
            return success(result);
        }

        if (path === '/questions' && httpMethod === 'POST') {
            const question = await questionsService.create(body.module_id, body);
            return success({ question }, 201);
        }

        const match = path.match(/^\/questions\/([^\/]+)$/);
        if (match) {
            const id = match[1];
            if (httpMethod === 'PUT') {
                const question = await questionsService.update(id, body);
                return success({ question });
            }
            if (httpMethod === 'DELETE') {
                const result = await questionsService.deleteQuestion(id);
                return success(result);
            }
        }

        return error('Route not found', 404);
    } catch (err: any) {
        return error(err.message || 'Internal server error', 500);
    }
};
