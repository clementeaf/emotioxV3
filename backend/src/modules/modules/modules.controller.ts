import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { isAuthError, requireAuth } from '../../utils/auth';
import * as modulesService from './modules.service';
import { getRequestOrigin } from '../../utils/request';

export const handleModulesRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin = getRequestOrigin(event);
    try {
        await requireAuth(event);
        const body = event.body ? JSON.parse(event.body) : {};

        if (path.match(/^\/modules\/([^\/]+)\/reorder$/) && httpMethod === 'POST') {
            const researchId = path.match(/^\/modules\/([^\/]+)\/reorder$/)![1];
            const result = await modulesService.reorder(researchId, body.modules);
            return success(result, 200, undefined, origin);
        }

        if (path === '/modules' && httpMethod === 'POST') {
            const module = await modulesService.create(body.research_id, body);
            return success({ module }, 201, undefined, origin);
        }

        const match = path.match(/^\/modules\/([^\/]+)$/);
        if (match) {
            const id = match[1];
            if (httpMethod === 'PUT') {
                const module = await modulesService.update(id, body);
                return success({ module }, 200, undefined, origin);
            }
            if (httpMethod === 'DELETE') {
                const result = await modulesService.deleteModule(id);
                return success(result, 200, undefined, origin);
            }
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Modules error:', err);
        if (isAuthError(err)) {
            return error(errorMessage, err.statusCode, undefined, origin);
        }
        return error(errorMessage, 500, undefined, origin);
    }
};
