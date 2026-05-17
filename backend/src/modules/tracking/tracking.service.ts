/**
 * Website Tracking Service
 * Handles session creation, event storage, and analytics aggregation.
 */

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import pool from '../../config/database';
import { getMediaPath, ensureDirectoryExists } from '../../config/local-storage';

// ─── Types ───────────────────────────────────────────────────────────

interface CreateSessionInput {
    researchId: string;
    visitorId: string;
    pageUrl: string;
    pageTitle?: string;
    viewportWidth: number;
    viewportHeight: number;
    screenWidth?: number;
    screenHeight?: number;
    userAgent?: string;
    referrer?: string;
    requestOrigin?: string;
    requestIP?: string;
}

interface TrackingEvent {
    eventType: 'click' | 'scroll' | 'mousemove' | 'resize' | 'pageview';
    x?: number;
    y?: number;
    scrollY?: number;
    scrollDepthPct?: number;
    targetSelector?: string;
    targetText?: string;
    timestampMs: number;
    elementOffsetX?: number;
    elementOffsetY?: number;
    elementWidth?: number;
    elementHeight?: number;
    metadata?: Record<string, unknown>;
}

interface FunnelStep {
    url: string;
    label: string;
}

interface FunnelDefinition {
    id: string;
    name: string;
    steps: FunnelStep[];
}

interface TrackingConfig {
    captureClicks: boolean;
    captureScroll: boolean;
    captureMousemove: boolean;
    consentRequired: boolean;
    flushIntervalMs: number;
    maxEventsPerFlush: number;
    allowedDomains: string[];
    consentText: string;
    consentAcceptLabel: string;
    consentDeclineLabel: string;
    consentPosition: 'bottom' | 'top';
    samplingRate: number;
    excludedIPs: string[];
    targetPages: string[];
    excludePages: string[];
    dataRetentionDays: number;
    funnels?: FunnelDefinition[];
}

// ─── Session Management ──────────────────────────────────────────────

export const createSession = async (input: CreateSessionInput): Promise<{ sessionId: string }> => {
    // Validate research exists and is active
    const research = await pool.query(
        'SELECT id, status, config FROM researches WHERE id = ? AND deleted_at IS NULL',
        [input.researchId]
    );
    if (research.rows.length === 0) {
        throw new Error('Research not found');
    }
    if (research.rows[0].status !== 'active') {
        throw new Error('Research is not active');
    }

    // Validate domain if allowedDomains is configured
    let config: Record<string, unknown> = {};
    try {
        const raw = research.rows[0].config;
        config = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    } catch { config = {}; }
    const trackingConfig = (config.trackingConfig || {}) as Record<string, unknown>;
    const allowedDomains = (trackingConfig.allowedDomains as string[]) || [];

    if (allowedDomains.length > 0) {
        let hostname = '';
        try {
            // Extract hostname from pageUrl or request origin
            const source = input.requestOrigin || input.pageUrl;
            hostname = new URL(source.startsWith('http') ? source : `https://${source}`).hostname;
        } catch { /* invalid URL — will fail validation */ }

        const domainAllowed = allowedDomains.some((d) => {
            // Strip protocol, path, port — compare hostname only
            const clean = d.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
            return hostname === clean || hostname.endsWith(`.${clean}`);
        });
        if (!domainAllowed) {
            throw new Error('Domain not allowed');
        }
    }

    // Check IP exclusion
    const excludedIPs = (trackingConfig.excludedIPs as string[]) || [];
    if (excludedIPs.length > 0 && input.requestIP) {
        if (excludedIPs.includes(input.requestIP)) {
            throw new Error('IP excluded from tracking');
        }
    }

    const sessionId = uuidv4();
    await pool.query(
        `INSERT INTO tracking_sessions
         (id, research_id, visitor_id, page_url, page_title, viewport_width, viewport_height, screen_width, screen_height, user_agent, referrer)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            sessionId,
            input.researchId,
            input.visitorId,
            input.pageUrl,
            input.pageTitle || null,
            input.viewportWidth,
            input.viewportHeight,
            input.screenWidth || null,
            input.screenHeight || null,
            input.userAgent || null,
            input.referrer || null,
        ]
    );

    // Upsert tracking_pages entry for this URL
    const existingPage = await pool.query(
        'SELECT id FROM tracking_pages WHERE research_id = ? AND page_url = ?',
        [input.researchId, input.pageUrl]
    );
    if (existingPage.rows.length === 0) {
        await pool.query(
            `INSERT INTO tracking_pages (id, research_id, page_url, page_title, viewport_width, viewport_height)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [uuidv4(), input.researchId, input.pageUrl, input.pageTitle || null, input.viewportWidth, input.viewportHeight]
        );
    }

    return { sessionId };
};

// ─── Event Ingestion ─────────────────────────────────────────────────

export const saveEvents = async (sessionId: string, events: TrackingEvent[]): Promise<{ saved: number }> => {
    if (events.length === 0) return { saved: 0 };

    // Validate session exists
    const session = await pool.query(
        'SELECT id FROM tracking_sessions WHERE id = ?',
        [sessionId]
    );
    if (session.rows.length === 0) {
        throw new Error('Session not found');
    }

    // Cap at 50 events per flush to prevent abuse
    const capped = events.slice(0, 50);

    // Batch INSERT
    const placeholders = capped.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values = capped.flatMap((e) => [
        uuidv4(),
        sessionId,
        e.eventType,
        e.x ?? null,
        e.y ?? null,
        e.scrollY ?? null,
        e.scrollDepthPct ?? null,
        e.targetSelector ?? null,
        e.targetText ?? null,
        e.timestampMs,
        e.metadata ? JSON.stringify(e.metadata) : null,
        e.elementOffsetX ?? null,
        e.elementOffsetY ?? null,
        e.elementWidth ?? null,
        e.elementHeight ?? null,
    ]);

    await pool.query(
        `INSERT INTO tracking_events
         (id, session_id, event_type, x, y, scroll_y, scroll_depth_pct, target_selector, target_text, timestamp_ms, metadata, element_offset_x, element_offset_y, element_width, element_height)
         VALUES ${placeholders}`,
        values
    );

    // Update session ended_at to last event timestamp
    const lastTs = Math.max(...capped.map((e) => e.timestampMs));
    await pool.query(
        'UPDATE tracking_sessions SET ended_at = FROM_UNIXTIME(? / 1000) WHERE id = ?',
        [lastTs, sessionId]
    );

    return { saved: capped.length };
};

