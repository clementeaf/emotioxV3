import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth';
import * as authService from './auth.service';

export const handleAuthRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;

    try {
        // POST /auth/register
        if (path === '/auth/register' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const user = await authService.register(body);
            return success({ user }, 201);
        }

        // POST /auth/login
        if (path === '/auth/login' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const tokens = await authService.login(body);
            return success({ tokens });
        }

        // GET /auth/me
        if (path === '/auth/me' && httpMethod === 'GET') {
            const decoded = await requireAuth(event);
            const user = await authService.getMe(decoded.sub);
            return success({ user });
        }

        // DELETE /auth/account
        if (path === '/auth/account' && httpMethod === 'DELETE') {
            const decoded = await requireAuth(event);
            const user = await authService.getMe(decoded.sub);
            const result = await authService.deleteAccount(user.id);
            return success(result);
        }

        return error('Route not found', 404);
    } catch (err: any) {
        console.error('Auth controller error:', err);
        return error(err.message || 'Internal server error', 500);
    }
};
