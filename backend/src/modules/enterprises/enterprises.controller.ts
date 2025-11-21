import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth';
import * as enterprisesService from './enterprises.service';
import * as authService from '../auth/auth.service';

export const handleEnterprisesRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;

    try {
        // All enterprises routes require authentication
        let user;
        try {
            const decoded = await requireAuth(event);
            user = await authService.getMe(decoded.sub);
        } catch (authError: unknown) {
            const authErrorMessage = authError instanceof Error ? authError.message : 'Authentication failed';
            if (authErrorMessage === 'Invalid or expired token' || authErrorMessage === 'No authorization header' || authErrorMessage === 'No token provided') {
                return error(authErrorMessage, 401);
            }
            throw authError;
        }

        // GET /enterprises
        if (path === '/enterprises' && httpMethod === 'GET') {
            const enterprises = await enterprisesService.list();
            return success({ enterprises });
        }

        // POST /enterprises
        if (path === '/enterprises' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const enterprise = await enterprisesService.create(body, user.id);
            return success({ enterprise }, 201);
        }

        // GET /enterprises/:id
        const getMatch = path.match(/^\/enterprises\/([^\/]+)$/);
        if (getMatch && httpMethod === 'GET') {
            const id = getMatch[1];
            const enterprise = await enterprisesService.getById(id);
            return success({ enterprise });
        }

        // PUT /enterprises/:id
        const putMatch = path.match(/^\/enterprises\/([^\/]+)$/);
        if (putMatch && httpMethod === 'PUT') {
            const id = putMatch[1];
            const body = JSON.parse(event.body || '{}');
            const enterprise = await enterprisesService.update(id, body);
            return success({ enterprise });
        }

        // DELETE /enterprises/:id
        const deleteMatch = path.match(/^\/enterprises\/([^\/]+)$/);
        if (deleteMatch && httpMethod === 'DELETE') {
            const id = deleteMatch[1];
            const result = await enterprisesService.deleteEnterprise(id);
            return success(result);
        }

        return error('Route not found', 404);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Enterprises controller error:', err);

        if (errorMessage === 'Invalid or expired token' || errorMessage === 'No authorization header' || errorMessage === 'No token provided') {
            return error(errorMessage, 401);
        }

        return error(errorMessage || 'Internal server error', 500);
    }
};

