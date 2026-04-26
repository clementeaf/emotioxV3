/**
 * Website Tracking Controller
 * Handles public endpoints (script, session, events) and authenticated endpoints (analytics, config).
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { requireAuth } from '../../utils/auth.local';
import { getRequestOrigin } from '../../utils/request';
import {
    createSession,
    saveEvents,
    getTrackingConfig,
    getClickHeatmapData,
    getScrollDepthData,
    getOverviewMetrics,
    getTrackedPages,
    getSessions,
    getSessionEvents,
    getPageFunnels,
    getExportData,
    savePageScreenshot,
    saveTrackingConfig,
} from './tracking.service';
import { generateTrackingSnippet, generateEmbedSnippet } from './tracking-snippet';

// ─── CORS helpers for public tracking (accepts ANY origin) ───────────

const TRACKING_CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
};

const trackingSuccess = <T>(data: T, statusCode = 200): APIGatewayProxyResult => ({
    statusCode,
    headers: TRACKING_CORS_HEADERS,
    body: JSON.stringify(data),
});

const trackingError = (message: string, statusCode = 400): APIGatewayProxyResult => ({
    statusCode,
    headers: TRACKING_CORS_HEADERS,
    body: JSON.stringify({ message }),
});

// ─── Public Routes (called by the tracking script, no auth) ──────────

export const handlePublicTrackingRoutes = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;

    // CORS preflight for tracking endpoints (any origin)
    if (httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: TRACKING_CORS_HEADERS, body: '' };
    }

    try {
        // GET /public/tracking/:researchId/script.js — serve the tracking script
        const scriptMatch = path.match(/^\/public\/tracking\/([^/]+)\/script\.js$/);
        if (scriptMatch && httpMethod === 'GET') {
            const researchId = scriptMatch[1];

            try {
                const config = await getTrackingConfig(researchId);

                // Determine API base URL from request
                const host = event.headers.Host || event.headers.host || 'emotio.cx';
                const proto = event.headers['X-Forwarded-Proto'] || 'https';
                const apiBaseUrl = `${proto}://${host}/api`;

                const js = generateTrackingSnippet({
                    researchId,
                    apiBaseUrl,
                    captureClicks: config.captureClicks,
                    captureScroll: config.captureScroll,
                    captureMousemove: config.captureMousemove,
                    consentRequired: config.consentRequired,
                    flushIntervalMs: config.flushIntervalMs,
                    maxEventsPerFlush: config.maxEventsPerFlush,
                });

                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/javascript; charset=utf-8',
                        'Cache-Control': 'public, max-age=300',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: js,
                };
            } catch (err) {
                // Return empty script if research not found/inactive
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/javascript; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: '/* EmotioX tracking: research not available */',
                };
            }
        }

        // GET /public/tracking/:researchId/config — tracking configuration
        const configMatch = path.match(/^\/public\/tracking\/([^/]+)\/config$/);
        if (configMatch && httpMethod === 'GET') {
            const researchId = configMatch[1];
            const config = await getTrackingConfig(researchId);
            return trackingSuccess(config);
        }

        // POST /public/tracking/:researchId/session — create tracking session
        const sessionMatch = path.match(/^\/public\/tracking\/([^/]+)\/session$/);
        if (sessionMatch && httpMethod === 'POST') {
            const researchId = sessionMatch[1];
            const body = JSON.parse(event.body || '{}');

            if (!body.visitorId || !body.pageUrl || !body.viewportWidth || !body.viewportHeight) {
                return trackingError('Missing required fields: visitorId, pageUrl, viewportWidth, viewportHeight');
            }

            const result = await createSession({
                researchId,
                visitorId: body.visitorId,
                pageUrl: body.pageUrl,
                pageTitle: body.pageTitle,
                viewportWidth: body.viewportWidth,
                viewportHeight: body.viewportHeight,
                screenWidth: body.screenWidth,
                screenHeight: body.screenHeight,
                userAgent: body.userAgent,
                referrer: body.referrer,
            });

            return trackingSuccess(result, 201);
        }

        // POST /public/tracking/:researchId/events — batch save events
        const eventsMatch = path.match(/^\/public\/tracking\/([^/]+)\/events$/);
        if (eventsMatch && httpMethod === 'POST') {
            let body: Record<string, unknown>;
            try {
                // Support both JSON and sendBeacon blob
                body = JSON.parse(event.body || '{}');
            } catch {
                return trackingError('Invalid JSON');
            }

            const sessionId = body.sessionId as string;
            const events = body.events as Array<Record<string, unknown>>;

            if (!sessionId || !Array.isArray(events)) {
                return trackingError('Missing sessionId or events array');
            }

            const result = await saveEvents(sessionId, events.map((e) => ({
                eventType: e.eventType as 'click' | 'scroll' | 'mousemove' | 'resize' | 'pageview',
                x: typeof e.x === 'number' ? e.x : undefined,
                y: typeof e.y === 'number' ? e.y : undefined,
                scrollY: typeof e.scrollY === 'number' ? e.scrollY : undefined,
                scrollDepthPct: typeof e.scrollDepthPct === 'number' ? e.scrollDepthPct : undefined,
                targetSelector: typeof e.targetSelector === 'string' ? e.targetSelector : undefined,
                targetText: typeof e.targetText === 'string' ? e.targetText : undefined,
                timestampMs: typeof e.timestampMs === 'number' ? e.timestampMs : Date.now(),
                metadata: typeof e.metadata === 'object' ? e.metadata as Record<string, unknown> : undefined,
            })));

            return trackingSuccess(result, 201);
        }

        return trackingError('Route not found', 404);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[Tracking Public] Error:', err);
        if (msg.includes('not found') || msg.includes('not active')) {
            return trackingError(msg, 404);
        }
        return trackingError(msg, 500);
    }
};

