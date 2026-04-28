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
    requestOrigin?: string;
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
    consentText: string;
    consentAcceptLabel: string;
    consentDeclineLabel: string;
    consentPosition: 'bottom' | 'top';
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

        const domainAllowed = allowedDomains.some(
            (d) => hostname === d || hostname.endsWith(`.${d}`)
        );
        if (!domainAllowed) {
            throw new Error('Domain not allowed');
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
    };
};

// ─── Analytics: Click Heatmap Data ────────���──────────────────────────

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

    // Coordinates are stored as viewport-relative percentages from the snippet.
    // Round to 1 decimal to cluster nearby clicks for a cleaner heatmap.
    let query = `
        SELECT ROUND(te.x, 1) as x, ROUND(te.y, 1) as y, COUNT(*) as count
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
    query += deviceFilter.clause;
    params.push(...deviceFilter.params);

    query += ' GROUP BY ROUND(te.x, 1), ROUND(te.y, 1) ORDER BY count DESC';

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
    totalsQuery += deviceFilter.clause;
    totalsParams.push(...deviceFilter.params);

    const totals = await pool.query(totalsQuery, totalsParams);
    const totalClicks = Number(totals.rows[0]?.totalClicks || 0);
    const sessions = Number(totals.rows[0]?.sessions || 0);

    return { clicks, totalClicks, sessions };
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
            eventType: e.event_type,
            x: e.x,
            y: e.y,
            scrollY: e.scroll_y,
            scrollDepthPct: e.scroll_depth_pct,
            targetSelector: e.target_selector,
            targetText: e.target_text,
            timestampMs: Number(e.timestamp_ms),
            metadata: e.metadata,
        })),
    };
};

// ─── Analytics: Page Funnels ─────────────────────────────────────────

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
