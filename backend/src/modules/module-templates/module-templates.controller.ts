import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import * as moduleTemplatesService from './module-templates.service';

export const handleModuleTemplatesRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;

    try {
        // GET /module-templates
        if (path === '/module-templates' && httpMethod === 'GET') {
            const templates = await moduleTemplatesService.list();
            return success(templates);
        }

        // POST /module-templates
        if (path === '/module-templates' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');

            if (!body.name) {
                return error('Name is required', 400);
            }

            // TODO: Add authentication and use real user ID
            const template = await moduleTemplatesService.create({
                ...body,
                created_by: '00000000-0000-0000-0000-000000000000' // Temporary placeholder
            });
            return success(template, 201);
        }

        // GET /module-templates/:id
        if (path.match(/^\/module-templates\/[a-zA-Z0-9-]+$/) && httpMethod === 'GET') {
            const id = path.split('/').pop() || '';
            const template = await moduleTemplatesService.getById(id);
            return success(template);
        }

        // PUT /module-templates/:id
        if (path.match(/^\/module-templates\/[a-zA-Z0-9-]+$/) && httpMethod === 'PUT') {
            const id = path.split('/').pop() || '';
            const body = JSON.parse(event.body || '{}');
            const template = await moduleTemplatesService.update(id, body);
            return success(template);
        }

        // DELETE /module-templates/:id
        if (path.match(/^\/module-templates\/[a-zA-Z0-9-]+$/) && httpMethod === 'DELETE') {
            const id = path.split('/').pop() || '';
            await moduleTemplatesService.deleteTemplate(id);
            return success({ message: 'Module template deleted successfully' });
        }

        return error('Route not found', 404);
    } catch (err: any) {
        if (err.message === 'Module template not found') {
            return error('Module template not found', 404);
        }
        console.error('Module Templates error:', err);
        return error(err.message || 'Internal server error', 500);
    }
};
