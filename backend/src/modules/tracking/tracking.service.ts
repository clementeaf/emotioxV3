/**
 * Website Tracking Service
 * Handles session creation, event storage, and analytics aggregation.
 */

import { v4 as uuidv4 } from 'uuid';
import pool from '../../config/database';

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
    metadata?: Record<string, unknown>;
}

interface TrackingConfig {
    captureClicks: boolean;
    captureScroll: boolean;
    captureMousemove: boolean;
    consentRequired: boolean;
    flushIntervalMs: number;
    maxEventsPerFlush: number;
    allowedDomains: string[];
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
    const placeholders = capped.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
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
    ]);

    await pool.query(
        `INSERT INTO tracking_events
         (id, session_id, event_type, x, y, scroll_y, scroll_depth_pct, target_selector, target_text, timestamp_ms, metadata)
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
    const result = await pool.query(
        'SELECT config, status FROM researches WHERE id = ? AND deleted_at IS NULL',
        [researchId]
    );
    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }
    if (result.rows[0].status !== 'active') {
        throw new Error('Research is not active');
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
    };
};

// ─── Analytics: Click Heatmap Data ────────���──────────────────────────

export const getClickHeatmapData = async (
    researchId: string,
    pageUrl?: string
): Promise<{ clicks: Array<{ x: number; y: number; count: number }>; totalClicks: number; sessions: number }> => {
    let query = `
        SELECT te.x, te.y, COUNT(*) as count
        FROM tracking_events te
        JOIN tracking_sessions ts ON te.session_id = ts.id
        WHERE ts.research_id = ?
          AND te.event_type = 'click'
          AND te.x IS NOT NULL
          AND te.y IS NOT NULL
    `;
    const params: unknown[] = [researchId];

    if (pageUrl) {
        query += ' AND ts.page_url = ?';
        params.push(pageUrl);
    }

    query += ' GROUP BY te.x, te.y ORDER BY count DESC';

    const result = await pool.query(query, params);

    const clicks = result.rows.map((row: Record<string, unknown>) => ({
        x: row.x as number,
        y: row.y as number,
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

    const totals = await pool.query(totalsQuery, totalsParams);
    const totalClicks = Number(totals.rows[0]?.totalClicks || 0);
    const sessions = Number(totals.rows[0]?.sessions || 0);

    return { clicks, totalClicks, sessions };
};

// ─── Analytics: Overview Metrics ─────��───────────────────────────────

export const getOverviewMetrics = async (researchId: string) => {
    const result = await pool.query(
        `SELECT
            COUNT(DISTINCT ts.id) as totalSessions,
            COUNT(DISTINCT ts.visitor_id) as uniqueVisitors,
            COUNT(DISTINCT ts.page_url) as pagesTracked,
            COUNT(te.id) as totalEvents,
            AVG(TIMESTAMPDIFF(SECOND, ts.started_at, ts.ended_at)) as avgSessionDuration
         FROM tracking_sessions ts
         LEFT JOIN tracking_events te ON te.session_id = ts.id
         WHERE ts.research_id = ?`,
        [researchId]
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
            tp.id, tp.page_url, tp.page_title, tp.screenshot_s3_key,
            tp.viewport_width, tp.viewport_height,
            COUNT(DISTINCT ts.id) as sessionCount,
            COUNT(te.id) as eventCount
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
        viewportWidth: row.viewport_width,
        viewportHeight: row.viewport_height,
        sessionCount: Number(row.sessionCount || 0),
        eventCount: Number(row.eventCount || 0),
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

// ─── Save Tracking Config ────────��───────────────────────────────────

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
