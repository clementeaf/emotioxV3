import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { isAuthError, requireAuth } from '../../utils/auth';
import * as researchService from './research.service';
import * as researchInProgressService from './research-in-progress.service';
import * as authService from '../auth/auth.service';
import * as publicService from '../public/public.service';
import { getRequestOrigin } from '../../utils/request';

export const handleResearchRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin = getRequestOrigin(event);

    try {
        let decoded;
        try {
            decoded = await requireAuth(event);
        } catch (authError: unknown) {
            const authErrorMessage = authError instanceof Error ? authError.message : 'Authentication failed';
            console.error('Auth error for', path, ':', authErrorMessage);
            console.error('Headers:', JSON.stringify(event.headers, null, 2));
            if (isAuthError(authError)) {
                return error(authErrorMessage, authError.statusCode, undefined, origin);
            }
            throw authError;
        }
        const user = await authService.getMe(decoded.sub);

        // GET /research
        if (path === '/research' && httpMethod === 'GET') {
            const researches = await researchService.list(user.id);
            return success({ researches }, 200, undefined, origin);
        }

        // POST /research
        if (path === '/research' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            console.log('[Research Controller] POST /research - Body received:', JSON.stringify(body, null, 2));
            console.log('[Research Controller] research_type_id:', body.research_type_id);
            console.log('[Research Controller] use_default_modules:', body.use_default_modules);
            const research = await researchService.create(user.id, body);
            return success({ research }, 201, undefined, origin);
        }

        // GET /research/:id
        const getMatch = path.match(/^\/research\/([^\/]+)$/);
        if (getMatch && httpMethod === 'GET') {
            const id = getMatch[1];
            try {
                const research = await researchService.getById(id, user.id);
                return success({ research }, 200, undefined, origin);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                if (errorMessage.includes('Research not found')) {
                    return error('Research not found', 404, undefined, origin);
                }
                throw err;
            }
        }

        // PUT /research/:id
        const putMatch = path.match(/^\/research\/([^\/]+)$/);
        if (putMatch && httpMethod === 'PUT') {
            const id = putMatch[1];
            const body = JSON.parse(event.body || '{}');
            const research = await researchService.update(id, user.id, body);
            return success({ research }, 200, undefined, origin);
        }

        // DELETE /research/:id
        const deleteMatch = path.match(/^\/research\/([^\/]+)$/);
        if (deleteMatch && httpMethod === 'DELETE') {
            const id = deleteMatch[1];
            const result = await researchService.deleteResearch(id, user.id);
            return success(result, 200, undefined, origin);
        }

        // PATCH /research/:id/status
        const statusMatch = path.match(/^\/research\/([^\/]+)\/status$/);
        if (statusMatch && httpMethod === 'PATCH') {
            const id = statusMatch[1];
            const body = JSON.parse(event.body || '{}');
            const research = await researchService.updateStatus(id, user.id, body.status);
            return success({ research }, 200, undefined, origin);
        }

        // POST /research/:id/activate
        const activateMatch = path.match(/^\/research\/([^\/]+)\/activate$/);
        if (activateMatch && httpMethod === 'POST') {
            const id = activateMatch[1];
            const research = await researchService.activate(id, user.id);
            return success({ research }, 200, undefined, origin);
        }

        // POST /research/:id/stages
        const createStageMatch = path.match(/^\/research\/([^\/]+)\/stages$/);
        if (createStageMatch && httpMethod === 'POST') {
            const id = createStageMatch[1];
            const body = JSON.parse(event.body || '{}');
            if (!body.name) {
                return error('Stage name is required', 400, undefined, origin);
            }
            const stage = await researchService.createStage(id, user.id, body.name, body.description);
            return success({ stage }, 201, undefined, origin);
        }

        // POST /research/:id/add-welcome-thankyou
        const addWelcomeThankYouMatch = path.match(/^\/research\/([^\/]+)\/add-welcome-thankyou$/);
        if (addWelcomeThankYouMatch && httpMethod === 'POST') {
            const id = addWelcomeThankYouMatch[1];
            const result = await researchService.addWelcomeAndThankYouStages(id, user.id);
            return success({ result }, 200, undefined, origin);
        }

        // DELETE /research/:id/stages/:stageId
        const deleteStageMatch = path.match(/^\/research\/([^\/]+)\/stages\/([^\/]+)$/);
        if (deleteStageMatch && httpMethod === 'DELETE') {
            const researchId = deleteStageMatch[1];
            const stageId = deleteStageMatch[2];
            try {
                const result = await researchService.deleteStage(researchId, user.id, stageId);
                return success(result, 200, undefined, origin);
            } catch (deleteError: unknown) {
                const errorMessage = deleteError instanceof Error ? deleteError.message : 'Failed to delete stage';
                console.error('[ResearchController] Error deleting stage:', {
                    researchId,
                    stageId,
                    userId: user.id,
                    error: errorMessage,
                    stack: deleteError instanceof Error ? deleteError.stack : undefined
                });
                
                // Handle specific error cases
                if (errorMessage.includes('Research not found')) {
                    return error('Research not found', 404, undefined, origin);
                }
                if (errorMessage.includes('Stage not found')) {
                    return error('Stage not found', 404, undefined, origin);
                }
                if (errorMessage.includes('foreign key') || errorMessage.includes('constraint')) {
                    return error('Cannot delete stage: it has dependencies that prevent deletion', 409, undefined, origin);
                }
                
                // Generic error
                return error(errorMessage || 'Failed to delete stage', 500, undefined, origin);
            }
        }

        // DELETE /research/:id/modules/:moduleId
        const deleteModuleMatch = path.match(/^\/research\/([^\/]+)\/modules\/([^\/]+)$/);
        if (deleteModuleMatch && httpMethod === 'DELETE') {
            const researchId = deleteModuleMatch[1];
            const moduleId = deleteModuleMatch[2];
            const result = await researchService.deleteModule(researchId, user.id, moduleId);
            return success(result, 200, undefined, origin);
        }

        // PUT /stages/:stageId/modules/reorder
        const reorderModulesMatch = path.match(/^\/stages\/([^\/]+)\/modules\/reorder$/);
        if (reorderModulesMatch && httpMethod === 'PUT') {
            const stageId = reorderModulesMatch[1];
            const body = JSON.parse(event.body || '{}');
            if (!body.updates || !Array.isArray(body.updates)) {
                return error('updates array is required', 400, undefined, origin);
            }
            try {
                const result = await researchService.updateModulesOrderInStage(stageId, user.id, body.updates);
                return success(result, 200, undefined, origin);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to update modules order';
                console.error('Error updating modules order:', err);
                if (errorMessage === 'Stage not found' || errorMessage === 'Research not found') {
                    return error(errorMessage, 404, undefined, origin);
                }
                if (errorMessage.includes('not found in this stage')) {
                    return error(errorMessage, 400, undefined, origin);
                }
                return error(errorMessage, 500, undefined, origin);
            }
        }

        // GET /research/:id/metrics
        const metricsMatch = path.match(/^\/research\/([^\/]+)\/metrics$/);
        if (metricsMatch && httpMethod === 'GET') {
            const researchId = metricsMatch[1];
            try {
                const metrics = await researchInProgressService.getOverviewMetrics(researchId, user.id);
                return success(metrics, 200, undefined, origin);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                if (errorMessage.includes('Research not found')) {
                    return error('Research not found', 404, undefined, origin);
                }
                throw err;
            }
        }

        // GET /research/:id/participants/status
        const participantsStatusMatch = path.match(/^\/research\/([^\/]+)\/participants\/status$/);
        if (participantsStatusMatch && httpMethod === 'GET') {
            const researchId = participantsStatusMatch[1];
            try {
                const participants = await researchInProgressService.getParticipantsWithStatus(researchId, user.id);
                return success(participants, 200, undefined, origin);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                if (errorMessage.includes('Research not found')) {
                    return error('Research not found', 404, undefined, origin);
                }
                throw err;
            }
        }

        // GET /research/:id/participants/:participantId
        const participantDetailsMatch = path.match(/^\/research\/([^\/]+)\/participants\/([^\/]+)$/);
        if (participantDetailsMatch && httpMethod === 'GET') {
            const researchId = participantDetailsMatch[1];
            const participantId = participantDetailsMatch[2];
            const participant = await researchInProgressService.getParticipantDetails(researchId, participantId, user.id);
            return success(participant, 200, undefined, origin);
        }

        // DELETE /research/:id/participants/:participantId
        const deleteParticipantMatch = path.match(/^\/research\/([^\/]+)\/participants\/([^\/]+)$/);
        if (deleteParticipantMatch && httpMethod === 'DELETE') {
            const researchId = deleteParticipantMatch[1];
            const participantId = deleteParticipantMatch[2];
            const result = await researchInProgressService.deleteParticipant(researchId, participantId, user.id);
            return success(result, 200, undefined, origin);
        }

        // GET /eye-tracking-recruit/research/:id
        const eyeTrackingRecruitMatch = path.match(/^\/eye-tracking-recruit\/research\/([^\/]+)$/);
        if (eyeTrackingRecruitMatch && httpMethod === 'GET') {
            const researchId = eyeTrackingRecruitMatch[1];
            // Verificar que el research existe y pertenece al usuario
            await researchService.getById(researchId, user.id);
            const config = await publicService.getResearchConfiguration(researchId);
            return success({ linkConfig: config.linkConfig || {}, ...config }, 200, undefined, origin);
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: any) {
        console.error('Research controller error:', err);

        if (err.message === 'Invalid or expired token' || err.message === 'No token provided' || err.message === 'No authorization header') {
            return error(err.message, 401, undefined, origin);
        }

        return error(err.message || 'Internal server error', 500, undefined, origin);
    }
};