// ─── Tracking Config ─────────────────────────────────────────────────

export const getTrackingConfig = async (researchId: string): Promise<TrackingConfig> => {
    // No status check here — script.js should be servable in draft for testing installation.
    // Session creation (createSession) enforces the active-status requirement independently.
    const result = await pool.query(
        'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
        [researchId]
    );
    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }

    let config: Record<string, unknown> = {};
    try {
        const raw = result.rows[0].config;
        config = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    } catch {
        config = {};
    }

    const trackingConfig = (config.trackingConfig || {}) as Record<string, unknown>;

    return {
        captureClicks: trackingConfig.captureClicks !== false,
        captureScroll: trackingConfig.captureScroll === true,
        captureMousemove: trackingConfig.captureMousemove === true,
        consentRequired: trackingConfig.consentRequired !== false,
        flushIntervalMs: (trackingConfig.flushIntervalMs as number) || 2000,
        maxEventsPerFlush: (trackingConfig.maxEventsPerFlush as number) || 50,
        allowedDomains: (trackingConfig.allowedDomains as string[]) || [],
        consentText: (trackingConfig.consentText as string) || 'This site uses interaction tracking for UX research.',
        consentAcceptLabel: (trackingConfig.consentAcceptLabel as string) || 'Accept',
        consentDeclineLabel: (trackingConfig.consentDeclineLabel as string) || 'Decline',
        consentPosition: (trackingConfig.consentPosition as 'bottom' | 'top') || 'bottom',
        samplingRate: typeof trackingConfig.samplingRate === 'number' ? trackingConfig.samplingRate : 100,
        excludedIPs: (trackingConfig.excludedIPs as string[]) || [],
        targetPages: (trackingConfig.targetPages as string[]) || [],
        excludePages: (trackingConfig.excludePages as string[]) || [],
        dataRetentionDays: (trackingConfig.dataRetentionDays as number) || 90,
        funnels: (trackingConfig.funnels as FunnelDefinition[]) || [],
    };
};

// ─── Analytics: Click Heatmap Data ────────���──────────────────────────

// ─── Date Range Helper ──────────────────────────────────────────────

const getDateFilter = (from?: string, to?: string): { clause: string; params: unknown[] } => {
    if (!from && !to) return { clause: '', params: [] };
    const parts: string[] = [];
    const params: unknown[] = [];
    if (from) { parts.push('ts.started_at >= ?'); params.push(from); }
    if (to) { parts.push('ts.started_at <= ?'); params.push(to + ' 23:59:59'); }
    return { clause: ' AND ' + parts.join(' AND '), params };
};

// Viewport breakpoints for device bucketing
const DEVICE_BREAKPOINTS = {
    mobile: { min: 0, max: 767 },
    tablet: { min: 768, max: 1024 },
    desktop: { min: 1025, max: 99999 },
} as const;

const getDeviceFilter = (device?: 'mobile' | 'tablet' | 'desktop'): { clause: string; params: unknown[] } => {
    if (!device || !DEVICE_BREAKPOINTS[device]) return { clause: '', params: [] };
    const bp = DEVICE_BREAKPOINTS[device];
    return { clause: ' AND ts.viewport_width >= ? AND ts.viewport_width <= ?', params: [bp.min, bp.max] };
};

export const getClickHeatmapData = async (
    researchId: string,
    pageUrl?: string,
    device?: 'mobile' | 'tablet' | 'desktop'
): Promise<{ clicks: Array<{ x: number; y: number; count: number }>; totalClicks: number; sessions: number }> => {
    const deviceFilter = getDeviceFilter(device);

    // Coordinates stored as raw pixels (pageX, pageY).
    // Normalize to percentage-of-viewport-width at query time.
    // Rendering: (x_pct/100)*renderWidth, (y_pct/100)*renderWidth
    let query = `
        SELECT
            ROUND(te.x / ts.viewport_width * 100, 1) as x,
            ROUND(te.y / ts.viewport_width * 100, 1) as y,
            COUNT(*) as count
        FROM tracking_events te
        JOIN tracking_sessions ts ON te.session_id = ts.id
        WHERE ts.research_id = ?
          AND te.event_type = 'click'
          AND te.x IS NOT NULL
          AND te.y IS NOT NULL
          AND ts.viewport_width > 0
    `;
    const params: unknown[] = [researchId];

    if (pageUrl) {
        query += ' AND ts.page_url = ?';
        params.push(pageUrl);
    }
    query += deviceFilter.clause;
    params.push(...deviceFilter.params);

    query += ` GROUP BY ROUND(te.x / ts.viewport_width * 100, 1),
            ROUND(te.y / ts.viewport_width * 100, 1)
            ORDER BY count DESC`;

    const result = await pool.query(query, params);

    const clicks = result.rows.map((row: Record<string, unknown>) => ({
        x: Number(row.x),
        y: Number(row.y),
        count: Number(row.count),
    }));

    // Get totals
    let totalsQuery = `
        SELECT
            COUNT(*) as totalClicks,
            COUNT(DISTINCT ts.id) as sessions
        FROM tracking_events te
        JOIN tracking_sessions ts ON te.session_id = ts.id
        WHERE ts.research_id = ?
          AND te.event_type = 'click'
    `;
    const totalsParams: unknown[] = [researchId];
    if (pageUrl) {
        totalsQuery += ' AND ts.page_url = ?';
        totalsParams.push(pageUrl);
    }
    totalsQuery += deviceFilter.clause;
    totalsParams.push(...deviceFilter.params);

    const totals = await pool.query(totalsQuery, totalsParams);
    const totalClicks = Number(totals.rows[0]?.totalClicks || 0);
    const sessions = Number(totals.rows[0]?.sessions || 0);

    return { clicks, totalClicks, sessions };
};

