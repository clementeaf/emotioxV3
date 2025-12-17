import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { isAuthError, requireAuth } from '../../utils/auth';
import * as researchTypesService from './research-types.service';
import * as authService from '../auth/auth.service';
import { getRequestOrigin } from '../../utils/request';

export const handleResearchTypesRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin = getRequestOrigin(event);

    try {
        // All research-types routes require authentication
        let user;
        try {
            const decoded = await requireAuth(event);
            user = await authService.getMe(decoded.sub);
        } catch (authError: unknown) {
            const authErrorMessage = authError instanceof Error ? authError.message : 'Authentication failed';
            if (isAuthError(authError)) {
                return error(authErrorMessage, authError.statusCode, undefined, origin);
            }
            throw authError;
        }

        // GET /research-types
        if (path === '/research-types' && httpMethod === 'GET') {
            const types = await researchTypesService.list();
            return success({ researchTypes: types }, 200, undefined, origin);
        }

        // POST /research-types
        if (path === '/research-types' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const type = await researchTypesService.create(body, user.id);
            return success({ researchType: type }, 201, undefined, origin);
        }

        // GET /research-types/:id
        const getMatch = path.match(/^\/research-types\/([^\/]+)$/);
        if (getMatch && httpMethod === 'GET') {
            const id = getMatch[1];
            const type = await researchTypesService.getById(id);
            return success({ researchType: type }, 200, undefined, origin);
        }

        // PUT /research-types/:id
        const putMatch = path.match(/^\/research-types\/([^\/]+)$/);
        if (putMatch && httpMethod === 'PUT') {
            const id = putMatch[1];
            const body = JSON.parse(event.body || '{}');
            const type = await researchTypesService.update(id, body);
            return success({ researchType: type }, 200, undefined, origin);
        }

        // DELETE /research-types/:id
        const deleteMatch = path.match(/^\/research-types\/([^\/]+)$/);
        if (deleteMatch && httpMethod === 'DELETE') {
            const id = deleteMatch[1];
            const result = await researchTypesService.deleteResearchType(id);
            return success(result, 200, undefined, origin);
        }

        // PATCH /research-types/:id/modules
        const modulesMatch = path.match(/^\/research-types\/([^\/]+)\/modules$/);
        if (modulesMatch && httpMethod === 'PATCH') {
            const id = modulesMatch[1];
            const body = JSON.parse(event.body || '{}');
            const type = await researchTypesService.updateModules(id, body.modules);
            return success({ researchType: type }, 200, undefined, origin);
        }

        // GET /research-types/:id/techniques
        const techniquesMatch = path.match(/^\/research-types\/([^\/]+)\/techniques$/);
        if (techniquesMatch && httpMethod === 'GET') {
            const id = techniquesMatch[1];
            const techniques = await researchTypesService.getTechniquesByType(id);
            return success({ researchTechniques: techniques }, 200, undefined, origin);
        }

        // GET /research-types/:id/module-assignments
        const getModulesMatch = path.match(/^\/research-types\/([^\/]+)\/module-assignments$/);
        if (getModulesMatch && httpMethod === 'GET') {
            const id = getModulesMatch[1];
            const modules = await researchTypesService.getModulesByType(id);
            return success({ moduleTemplates: modules }, 200, undefined, origin);
        }

        // PUT /research-types/:id/module-assignments
        const putModulesMatch = path.match(/^\/research-types\/([^\/]+)\/module-assignments$/);
        if (putModulesMatch && httpMethod === 'PUT') {
            const id = putModulesMatch[1];
            const body = JSON.parse(event.body || '{}');
            const result = await researchTypesService.updateModuleAssignments(id, body.moduleTemplateIds);
            return success(result, 200, undefined, origin);
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Research types controller error:', err);

        if (isAuthError(err)) {
            return error(errorMessage, err.statusCode, undefined, origin);
        }

        return error(errorMessage || 'Internal server error', 500, undefined, origin);
    }
};