// ─── Authenticated Routes (research-frontend) ───────────────────────

export const handleTrackingRoutes = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin = getRequestOrigin(event);

    try {
        await requireAuth(event);

        // GET /tracking/:researchId/overview — overview metrics
        const overviewMatch = path.match(/^\/tracking\/([^/]+)\/overview$/);
        if (overviewMatch && httpMethod === 'GET') {
            const researchId = overviewMatch[1];
            const metrics = await getOverviewMetrics(researchId);
            return success(metrics, 200, undefined, origin);
        }

        // GET /tracking/:researchId/pages — list tracked pages
        const pagesMatch = path.match(/^\/tracking\/([^/]+)\/pages$/);
        if (pagesMatch && httpMethod === 'GET') {
            const researchId = pagesMatch[1];
            const pages = await getTrackedPages(researchId);
            return success({ pages }, 200, undefined, origin);
        }

        // GET /tracking/:researchId/heatmap?page=URL — click heatmap data
        const heatmapMatch = path.match(/^\/tracking\/([^/]+)\/heatmap$/);
        if (heatmapMatch && httpMethod === 'GET') {
            const researchId = heatmapMatch[1];
            const pageUrl = event.queryStringParameters?.page
                ? decodeURIComponent(event.queryStringParameters.page)
                : undefined;
            const data = await getClickHeatmapData(researchId, pageUrl);
            return success(data, 200, undefined, origin);
        }

        // GET /tracking/:researchId/sessions — list sessions
        const sessionsMatch = path.match(/^\/tracking\/([^/]+)\/sessions$/);
        if (sessionsMatch && httpMethod === 'GET') {
            const researchId = sessionsMatch[1];
            const limit = parseInt(event.queryStringParameters?.limit || '50', 10);
            const offset = parseInt(event.queryStringParameters?.offset || '0', 10);
            const sessions = await getSessions(researchId, limit, offset);
            return success({ sessions }, 200, undefined, origin);
        }

        // GET /tracking/:researchId/scroll?page=URL — scroll depth data
        const scrollMatch = path.match(/^\/tracking\/([^/]+)\/scroll$/);
        if (scrollMatch && httpMethod === 'GET') {
            const researchId = scrollMatch[1];
            const pageUrl = event.queryStringParameters?.page
                ? decodeURIComponent(event.queryStringParameters.page)
                : undefined;
            const data = await getScrollDepthData(researchId, pageUrl);
            return success(data, 200, undefined, origin);
        }

        // GET /tracking/:researchId/sessions/:sessionId/events — session replay data
        const sessionEventsMatch = path.match(/^\/tracking\/([^/]+)\/sessions\/([^/]+)\/events$/);
        if (sessionEventsMatch && httpMethod === 'GET') {
            const sessionId = sessionEventsMatch[2];
            const data = await getSessionEvents(sessionId);
            return success(data, 200, undefined, origin);
        }

        // GET /tracking/:researchId/funnels — page transition funnels
        const funnelsMatch = path.match(/^\/tracking\/([^/]+)\/funnels$/);
        if (funnelsMatch && httpMethod === 'GET') {
            const researchId = funnelsMatch[1];
            const data = await getPageFunnels(researchId);
            return success(data, 200, undefined, origin);
        }

        // GET /tracking/:researchId/export — CSV export data
        const exportMatch = path.match(/^\/tracking\/([^/]+)\/export$/);
        if (exportMatch && httpMethod === 'GET') {
            const researchId = exportMatch[1];
            const data = await getExportData(researchId);
            return success(data, 200, undefined, origin);
        }

        // PUT /tracking/:researchId/config — update tracking config
        const configUpdateMatch = path.match(/^\/tracking\/([^/]+)\/config$/);
        if (configUpdateMatch && httpMethod === 'PUT') {
            const researchId = configUpdateMatch[1];
            const body = JSON.parse(event.body || '{}');
            await saveTrackingConfig(researchId, body);
            return success({ updated: true }, 200, undefined, origin);
        }

        // GET /tracking/:researchId/snippet — get embed snippet
        const snippetMatch = path.match(/^\/tracking\/([^/]+)\/snippet$/);
        if (snippetMatch && httpMethod === 'GET') {
            const researchId = snippetMatch[1];
            const host = event.headers.Host || event.headers.host || 'emotio.cx';
            const proto = event.headers['X-Forwarded-Proto'] || 'https';
            const apiBaseUrl = `${proto}://${host}/api`;
            const snippet = generateEmbedSnippet(researchId, apiBaseUrl);
            return success({ snippet }, 200, undefined, origin);
        }

        // POST /tracking/:researchId/pages/screenshot — save screenshot s3key for a page
        const screenshotMatch = path.match(/^\/tracking\/([^/]+)\/pages\/screenshot$/);
        if (screenshotMatch && httpMethod === 'POST') {
            const researchId = screenshotMatch[1];
            const body = JSON.parse(event.body || '{}');
            if (!body.pageUrl || !body.screenshotS3Key) {
                return error('Missing pageUrl or screenshotS3Key', 400, undefined, origin);
            }
            await savePageScreenshot(researchId, body.pageUrl, body.screenshotS3Key);
            return success({ updated: true }, 200, undefined, origin);
        }

        return error('Route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[Tracking] Error:', err);
        return error(msg, 500, undefined, origin);
    }
};
