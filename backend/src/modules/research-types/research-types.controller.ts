import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth';
import * as researchTypesService from './research-types.service';
import * as authService from '../auth/auth.service';

export const handleResearchTypesRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;

    try {
        // All research-types routes require authentication (admin check removed temporarily)
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

        // GET /research-types
        if (path === '/research-types' && httpMethod === 'GET') {
            const types = await researchTypesService.list();
            return success({ researchTypes: types });
        }

        // POST /research-types
        if (path === '/research-types' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const type = await researchTypesService.create(body, user.id);
            return success({ researchType: type }, 201);
        }

        // GET /research-types/:id
        const getMatch = path.match(/^\/research-types\/([^\/]+)$/);
        if (getMatch && httpMethod === 'GET') {
            const id = getMatch[1];
            const type = await researchTypesService.getById(id);
            return success({ researchType: type });
        }

        // PUT /research-types/:id
        const putMatch = path.match(/^\/research-types\/([^\/]+)$/);
        if (putMatch && httpMethod === 'PUT') {
            const id = putMatch[1];
            const body = JSON.parse(event.body || '{}');
            const type = await researchTypesService.update(id, body);
            return success({ researchType: type });
        }

        // DELETE /research-types/:id
        const deleteMatch = path.match(/^\/research-types\/([^\/]+)$/);
        if (deleteMatch && httpMethod === 'DELETE') {
            const id = deleteMatch[1];
            const result = await researchTypesService.deleteResearchType(id);
            return success(result);
        }

        // PATCH /research-types/:id/modules
        const modulesMatch = path.match(/^\/research-types\/([^\/]+)\/modules$/);
        if (modulesMatch && httpMethod === 'PATCH') {
            const id = modulesMatch[1];
            const body = JSON.parse(event.body || '{}');
            const type = await researchTypesService.updateModules(id, body.modules);
            return success({ researchType: type });
        }

        // GET /research-types/:id/techniques
        const techniquesMatch = path.match(/^\/research-types\/([^\/]+)\/techniques$/);
        if (techniquesMatch && httpMethod === 'GET') {
            const id = techniquesMatch[1];
            const techniques = await researchTypesService.getTechniquesByType(id);
            return success({ researchTechniques: techniques });
        }

        return error('Route not found', 404);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Research types controller error:', err);

        if (errorMessage === 'Invalid or expired token' || errorMessage === 'No authorization header' || errorMessage === 'No token provided') {
            return error(errorMessage, 401);
        }

        return error(errorMessage || 'Internal server error', 500);
    }
};
