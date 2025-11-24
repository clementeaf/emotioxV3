import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth';
import * as researchService from './research.service';
import * as authService from '../auth/auth.service';

export const handleResearchRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;

    try {
        const decoded = await requireAuth(event);
        const user = await authService.getMe(decoded.sub);

        // GET /research
        if (path === '/research' && httpMethod === 'GET') {
            const researches = await researchService.list(user.id);
            return success({ researches });
        }

        // POST /research
        if (path === '/research' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const research = await researchService.create(user.id, body);
            return success({ research }, 201);
        }

        // GET /research/:id
        const getMatch = path.match(/^\/research\/([^\/]+)$/);
        if (getMatch && httpMethod === 'GET') {
            const id = getMatch[1];
            const research = await researchService.getById(id, user.id);
            return success({ research });
        }

        // PUT /research/:id
        const putMatch = path.match(/^\/research\/([^\/]+)$/);
        if (putMatch && httpMethod === 'PUT') {
            const id = putMatch[1];
            const body = JSON.parse(event.body || '{}');
            const research = await researchService.update(id, user.id, body);
            return success({ research });
        }

        // DELETE /research/:id
        const deleteMatch = path.match(/^\/research\/([^\/]+)$/);
        if (deleteMatch && httpMethod === 'DELETE') {
            const id = deleteMatch[1];
            const result = await researchService.deleteResearch(id, user.id);
            return success(result);
        }

        // PATCH /research/:id/status
        const statusMatch = path.match(/^\/research\/([^\/]+)\/status$/);
        if (statusMatch && httpMethod === 'PATCH') {
            const id = statusMatch[1];
            const body = JSON.parse(event.body || '{}');
            const research = await researchService.updateStatus(id, user.id, body.status);
            return success({ research });
        }

        return error('Route not found', 404);
    } catch (err: any) {
        console.error('Research controller error:', err);

        if (err.message === 'Invalid or expired token' || err.message === 'No token provided' || err.message === 'No authorization header') {
            return error(err.message, 401);
        }

        return error(err.message || 'Internal server error', 500);
    }
};
