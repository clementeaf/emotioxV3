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

        // POST /auth/refresh
        if (path === '/auth/refresh' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const tokens = await authService.refreshToken(body);
            return success({ tokens });
        }

        // GET /auth/me
        if (path === '/auth/me' && httpMethod === 'GET') {
            const decoded = await requireAuth(event);
            const user = await authService.getMe(decoded.sub);
            return success({ user });
        }
        // PUT /auth/me (update profile)
        if (path === '/auth/me' && httpMethod === 'PUT') {
            const decoded = await requireAuth(event);
            const body = JSON.parse(event.body || '{}');
            const updatedUser = await authService.updateUser(decoded.sub, body);
            return success({ user: updatedUser });
        }
        // DELETE /auth/me
        if (path === '/auth/me' && httpMethod === 'DELETE') {
            const decoded = await requireAuth(event);
            const result = await authService.deleteAccount(decoded.sub);
            return success(result);
        }

        return error('Route not found', 404);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Auth error:', err);
        return error(errorMessage, 500);
    }
};
