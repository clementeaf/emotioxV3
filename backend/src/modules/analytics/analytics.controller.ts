import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { isAuthError, requireAuth } from '../../utils/auth';
import * as analyticsService from './analytics.service';
import { getRequestOrigin } from '../../utils/request';

export const handleAnalyticsRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin = getRequestOrigin(event);
    try {
        await requireAuth(event);

        // GET /analytics/research/:id/smartvoc
        const smartvocMatch = path.match(/^\/analytics\/research\/([^\/]+)\/smartvoc$/);
        if (smartvocMatch && httpMethod === 'GET') {
            const researchId = smartvocMatch[1];
            const results = await analyticsService.getSmartVOCResults(researchId);
            return success({ results }, 200, undefined, origin);
        }

        // GET /analytics/research/:id/cognitive-tasks
        const cognitiveMatch = path.match(/^\/analytics\/research\/([^\/]+)\/cognitive-tasks$/);
        if (cognitiveMatch && httpMethod === 'GET') {
            const researchId = cognitiveMatch[1];
            const results = await analyticsService.getCognitiveTaskResults(researchId);
            return success({ results }, 200, undefined, origin);
        }

        // GET /analytics/research/:id/demographics
        const demographicsMatch = path.match(/^\/analytics\/research\/([^\/]+)\/demographics$/);
        if (demographicsMatch && httpMethod === 'GET') {
            const researchId = demographicsMatch[1];
            const results = await analyticsService.getDemographicResponses(researchId);
            return success({ results }, 200, undefined, origin);
        }

        // GET /analytics/research/:id/navigation-flow/:moduleId
        const navigationMatch = path.match(/^\/analytics\/research\/([^\/]+)\/navigation-flow\/([^\/]+)$/);
        if (navigationMatch && httpMethod === 'GET') {
            const [, researchId, moduleId] = navigationMatch;
            const results = await analyticsService.getNavigationFlowResults(researchId, moduleId);
            return success({ results }, 200, undefined, origin);
        }

        // GET /analytics/research/:id/preference-test/:moduleId
        const preferenceMatch = path.match(/^\/analytics\/research\/([^\/]+)\/preference-test\/([^\/]+)$/);
        if (preferenceMatch && httpMethod === 'GET') {
            const [, researchId, moduleId] = preferenceMatch;
            const results = await analyticsService.getPreferenceTestResults(researchId, moduleId);
            return success({ results }, 200, undefined, origin);
        }

        // GET /analytics/research/:id/text-responses/:moduleId
        const textMatch = path.match(/^\/analytics\/research\/([^\/]+)\/text-responses\/([^\/]+)$/);
        if (textMatch && httpMethod === 'GET') {
            const [, researchId, moduleId] = textMatch;
            const results = await analyticsService.getTextResponses(researchId, moduleId);
            return success({ results }, 200, undefined, origin);
        }

        // GET /analytics/research/:id/choice-responses/:moduleId
        const choiceMatch = path.match(/^\/analytics\/research\/([^\/]+)\/choice-responses\/([^\/]+)$/);
        if (choiceMatch && httpMethod === 'GET') {
            const [, researchId, moduleId] = choiceMatch;
            const results = await analyticsService.getChoiceResponses(researchId, moduleId);
            return success({ results }, 200, undefined, origin);
        }

        // GET /analytics/research/:id/scale-responses/:moduleId
        const scaleMatch = path.match(/^\/analytics\/research\/([^\/]+)\/scale-responses\/([^\/]+)$/);
        if (scaleMatch && httpMethod === 'GET') {
            const [, researchId, moduleId] = scaleMatch;
            const results = await analyticsService.getScaleResponses(researchId, moduleId);
            return success({ results }, 200, undefined, origin);
        }

        // GET /analytics/research/:id/ranking-responses/:moduleId
        const rankingMatch = path.match(/^\/analytics\/research\/([^\/]+)\/ranking-responses\/([^\/]+)$/);
        if (rankingMatch && httpMethod === 'GET') {
            const [, researchId, moduleId] = rankingMatch;
            const results = await analyticsService.getRankingResponses(researchId, moduleId);
            return success({ results }, 200, undefined, origin);
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Analytics error:', err);
        if (isAuthError(err)) {
            return error(errorMessage, err.statusCode, undefined, origin);
        }
        return error(errorMessage, 500, undefined, origin);
    }
};
