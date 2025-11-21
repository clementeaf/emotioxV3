import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth';
import * as modulesService from './modules.service';

export const handleModulesRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    try {
        await requireAuth(event);
        const body = event.body ? JSON.parse(event.body) : {};

        if (path.match(/^\/modules\/([^\/]+)\/reorder$/) && httpMethod === 'POST') {
            const researchId = path.match(/^\/modules\/([^\/]+)\/reorder$/)![1];
            const result = await modulesService.reorder(researchId, body.modules);
            return success(result);
        }

        if (path === '/modules' && httpMethod === 'POST') {
            const module = await modulesService.create(body.research_id, body);
            return success({ module }, 201);
        }

        const match = path.match(/^\/modules\/([^\/]+)$/);
        if (match) {
            const id = match[1];
            if (httpMethod === 'PUT') {
                const module = await modulesService.update(id, body);
                return success({ module });
            }
            if (httpMethod === 'DELETE') {
                const result = await modulesService.deleteModule(id);
                return success(result);
            }
        }

        return error('Route not found', 404);
    } catch (err: any) {
        return error(err.message || 'Internal server error', 500);
    }
};