/**
 * Element-based click data — returns clicks grouped by CSS selector with element-relative offsets.
 * Used for precise heatmap rendering over live iframe (Hotjar-style).
 */
export const getElementClickData = async (
    researchId: string,
    pageUrl?: string,
    device?: 'mobile' | 'tablet' | 'desktop'
): Promise<{ clicks: Array<{ selector: string; offsetX: number; offsetY: number; elementWidth: number; elementHeight: number; count: number; x: number; y: number }> }> => {
    const deviceFilter = getDeviceFilter(device);

    let query = `
        SELECT
            te.target_selector as selector,
            ROUND(te.element_offset_x, 1) as offsetX,
            ROUND(te.element_offset_y, 1) as offsetY,
            te.element_width as elementWidth,
            te.element_height as elementHeight,
            ROUND(te.x / ts.viewport_width * 100, 1) as x,
            ROUND(te.y / ts.viewport_width * 100, 1) as y,
            COUNT(*) as count
        FROM tracking_events te
        JOIN tracking_sessions ts ON te.session_id = ts.id
        WHERE ts.research_id = ?
          AND te.event_type = 'click'
          AND te.x IS NOT NULL
          AND te.y IS NOT NULL
          AND ts.viewport_width > 0
    `;
    const params: unknown[] = [researchId];
    if (pageUrl) { query += ' AND ts.page_url = ?'; params.push(pageUrl); }
    query += deviceFilter.clause;
    params.push(...deviceFilter.params);

    query += ` GROUP BY te.target_selector, ROUND(te.element_offset_x, 1), ROUND(te.element_offset_y, 1),
               te.element_width, te.element_height,
               ROUND(te.x / ts.viewport_width * 100, 1),
               ROUND(te.y / ts.viewport_width * 100, 1)
               ORDER BY count DESC`;

    const result = await pool.query(query, params);

    return {
        clicks: result.rows.map((row: Record<string, unknown>) => ({
            selector: (row.selector as string) || '',
            offsetX: Number(row.offsetX) || 0,
            offsetY: Number(row.offsetY) || 0,
            elementWidth: Number(row.elementWidth) || 0,
            elementHeight: Number(row.elementHeight) || 0,
            x: Number(row.x),
            y: Number(row.y),
            count: Number(row.count),
        })),
    };
};

/**
 * Mouse-based attention heatmap — mousemove positions as gaze proxy (Ischen 2022).
 * Groups by 2% grid cells for cleaner density map.
 */
export const getMouseAttentionData = async (
    researchId: string,
    pageUrl?: string,
    device?: 'mobile' | 'tablet' | 'desktop'
): Promise<{ points: Array<{ x: number; y: number; dwell: number }>; totalMoves: number; sessions: number }> => {
    const deviceFilter = getDeviceFilter(device);

    let query = `
        SELECT
            ROUND(te.x / ts.viewport_width * 100, 0) as x,
            ROUND(te.y / ts.viewport_width * 100, 0) as y,
            COUNT(*) as dwell
        FROM tracking_events te
        JOIN tracking_sessions ts ON te.session_id = ts.id
        WHERE ts.research_id = ?
          AND te.event_type = 'mousemove'
          AND te.x IS NOT NULL AND te.y IS NOT NULL
          AND ts.viewport_width > 0
    `;
    const params: unknown[] = [researchId];
    if (pageUrl) { query += ' AND ts.page_url = ?'; params.push(pageUrl); }
    query += deviceFilter.clause;
    params.push(...deviceFilter.params);
    query += ` GROUP BY ROUND(te.x / ts.viewport_width * 100, 0),
                        ROUND(te.y / ts.viewport_width * 100, 0)
               ORDER BY dwell DESC LIMIT 5000`;

    const result = await pool.query(query, params);
    const points = result.rows.map((row: Record<string, unknown>) => ({
        x: Number(row.x), y: Number(row.y), dwell: Number(row.dwell),
    }));

    let totalsQuery = `SELECT COUNT(*) as total, COUNT(DISTINCT ts.id) as sessions
        FROM tracking_events te JOIN tracking_sessions ts ON te.session_id = ts.id
        WHERE ts.research_id = ? AND te.event_type = 'mousemove'`;
    const tp: unknown[] = [researchId];
    if (pageUrl) { totalsQuery += ' AND ts.page_url = ?'; tp.push(pageUrl); }
    totalsQuery += deviceFilter.clause; tp.push(...deviceFilter.params);
    const totals = await pool.query(totalsQuery, tp);

    return { points, totalMoves: Number(totals.rows[0]?.total || 0), sessions: Number(totals.rows[0]?.sessions || 0) };
};

// ─── Verification: Recent Sessions ──────────────────────────────────

export const getRecentSessionCount = async (
    researchId: string,
    sinceSeconds: number
): Promise<{ count: number; hasData: boolean }> => {
    const result = await pool.query(
        `SELECT COUNT(*) as cnt FROM tracking_sessions
         WHERE research_id = ? AND started_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)`,
        [researchId, Math.min(sinceSeconds, 300)]
    );
    const count = Number(result.rows[0]?.cnt || 0);
    return { count, hasData: count > 0 };
};

// ─── Analytics: Overview Metrics ─────────────────────────────────────

export const getOverviewMetrics = async (researchId: string, from?: string, to?: string) => {
    const dateFilter = getDateFilter(from, to);
    const result = await pool.query(
        `SELECT
            COUNT(DISTINCT ts.id) as totalSessions,
            COUNT(DISTINCT ts.visitor_id) as uniqueVisitors,
            COUNT(DISTINCT ts.page_url) as pagesTracked,
            COUNT(te.id) as totalEvents,
            AVG(LEAST(TIMESTAMPDIFF(SECOND, ts.started_at, ts.ended_at), 1800)) as avgSessionDuration
         FROM tracking_sessions ts
         LEFT JOIN tracking_events te ON te.session_id = ts.id
         WHERE ts.research_id = ?${dateFilter.clause}`,
        [researchId, ...dateFilter.params]
    );

    const row = result.rows[0] || {};
    return {
        totalSessions: Number(row.totalSessions || 0),
        uniqueVisitors: Number(row.uniqueVisitors || 0),
        pagesTracked: Number(row.pagesTracked || 0),
        totalEvents: Number(row.totalEvents || 0),
        avgSessionDuration: Math.round(Number(row.avgSessionDuration || 0)),
    };
};

