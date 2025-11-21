import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from './utils/response';

export const route = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;

    console.log(`${httpMethod} ${path}`);

    // Handle OPTIONS for CORS preflight
    if (httpMethod === 'OPTIONS') {
        return success({ message: 'OK' }, 200);
    }

    // Health check
    if (path === '/health' && httpMethod === 'GET') {
        return success({ status: 'healthy', timestamp: new Date().toISOString() });
    }

    // Route to modules (will be implemented)
    try {
        // Auth routes
        if (path.startsWith('/auth')) {
            const { handleAuthRoutes } = await import('./modules/auth/auth.controller');
            return await handleAuthRoutes(event);
        }

        // Enterprises routes
        if (path.startsWith('/enterprises')) {
            const { handleEnterprisesRoutes } = await import('./modules/enterprises/enterprises.controller');
            return await handleEnterprisesRoutes(event);
        }

        // Research Techniques routes (admin only)
        if (path.startsWith('/research-techniques')) {
            const { handleResearchTechniquesRoutes } = await import('./modules/research-techniques/research-techniques.controller');
            return await handleResearchTechniquesRoutes(event);
        }

        // Research Types routes (admin only)
        if (path.startsWith('/research-types')) {
            const { handleResearchTypesRoutes } = await import('./modules/research-types/research-types.controller');
            return await handleResearchTypesRoutes(event);
        }

        // Research routes (must be after research-types and research-techniques to avoid conflicts)
        if (path.startsWith('/research') && !path.startsWith('/research-types') && !path.startsWith('/research-techniques')) {
            const { handleResearchRoutes } = await import('./modules/research/research.controller');
            return await handleResearchRoutes(event);
        }

        // Modules routes
        if (path.startsWith('/modules')) {
            const { handleModulesRoutes } = await import('./modules/modules/modules.controller');
            return await handleModulesRoutes(event);
        }

        // Questions routes
        if (path.startsWith('/questions')) {
            const { handleQuestionsRoutes } = await import('./modules/questions/questions.controller');
            return await handleQuestionsRoutes(event);
        }

        // Media routes
        if (path.startsWith('/media')) {
            const { handleMediaRoutes } = await import('./modules/media/media.controller');
            return await handleMediaRoutes(event);
        }

        // Responses routes
        if (path.startsWith('/responses')) {
            const { handleResponsesRoutes } = await import('./modules/responses/responses.controller');
            return await handleResponsesRoutes(event);
        }

        // Public routes (no auth)
        if (path.startsWith('/public')) {
            const { handlePublicRoutes } = await import('./modules/public/public.controller');
            return await handlePublicRoutes(event);
        }

        // Analysis routes
        if (path.startsWith('/analysis')) {
            const { handleAnalysisRoutes } = await import('./modules/analysis/analysis.controller');
            return await handleAnalysisRoutes(event);
        }

        // 404 Not Found
        return error('Route not found', 404);

    } catch (err: any) {
        console.error('Router error:', err);
        return error(err.message || 'Internal server error', 500);
    }
};
