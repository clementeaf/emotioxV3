import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import * as publicService from './index';
import * as mediaService from '../media/media.service';

export const handlePublicRoutes = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin: string | null = (event.headers.Origin || event.headers.origin || null) as string | null;
    try {
        // No auth required for public routes

        // GET /public/research/:id
        const researchMatch = path.match(/^\/public\/research\/([^\/]+)$/);
        if (researchMatch && httpMethod === 'GET') {
            const researchId = researchMatch[1];
            try {
                const preview = event.queryStringParameters?.preview === 'true';
                console.log(`[Public API] Fetching research: ${researchId}${preview ? ' (preview mode)' : ''}`);
                const research = await publicService.getResearch(researchId, preview);
                console.log(`[Public API] Successfully fetched research: ${researchId}`);
                return success({ research }, 200, undefined, origin);
            } catch (serviceError: unknown) {
                console.error('[Public API] Error in getResearch service:', serviceError);
                const errorMessage = serviceError instanceof Error ? serviceError.message : 'Failed to load research';
                console.error('[Public API] Error details:', {
                    researchId,
                    error: errorMessage,
                    stack: serviceError instanceof Error ? serviceError.stack : undefined
                });
                
                // Return 404 for not found errors, 500 for others
                if (errorMessage.includes('not found') || errorMessage.includes('not active') || errorMessage.includes('deleted')) {
                    return error(errorMessage, 404, undefined, origin);
                }
                
                throw serviceError; // Re-throw to be caught by outer catch
            }
        }

        // GET /public/research/:id/mode
        const modeMatch = path.match(/^\/public\/research\/([^\/]+)\/mode$/);
        if (modeMatch && httpMethod === 'GET') {
            const researchId = modeMatch[1];
            const mode = await publicService.getParticipationMode(researchId);
            return success({ mode, settings: {} }, 200, undefined, origin);
        }

        // POST /public/research/:id/kiosk/session
        const kioskMatch = path.match(/^\/public\/research\/([^\/]+)\/kiosk\/session$/);
        if (kioskMatch && httpMethod === 'POST') {
            const researchId = kioskMatch[1];
            try {
                const result = await publicService.generateKioskSession(researchId);
                return success(result, 201, undefined, origin);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to create kiosk session';
                if (errorMessage.includes('not configured in kiosk mode') || errorMessage.includes('not found')) {
                    return error(errorMessage, 400, undefined, origin);
                }
                throw err;
            }
        }

        // GET /public/research/:id/participant/:participantId/status
        const participantStatusMatch = path.match(/^\/public\/research\/([^\/]+)\/participant\/([^\/]+)\/status$/);
        if (participantStatusMatch && httpMethod === 'GET') {
            const researchId = participantStatusMatch[1];
            const participantId = participantStatusMatch[2];
            const status = await publicService.getParticipantStatus(researchId, participantId);
            return success(status, 200, undefined, origin);
        }

        // GET /public/research/:id/participant/:participantId/responses
        const participantResponsesMatch = path.match(/^\/public\/research\/([^\/]+)\/participant\/([^\/]+)\/responses$/);
        if (participantResponsesMatch && httpMethod === 'GET') {
            const researchId = participantResponsesMatch[1];
            const participantId = decodeURIComponent(participantResponsesMatch[2]);
            const responses = await publicService.getParticipantResponses(researchId, participantId);
            return success({ responses }, 200, undefined, origin);
        }

        // POST /public/research/:id/responses
        const responsesMatch = path.match(/^\/public\/research\/([^\/]+)\/responses$/);
        if (responsesMatch && httpMethod === 'POST') {
            const researchId = responsesMatch[1];
            const body = JSON.parse(event.body || '{}');
            try {
                const result = await publicService.saveParticipantResponses(researchId, body);
                return success(result, 201, undefined, origin);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Failed to save responses';
                if (msg.includes('not active') || msg.includes('not found')) {
                    return error(msg, 410, undefined, origin);
                }
                if (msg.includes('Participant limit reached')) {
                    return error(msg, 410, undefined, origin);
                }
                throw err;
            }
        }

        // GET /public/research/:id/progress — public read-only progress (no auth)
        const progressMatch = path.match(/^\/public\/research\/([^\/]+)\/progress$/);
        if (progressMatch && httpMethod === 'GET') {
            const researchId = progressMatch[1];
            try {
                const { getOverviewMetricsInternal, getParticipantsWithStatusInternal } = await import('../research/research-in-progress.service');
                const [metrics, participants] = await Promise.all([
                    getOverviewMetricsInternal(researchId),
                    getParticipantsWithStatusInternal(researchId),
                ]);
                return success({ metrics, participants }, 200, undefined, origin);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Failed to load progress';
                if (msg.includes('not found')) return error(msg, 404, undefined, origin);
                throw err;
            }
        }

        // GET /public/research/:id/quota-availability
        const quotaAvailMatch = path.match(/^\/public\/research\/([^\/]+)\/quota-availability$/);
        if (quotaAvailMatch && httpMethod === 'GET') {
            const researchId = quotaAvailMatch[1];
            const result = await publicService.checkQuotaPreAvailability(researchId);
            return success(result, 200, undefined, origin);
        }

        // POST /public/research/:id/validate-demographics
        const validateMatch = path.match(/^\/public\/research\/([^\/]+)\/validate-demographics$/);
        if (validateMatch && httpMethod === 'POST') {
            const researchId = validateMatch[1];
            const body = JSON.parse(event.body || '{}');
            const validation = await publicService.validateDemographics(researchId, body.demographics || {}, body.participantId);
            return success({ validation }, 200, undefined, origin);
        }

        // GET /public/media/by-key?s3_key=...
        if (path === '/public/media/by-key' && httpMethod === 'GET') {
            try {
                const rawS3Key = event.queryStringParameters?.s3_key;
                if (!rawS3Key) {
                    return error('s3_key query parameter is required', 400, undefined, origin);
                }
                
                // Decode URL-encoded s3_key (API Gateway should do this, but handle manually for safety)
                const s3Key = decodeURIComponent(rawS3Key);
                
                console.log(`[Public API] Getting media URL for s3_key: ${s3Key}`);
                const result = await mediaService.getMediaUrlByPath(s3Key);
                console.log(`[Public API] Successfully generated media URL for s3_key: ${s3Key}`);
                return success(result, 200, undefined, origin);
            } catch (serviceError: unknown) {
                console.error('[Public API] Error in getMediaUrlByS3Key:', serviceError);
                const errorMessage = serviceError instanceof Error ? serviceError.message : 'Failed to get media URL';
                console.error('[Public API] Error details:', {
                    s3Key: event.queryStringParameters?.s3_key,
                    error: errorMessage,
                    stack: serviceError instanceof Error ? serviceError.stack : undefined
                });
                
                // Return 404 for not found errors, 400 for validation errors, 500 for others
                if (errorMessage.includes('not found')) {
                    return error(errorMessage, 404, undefined, origin);
                }
                if (errorMessage.includes('Invalid') || errorMessage.includes('required')) {
                    return error(errorMessage, 400, undefined, origin);
                }
                
                throw serviceError; // Re-throw to be caught by outer catch
            }
        }

        // Legacy endpoint (deprecated)
        if (path === '/public/responses' && httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const response = await publicService.saveResponse(body);
            return success({ response }, 201, undefined, origin);
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Public API error:', err);
        return error(errorMessage, 500, undefined, origin);
    }
};