// ─── Analytics: Tracked Pages List ──────────���────────────────────────

export const getTrackedPages = async (researchId: string) => {
    const result = await pool.query(
        `SELECT
            tp.id, tp.page_url, tp.page_title, tp.screenshot_s3_key, tp.screenshot_devices,
            tp.viewport_width, tp.viewport_height,
            (tp.page_snapshot IS NOT NULL) as hasSnapshot,
            COUNT(DISTINCT ts.id) as sessionCount,
            COUNT(te.id) as eventCount,
            MAX(ts.started_at) as lastVisitedAt
         FROM tracking_pages tp
         LEFT JOIN tracking_sessions ts ON ts.research_id = tp.research_id AND ts.page_url = tp.page_url
         LEFT JOIN tracking_events te ON te.session_id = ts.id
         WHERE tp.research_id = ?
         GROUP BY tp.id
         ORDER BY sessionCount DESC`,
        [researchId]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        pageUrl: row.page_url,
        pageTitle: row.page_title,
        screenshotS3Key: row.screenshot_s3_key,
        screenshotDevices: row.screenshot_devices
            ? (typeof row.screenshot_devices === 'string'
                ? JSON.parse(row.screenshot_devices as string)
                : row.screenshot_devices) as Record<string, string>
            : null,
        hasSnapshot: !!row.hasSnapshot,
        viewportWidth: row.viewport_width,
        viewportHeight: row.viewport_height,
        sessionCount: Number(row.sessionCount || 0),
        eventCount: Number(row.eventCount || 0),
        lastVisitedAt: row.lastVisitedAt as string | null,
    }));
};

// ─── Session List ───────────��────────────────────────────────────────

export const getSessions = async (researchId: string, limit = 50, offset = 0) => {
    const result = await pool.query(
        `SELECT
            ts.id, ts.visitor_id, ts.page_url, ts.page_title,
            ts.viewport_width, ts.viewport_height, ts.user_agent, ts.referrer,
            ts.started_at, ts.ended_at,
            COUNT(te.id) as eventCount
         FROM tracking_sessions ts
         LEFT JOIN tracking_events te ON te.session_id = ts.id
         WHERE ts.research_id = ?
         GROUP BY ts.id
         ORDER BY ts.started_at DESC
         LIMIT ? OFFSET ?`,
        [researchId, limit, offset]
    );

    return result.rows.map((row: Record<string, unknown>) => ({
        id: row.id,
        visitorId: row.visitor_id,
        pageUrl: row.page_url,
        pageTitle: row.page_title,
        viewportWidth: row.viewport_width,
        viewportHeight: row.viewport_height,
        userAgent: row.user_agent,
        referrer: row.referrer,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        eventCount: Number(row.eventCount || 0),
    }));
};

// ─── Page Snapshot ──────────────────────────────────────────────────

export const savePageSnapshot = async (
    researchId: string,
    pageUrl: string,
    html: string
): Promise<void> => {
    // Only save if no snapshot exists yet for this page
    const existing = await pool.query(
        'SELECT id, page_snapshot FROM tracking_pages WHERE research_id = ? AND page_url = ?',
        [researchId, pageUrl]
    );
    if (existing.rows.length > 0 && !existing.rows[0].page_snapshot) {
        await pool.query(
            'UPDATE tracking_pages SET page_snapshot = ? WHERE research_id = ? AND page_url = ?',
            [html, researchId, pageUrl]
        );
    }
};

// ─── Friction Summary ───────────────────────────────────────────────

export const getFrictionSummary = async (researchId: string) => {
    const result = await pool.query(
        `SELECT
            te.metadata,
            COUNT(*) as cnt
         FROM tracking_events te
         JOIN tracking_sessions ts ON te.session_id = ts.id
         WHERE ts.research_id = ?
           AND te.metadata IS NOT NULL
           AND JSON_EXTRACT(te.metadata, '$.friction') IS NOT NULL
         GROUP BY JSON_EXTRACT(te.metadata, '$.friction')`,
        [researchId]
    );

    const tags: Record<string, number> = {};
    for (const row of result.rows as Array<Record<string, unknown>>) {
        try {
            const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
            if (meta?.friction) tags[meta.friction] = Number(row.cnt);
        } catch { /* skip */ }
    }

    return { tags };
};

export const getSessionFrictionTags = async (researchId: string) => {
    const result = await pool.query(
        `SELECT
            ts.id as session_id,
            GROUP_CONCAT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(te.metadata, '$.friction'))) as friction_tags
         FROM tracking_sessions ts
         JOIN tracking_events te ON te.session_id = ts.id
         WHERE ts.research_id = ?
           AND te.metadata IS NOT NULL
           AND JSON_EXTRACT(te.metadata, '$.friction') IS NOT NULL
         GROUP BY ts.id`,
        [researchId]
    );

    const sessionTags = new Map<string, string[]>();
    for (const row of result.rows as Array<Record<string, unknown>>) {
        const tags = (row.friction_tags as string || '').split(',').filter(Boolean);
        if (tags.length > 0) sessionTags.set(row.session_id as string, tags);
    }

    return { sessionTags: Object.fromEntries(sessionTags) };
};

export const getPageSnapshotHtml = async (researchId: string, pageUrl: string): Promise<string | null> => {
    const result = await pool.query(
        'SELECT page_snapshot FROM tracking_pages WHERE research_id = ? AND page_url = ?',
        [researchId, pageUrl]
    );
    return result.rows[0]?.page_snapshot || null;
};

// ─── Attention Heatmap (dwell time per zone) ────────────────────────

