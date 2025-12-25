import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { isAuthError, requireAuth } from '../../utils/auth';
import * as analysisService from './analysis.service';
import { getRequestOrigin } from '../../utils/request';

export const handleAnalysisRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin = getRequestOrigin(event);
    try {
        await requireAuth(event);

        if (path === '/analysis/modules' && httpMethod === 'GET') {
            const modules = await analysisService.getModules();
            return success({ modules }, 200, undefined, origin);
        }

        const match = path.match(/^\/analysis\/question\/([^\/]+)$/);
        if (match && httpMethod === 'POST') {
            const questionId = match[1];
            const body = JSON.parse(event.body || '{}');
            const result = await analysisService.analyzeQuestion(questionId, body.module_type);
            return success({ analysis: result }, 200, undefined, origin);
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Analysis error:', err);
        if (isAuthError(err)) {
            return error(errorMessage, err.statusCode, undefined, origin);
        }
        return error(errorMessage, 500, undefined, origin);
    }
};