/**
 * Attention heatmap based on viewport time — how long each horizontal band
 * of the page was visible in the visitor's viewport.
 *
 * Uses scroll events (scrollY + timestamp) + session viewport_height to compute
 * which page bands were in-view and for how long across all sessions.
 * Result is a horizontal band map rendered as full-width heatmap rows.
 */
export const getAttentionHeatmapData = async (
    researchId: string,
    pageUrl?: string,
    device?: 'mobile' | 'tablet' | 'desktop'
): Promise<{ points: Array<{ x: number; y: number; dwell: number }>; totalSessions: number; maxDwell: number }> => {
    const deviceFilter = getDeviceFilter(device);

    // Get scroll events + pageview (initial position = scrollY 0) per session
    let query = `
        SELECT te.session_id, ts.viewport_height, ts.viewport_width,
            te.scroll_y, te.timestamp_ms,
            te.event_type
        FROM tracking_events te
        JOIN tracking_sessions ts ON te.session_id = ts.id
        WHERE ts.research_id = ?
          AND te.event_type IN ('scroll', 'pageview')
          AND ts.viewport_height > 0
          AND ts.viewport_width > 0
    `;
    const params: unknown[] = [researchId];
    if (pageUrl) { query += ' AND ts.page_url = ?'; params.push(pageUrl); }
    query += deviceFilter.clause;
    params.push(...deviceFilter.params);
    query += ' ORDER BY te.session_id, te.timestamp_ms ASC';

    const result = await pool.query(query, params);

    // Band size: 2% of page height (as percentage of viewport width for coordinate system)
    const BAND_PCT = 2;
    const dwellMap = new Map<number, number>(); // bandY → total ms across all sessions
    const sessions = new Set<string>();

    let prevSession = '';
    let prevTs = 0;
    let prevScrollY = 0;
    let prevVpH = 0;
    let prevVpW = 0;

    const flushInterval = (scrollY: number, vpH: number, vpW: number, duration: number) => {
        if (duration <= 0 || duration > 30000) return; // cap 30s per interval
        // scrollY is raw pixels from the snippet. Convert to % of viewport width.
        const topPct = (scrollY / vpW) * 100;
        const bottomPct = ((scrollY + vpH) / vpW) * 100;
        // Distribute time across visible bands
        const firstBand = Math.floor(topPct / BAND_PCT) * BAND_PCT;
        const lastBand = Math.floor(bottomPct / BAND_PCT) * BAND_PCT;
        for (let b = firstBand; b <= lastBand; b += BAND_PCT) {
            dwellMap.set(b, (dwellMap.get(b) || 0) + duration);
        }
    };

    for (const row of result.rows as Array<Record<string, unknown>>) {
        const sid = row.session_id as string;
        const vpH = Number(row.viewport_height);
        const vpW = Number(row.viewport_width);
        const scrollY = row.scroll_y != null ? Number(row.scroll_y) : 0;
        const ts = Number(row.timestamp_ms);
        sessions.add(sid);

        if (sid === prevSession && prevTs > 0) {
            // Flush the previous interval — time spent at prevScrollY position
            flushInterval(prevScrollY, prevVpH, prevVpW, ts - prevTs);
        }

        prevSession = sid;
        prevTs = ts;
        prevScrollY = scrollY;
        prevVpH = vpH;
        prevVpW = vpW;
    }

    // Convert bands to heatmap points — single center point per band
    // Frontend renders with large horizontal radius to create full-width bands
    let maxDwell = 0;
    const points: Array<{ x: number; y: number; dwell: number }> = [];
    for (const [bandY, dwell] of dwellMap.entries()) {
        if (dwell > maxDwell) maxDwell = dwell;
        points.push({ x: 50, y: bandY + BAND_PCT / 2, dwell });
    }

    return { points, totalSessions: sessions.size, maxDwell };
};

// ─── Visitor Journeys (page breakdown per visitor) ──────────────────

export const getVisitorJourneys = async (researchId: string, limit = 20, offset = 0) => {
    const visitorsResult = await pool.query(
        `SELECT visitor_id, COUNT(*) as sessionCount,
                MIN(started_at) as firstSeen, MAX(COALESCE(ended_at, started_at)) as lastSeen,
                MAX(viewport_width) as viewportWidth,
                SUBSTRING_INDEX(GROUP_CONCAT(user_agent ORDER BY started_at DESC), ',', 1) as userAgent,
                SUBSTRING_INDEX(GROUP_CONCAT(page_url ORDER BY started_at ASC), ',', 1) as entryPage
         FROM tracking_sessions
         WHERE research_id = ?
         GROUP BY visitor_id
         ORDER BY lastSeen DESC
         LIMIT ? OFFSET ?`,
        [researchId, limit, offset]
    );

    const visitors = [];
    for (const v of visitorsResult.rows as Array<Record<string, unknown>>) {
        const visitorId = v.visitor_id as string;

        const sessionsResult = await pool.query(
            `SELECT ts.id, ts.page_url, ts.page_title, ts.started_at, ts.ended_at,
                    COUNT(te.id) as eventCount,
                    SUM(CASE WHEN te.event_type = 'click' THEN 1 ELSE 0 END) as clickCount
             FROM tracking_sessions ts
             LEFT JOIN tracking_events te ON te.session_id = ts.id
             WHERE ts.research_id = ? AND ts.visitor_id = ?
             GROUP BY ts.id
             ORDER BY ts.started_at ASC`,
            [researchId, visitorId]
        );

        const MAX_SESSION_MS = 30 * 60 * 1000; // 30 min cap — idle tabs inflate duration
        const pages = sessionsResult.rows.map((s: Record<string, unknown>, idx: number) => {
            const startedAt = s.started_at as Date;
            const endedAt = s.ended_at as Date | null;
            const rawMs = endedAt ? endedAt.getTime() - startedAt.getTime() : 0;
            const durationMs = Math.min(rawMs, MAX_SESSION_MS);
            return {
                index: idx + 1,
                sessionId: s.id as string,
                pageUrl: s.page_url as string,
                pageTitle: s.page_title as string | null,
                startedAt: s.started_at,
                durationMs,
                eventCount: Number(s.eventCount || 0),
                clickCount: Number(s.clickCount || 0),
            };
        });

        visitors.push({
            visitorId,
            sessionCount: Number(v.sessionCount),
            entryPage: v.entryPage as string,
            firstSeen: v.firstSeen,
            lastSeen: v.lastSeen,
            viewportWidth: Number(v.viewportWidth || 0),
            userAgent: v.userAgent as string | null,
            totalDurationMs: pages.reduce((sum, p) => sum + p.durationMs, 0),
            pages,
        });
    }

    const totalResult = await pool.query(
        'SELECT COUNT(DISTINCT visitor_id) as total FROM tracking_sessions WHERE research_id = ?',
        [researchId]
    );

    return { visitors, totalVisitors: Number(totalResult.rows[0]?.total || 0) };
};

// ─── Live Sessions ──────────────────────────────────────────────────

export const getLiveSessions = async (researchId: string) => {
    const result = await pool.query(
        `SELECT ts.id, ts.visitor_id, ts.page_url, ts.page_title,
                ts.viewport_width, ts.user_agent,
                ts.started_at, COUNT(te.id) as eventCount,
                MAX(te.timestamp_ms) as lastEventMs
         FROM tracking_sessions ts
         LEFT JOIN tracking_events te ON te.session_id = ts.id
         WHERE ts.research_id = ?
         GROUP BY ts.id
         HAVING MAX(te.timestamp_ms) >= (UNIX_TIMESTAMP(NOW()) * 1000 - 300000)
            OR ts.started_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
         ORDER BY ts.started_at DESC`,
        [researchId]
    );

    const visitorMap = new Map<string, {
        visitorId: string;
        pages: Array<{ sessionId: string; pageUrl: string; pageTitle: string | null; startedAt: unknown; eventCount: number }>;
        viewportWidth: number;
        userAgent: string | null;
        firstSeen: unknown;
        lastEventMs: number;
    }>();

    for (const row of result.rows as Array<Record<string, unknown>>) {
        const vid = row.visitor_id as string;
        if (!visitorMap.has(vid)) {
            visitorMap.set(vid, {
                visitorId: vid,
                pages: [],
                viewportWidth: Number(row.viewport_width || 0),
                userAgent: row.user_agent as string | null,
                firstSeen: row.started_at,
                lastEventMs: Number(row.lastEventMs || 0),
            });
        }
        const visitor = visitorMap.get(vid)!;
        visitor.pages.push({
            sessionId: row.id as string,
            pageUrl: row.page_url as string,
            pageTitle: row.page_title as string | null,
            startedAt: row.started_at,
            eventCount: Number(row.eventCount || 0),
        });
        visitor.lastEventMs = Math.max(visitor.lastEventMs, Number(row.lastEventMs || 0));
    }

    return { sessions: [...visitorMap.values()] };
};

// ─── Save Page Screenshot ────────────────────────────────────────────

export const savePageScreenshot = async (
    researchId: string,
    pageUrl: string,
    screenshotS3Key: string
): Promise<void> => {
    await pool.query(
        `UPDATE tracking_pages SET screenshot_s3_key = ?, updated_at = NOW()
         WHERE research_id = ? AND page_url = ?`,
        [screenshotS3Key, researchId, pageUrl]
    );
};

/**
 * Save a base64-encoded screenshot image to the filesystem and update the page record.
 * Called by the public tracking snippet (client-side html2canvas capture).
 * Stores per-device category (mobile/tablet/desktop) in screenshot_devices JSON.
 */
export const savePageScreenshotFromBase64 = async (
    researchId: string,
    pageUrl: string,
    base64Data: string,
    deviceCategory: 'mobile' | 'tablet' | 'desktop' = 'desktop'
): Promise<string> => {
    // Strip data URI prefix if present
    const raw = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(raw, 'base64');

    // Validate it's a real JPEG/PNG (check magic bytes)
    const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
    if (!isJpeg && !isPng) {
        throw new Error('Invalid image data');
    }

    const ext = isPng ? 'png' : 'jpg';
    const fileName = `screenshot_${deviceCategory}_${Date.now()}.${ext}`;
    const relativePath = `research/${researchId}/tracking/${fileName}`;
    const fullPath = getMediaPath(relativePath);

    ensureDirectoryExists(fullPath);
    fs.writeFileSync(fullPath, buffer);

    // Update screenshot_devices JSON — merge with existing
    const existing = await pool.query(
        `SELECT screenshot_devices FROM tracking_pages WHERE research_id = ? AND page_url = ?`,
        [researchId, pageUrl]
    );
    const currentDevices = existing.rows[0]?.screenshot_devices
        ? (typeof existing.rows[0].screenshot_devices === 'string'
            ? JSON.parse(existing.rows[0].screenshot_devices)
            : existing.rows[0].screenshot_devices)
        : {};
    currentDevices[deviceCategory] = relativePath;

    await pool.query(
        `UPDATE tracking_pages SET screenshot_s3_key = ?, screenshot_devices = ?, updated_at = NOW()
         WHERE research_id = ? AND page_url = ?`,
        [relativePath, JSON.stringify(currentDevices), researchId, pageUrl]
    );

    return relativePath;
};

// ─── Analytics: Scroll Depth ─────────────────────────────────────────

export const getScrollDepthData = async (
    researchId: string,
    pageUrl?: string
): Promise<{ depths: Array<{ depthPct: number; sessions: number; percentage: number }>; totalSessions: number }> => {
    // Get max scroll depth per session, bucketed at 10% intervals
    let query = `
        SELECT
            FLOOR(te.scroll_depth_pct / 10) * 10 as depth_bucket,
            COUNT(DISTINCT te.session_id) as session_count
        FROM tracking_events te
        JOIN tracking_sessions ts ON te.session_id = ts.id
        WHERE ts.research_id = ?
          AND te.event_type = 'scroll'
          AND te.scroll_depth_pct IS NOT NULL
    `;
    const params: unknown[] = [researchId];
    if (pageUrl) {
        query += ' AND ts.page_url = ?';
        params.push(pageUrl);
    }
    query += ' GROUP BY depth_bucket ORDER BY depth_bucket ASC';

    const result = await pool.query(query, params);

    // Total sessions with scroll events
    let totalQuery = `
        SELECT COUNT(DISTINCT te.session_id) as total
        FROM tracking_events te
        JOIN tracking_sessions ts ON te.session_id = ts.id
        WHERE ts.research_id = ? AND te.event_type = 'scroll'
    `;
    const totalParams: unknown[] = [researchId];
    if (pageUrl) {
        totalQuery += ' AND ts.page_url = ?';
        totalParams.push(pageUrl);
    }
    const totalResult = await pool.query(totalQuery, totalParams);
    const totalSessions = Number(totalResult.rows[0]?.total || 0);

    // Build cumulative: sessions that reached at least X%
    const buckets = result.rows.map((row: Record<string, unknown>) => ({
        depthPct: Number(row.depth_bucket),
        sessionCount: Number(row.session_count),
    }));

    // Cumulative from top: everyone who scrolled at all reached 0%, fewer reached 100%
    const depths: Array<{ depthPct: number; sessions: number; percentage: number }> = [];
    for (let pct = 0; pct <= 100; pct += 10) {
        const sessionsAtOrBelow = buckets
            .filter((b) => b.depthPct >= pct)
            .reduce((sum, b) => sum + b.sessionCount, 0);
        depths.push({
            depthPct: pct,
            sessions: sessionsAtOrBelow,
            percentage: totalSessions > 0 ? Math.round((sessionsAtOrBelow / totalSessions) * 100) : 0,
        });
    }

    return { depths, totalSessions };
};

// ─── Analytics: Session Events (for replay) ─────────────────────────

export const getSessionEvents = async (sessionId: string) => {
    const session = await pool.query(
        `SELECT ts.*, tp.screenshot_s3_key
         FROM tracking_sessions ts
         LEFT JOIN tracking_pages tp ON tp.research_id = ts.research_id AND tp.page_url = ts.page_url
         WHERE ts.id = ?`,
        [sessionId]
    );
    if (session.rows.length === 0) {
        throw new Error('Session not found');
    }

    const events = await pool.query(
        `SELECT event_type, x, y, scroll_y, scroll_depth_pct, target_selector, target_text, timestamp_ms, metadata
         FROM tracking_events
         WHERE session_id = ?
         ORDER BY timestamp_ms ASC`,
        [sessionId]
    );

    const s = session.rows[0] as Record<string, unknown>;
    const vpW = Number(s.viewport_width) || 1;

    return {
        session: {
            id: s.id,
            visitorId: s.visitor_id,
            pageUrl: s.page_url,
            pageTitle: s.page_title,
            viewportWidth: s.viewport_width,
            viewportHeight: s.viewport_height,
            screenshotS3Key: s.screenshot_s3_key || null,
            startedAt: s.started_at,
            endedAt: s.ended_at,
        },
        events: events.rows.map((e: Record<string, unknown>) => ({
            eventType: e.event_type as string,
            // Normalize raw pixel coordinates to % of viewport width
            x: e.x != null ? Math.round(Number(e.x) / vpW * 10000) / 100 : null,
            y: e.y != null ? Math.round(Number(e.y) / vpW * 10000) / 100 : null,
            scrollY: e.scroll_y as number | null,
            scrollDepthPct: e.scroll_depth_pct as number | null,
            targetSelector: e.target_selector as string | null,
            targetText: e.target_text as string | null,
            timestampMs: Number(e.timestamp_ms),
            metadata: e.metadata as Record<string, unknown> | null,
        })),
    };
};

// ─── rrweb Event Storage ─────────────────────────────────────────────

/**
 * Append rrweb events to a session. Events are stored as a JSON array in
 * tracking_sessions.rrweb_events (LONGTEXT). Each call appends to the existing
 * array so the snippet can send incremental batches.
 */
export const appendRrwebEvents = async (
    sessionId: string,
    events: unknown[]
): Promise<{ saved: number }> => {
    if (events.length === 0) return { saved: 0 };

    // Validate session exists
    const session = await pool.query(
        'SELECT id, rrweb_events FROM tracking_sessions WHERE id = ?',
        [sessionId]
    );
    if (session.rows.length === 0) throw new Error('Session not found');

    // Merge with existing events
    let existing: unknown[] = [];
    const raw = session.rows[0].rrweb_events;
    if (raw) {
        try { existing = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { existing = []; }
    }

    const merged = [...existing, ...events];
    // Cap at ~10MB of JSON to prevent abuse
    const json = JSON.stringify(merged);
    if (json.length > 10_485_760) throw new Error('rrweb events too large');

    await pool.query(
        'UPDATE tracking_sessions SET rrweb_events = ?, ended_at = NOW() WHERE id = ?',
        [json, sessionId]
    );

    return { saved: events.length };
};

/**
 * Retrieve rrweb events for a session (for replay).
 */
export const getRrwebEvents = async (sessionId: string) => {
    const result = await pool.query(
        `SELECT ts.id, ts.visitor_id, ts.page_url, ts.page_title,
                ts.viewport_width, ts.viewport_height,
                ts.started_at, ts.ended_at, ts.rrweb_events
         FROM tracking_sessions ts
         WHERE ts.id = ?`,
        [sessionId]
    );
    if (result.rows.length === 0) throw new Error('Session not found');

    const s = result.rows[0] as Record<string, unknown>;
    let events: unknown[] = [];
    if (s.rrweb_events) {
        try { events = typeof s.rrweb_events === 'string' ? JSON.parse(s.rrweb_events as string) : s.rrweb_events as unknown[]; } catch { events = []; }
    }

    return {
        session: {
            id: s.id,
            visitorId: s.visitor_id,
            pageUrl: s.page_url,
            pageTitle: s.page_title,
            viewportWidth: s.viewport_width,
            viewportHeight: s.viewport_height,
            startedAt: s.started_at,
            endedAt: s.ended_at,
        },
        events,
    };
};

// ─── Analytics: Page Funnels ─────────────────────────────────────────

// ─── Custom Funnel Drop-off ──────────────────────────────────────────

export const computeFunnelDropoff = async (researchId: string, funnelId: string) => {
    // Load funnel definition from config
    const cfgResult = await pool.query(
        'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
        [researchId]
    );
    if (cfgResult.rows.length === 0) throw new Error('Research not found');

    let config: Record<string, unknown> = {};
    try {
        const raw = cfgResult.rows[0].config;
        config = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    } catch { config = {}; }

    const trackingCfg = (config.trackingConfig || {}) as Record<string, unknown>;
    const funnels = (trackingCfg.funnels || []) as FunnelDefinition[];
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) throw new Error('Funnel not found');
    if (funnel.steps.length === 0) return { funnel, steps: [], totalVisitors: 0 };

    // Get per-visitor page visit sequence (ordered by first visit)
    const result = await pool.query(
        `SELECT ts.visitor_id, ts.page_url, MIN(ts.started_at) as first_visit
         FROM tracking_sessions ts
         WHERE ts.research_id = ?
         GROUP BY ts.visitor_id, ts.page_url
         ORDER BY ts.visitor_id, first_visit ASC`,
        [researchId]
    );

    const visitorPaths = new Map<string, string[]>();
    for (const row of result.rows as Array<Record<string, unknown>>) {
        const vid = row.visitor_id as string;
        if (!visitorPaths.has(vid)) visitorPaths.set(vid, []);
        visitorPaths.get(vid)!.push(row.page_url as string);
    }

    // For each visitor, check how far they got through the funnel steps (in order)
    const stepCounts = new Array(funnel.steps.length).fill(0);

    for (const pages of visitorPaths.values()) {
        let stepIdx = 0;
        for (const pageUrl of pages) {
            if (stepIdx >= funnel.steps.length) break;
            if (pageUrl.includes(funnel.steps[stepIdx].url)) {
                stepCounts[stepIdx]++;
                stepIdx++;
            }
        }
    }

    const totalVisitors = visitorPaths.size;
    const steps = funnel.steps.map((step, i) => ({
        url: step.url,
        label: step.label,
        visitors: stepCounts[i],
        percentage: totalVisitors > 0 ? Math.round((stepCounts[i] / totalVisitors) * 100) : 0,
        dropoff: i === 0 ? 0 : (stepCounts[i - 1] > 0
            ? Math.round(((stepCounts[i - 1] - stepCounts[i]) / stepCounts[i - 1]) * 100)
            : 0),
    }));

    return {
        funnel: { id: funnel.id, name: funnel.name },
        steps,
        totalVisitors,
        conversionRate: totalVisitors > 0 && funnel.steps.length > 0
            ? Math.round((stepCounts[stepCounts.length - 1] / stepCounts[0]) * 100) || 0
            : 0,
    };
};

export const getPageFunnels = async (researchId: string) => {
    // Get page visit sequence per visitor (ordered by first visit timestamp)
    const result = await pool.query(
        `SELECT
            ts.visitor_id,
            ts.page_url,
            MIN(ts.started_at) as first_visit
         FROM tracking_sessions ts
         WHERE ts.research_id = ?
         GROUP BY ts.visitor_id, ts.page_url
         ORDER BY ts.visitor_id, first_visit ASC`,
        [researchId]
    );

    // Build per-visitor page sequences
    const visitorPaths = new Map<string, string[]>();
    for (const row of result.rows as Array<Record<string, unknown>>) {
        const vid = row.visitor_id as string;
        if (!visitorPaths.has(vid)) visitorPaths.set(vid, []);
        visitorPaths.get(vid)!.push(row.page_url as string);
    }

    // Count transitions: page A → page B
    const transitions = new Map<string, number>();
    const pageCounts = new Map<string, number>();

    for (const pages of visitorPaths.values()) {
        for (let i = 0; i < pages.length; i++) {
            pageCounts.set(pages[i], (pageCounts.get(pages[i]) || 0) + 1);
            if (i < pages.length - 1) {
                const key = `${pages[i]}|||${pages[i + 1]}`;
                transitions.set(key, (transitions.get(key) || 0) + 1);
            }
        }
    }

    // Top pages by visit count
    const topPages = [...pageCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([url, count]) => ({ pageUrl: url, visitors: count }));

    // Top transitions
    const topTransitions = [...transitions.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([key, count]) => {
            const [from, to] = key.split('|||');
            return { from, to, count };
        });

    return {
        totalVisitors: visitorPaths.size,
        topPages,
        transitions: topTransitions,
    };
};

// ─── Export: CSV Data ────────────────────────────────────────────────

export const getExportData = async (researchId: string) => {
    const sessions = await pool.query(
        `SELECT id, visitor_id, page_url, page_title, viewport_width, viewport_height,
                user_agent, referrer, started_at, ended_at
         FROM tracking_sessions WHERE research_id = ?
         ORDER BY started_at DESC`,
        [researchId]
    );

    const events = await pool.query(
        `SELECT te.session_id, te.event_type, te.x, te.y, te.scroll_y, te.scroll_depth_pct,
                te.target_selector, te.target_text, te.timestamp_ms
         FROM tracking_events te
         JOIN tracking_sessions ts ON te.session_id = ts.id
         WHERE ts.research_id = ?
         ORDER BY te.timestamp_ms ASC`,
        [researchId]
    );

    return {
        sessions: sessions.rows as Array<Record<string, unknown>>,
        events: events.rows as Array<Record<string, unknown>>,
    };
};

// ─── Save Page Screenshot ────────────────────────────────────────────

export const saveTrackingConfig = async (
    researchId: string,
    trackingConfig: Partial<TrackingConfig>
): Promise<void> => {
    const result = await pool.query(
        'SELECT config FROM researches WHERE id = ? AND deleted_at IS NULL',
        [researchId]
    );
    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }

    let config: Record<string, unknown> = {};
    try {
        const raw = result.rows[0].config;
        config = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    } catch {
        config = {};
    }

    config.trackingConfig = { ...(config.trackingConfig as Record<string, unknown> || {}), ...trackingConfig };

    await pool.query(
        'UPDATE researches SET config = ? WHERE id = ?',
        [JSON.stringify(config), researchId]
    );
};
