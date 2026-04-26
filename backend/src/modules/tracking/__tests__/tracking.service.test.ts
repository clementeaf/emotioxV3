/**
 * Unit tests for tracking.service.ts
 * Mocks the database pool to test business logic in isolation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database pool before importing the service
const mockQuery = vi.fn();
vi.mock('../../../config/database', () => ({
    default: { query: (...args: unknown[]) => mockQuery(...args) },
}));

// Mock uuid
vi.mock('uuid', () => ({
    v4: () => 'mock-uuid-1234',
}));

// Now import the service (uses mocked pool)
import {
    createSession,
    saveEvents,
    getTrackingConfig,
    getClickHeatmapData,
    getOverviewMetrics,
    getTrackedPages,
    getScrollDepthData,
    getSessionEvents,
    getPageFunnels,
    getExportData,
    savePageScreenshot,
    saveTrackingConfig,
} from '../tracking.service';

beforeEach(() => {
    mockQuery.mockReset();
});

// ─── createSession ───────────────────────────────────────────────────

describe('createSession', () => {
    it('creates session and returns sessionId', async () => {
        // Research exists and is active
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 'r1', status: 'active', config: '{}' }] })  // research check
            .mockResolvedValueOnce({ rows: [] })   // INSERT session
            .mockResolvedValueOnce({ rows: [] })   // SELECT tracking_pages
            .mockResolvedValueOnce({ rows: [] });  // INSERT tracking_pages

        const result = await createSession({
            researchId: 'r1',
            visitorId: 'v1',
            pageUrl: 'https://example.com',
            viewportWidth: 1920,
            viewportHeight: 1080,
        });

        expect(result.sessionId).toBe('mock-uuid-1234');
        expect(mockQuery).toHaveBeenCalledTimes(4);
    });

    it('throws when research not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await expect(createSession({
            researchId: 'bad-id',
            visitorId: 'v1',
            pageUrl: 'https://example.com',
            viewportWidth: 1920,
            viewportHeight: 1080,
        })).rejects.toThrow('Research not found');
    });

    it('throws when research not active', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 'r1', status: 'draft' }] });

        await expect(createSession({
            researchId: 'r1',
            visitorId: 'v1',
            pageUrl: 'https://example.com',
            viewportWidth: 1920,
            viewportHeight: 1080,
        })).rejects.toThrow('Research is not active');
    });
});

// ─── saveEvents ──────────────────────────────────────────────────────

describe('saveEvents', () => {
    it('batch inserts events and returns count', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 's1' }] })  // session exists
            .mockResolvedValueOnce({ rows: [] })               // INSERT events
            .mockResolvedValueOnce({ rows: [] });              // UPDATE ended_at

        const result = await saveEvents('s1', [
            { eventType: 'click', x: 100, y: 200, timestampMs: 1000 },
            { eventType: 'click', x: 300, y: 400, timestampMs: 2000 },
        ]);

        expect(result.saved).toBe(2);
    });

    it('returns 0 for empty events array', async () => {
        const result = await saveEvents('s1', []);
        expect(result.saved).toBe(0);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it('throws when session not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await expect(saveEvents('bad-session', [
            { eventType: 'click', x: 100, y: 200, timestampMs: 1000 },
        ])).rejects.toThrow('Session not found');
    });

    it('caps at 50 events per flush', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 's1' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        const manyEvents = Array.from({ length: 100 }, (_, i) => ({
            eventType: 'click' as const,
            x: i,
            y: i,
            timestampMs: 1000 + i,
        }));

        const result = await saveEvents('s1', manyEvents);
        expect(result.saved).toBe(50);
    });
});

// ─── getTrackingConfig ───────────────────────────────────────────────

describe('getTrackingConfig', () => {
    it('returns config with defaults', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{ config: JSON.stringify({ trackingConfig: { captureClicks: true } }), status: 'active' }],
        });

        const config = await getTrackingConfig('r1');

        expect(config.captureClicks).toBe(true);
        expect(config.captureScroll).toBe(false); // default
        expect(config.consentRequired).toBe(true); // default
        expect(config.flushIntervalMs).toBe(2000);
    });

    it('throws when research not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        await expect(getTrackingConfig('bad')).rejects.toThrow('Research not found');
    });

    it('throws when research not active', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ config: '{}', status: 'paused' }] });
        await expect(getTrackingConfig('r1')).rejects.toThrow('Research is not active');
    });
});

// ─── getClickHeatmapData ─────────────────────────────────────────────

describe('getClickHeatmapData', () => {
    it('returns aggregated clicks and totals', async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [
                    { x: 100, y: 200, count: 5 },
                    { x: 300, y: 400, count: 3 },
                ],
            })
            .mockResolvedValueOnce({
                rows: [{ totalClicks: 8, sessions: 2 }],
            });

        const result = await getClickHeatmapData('r1');

        expect(result.clicks).toHaveLength(2);
        expect(result.clicks[0]).toEqual({ x: 100, y: 200, count: 5 });
        expect(result.totalClicks).toBe(8);
        expect(result.sessions).toBe(2);
    });

    it('filters by pageUrl when provided', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ totalClicks: 0, sessions: 0 }] });

        await getClickHeatmapData('r1', 'https://example.com/page');

        // Second param of first call should include pageUrl
        expect(mockQuery.mock.calls[0][1]).toContain('https://example.com/page');
    });
});

// ─── getOverviewMetrics ──────────────────────────────────────────────

describe('getOverviewMetrics', () => {
    it('returns overview metrics', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{
                totalSessions: 10,
                uniqueVisitors: 5,
                pagesTracked: 3,
                totalEvents: 150,
                avgSessionDuration: 45.7,
            }],
        });

        const result = await getOverviewMetrics('r1');

        expect(result.totalSessions).toBe(10);
        expect(result.uniqueVisitors).toBe(5);
        expect(result.pagesTracked).toBe(3);
        expect(result.totalEvents).toBe(150);
        expect(result.avgSessionDuration).toBe(46); // rounded
    });
});

// ─── getScrollDepthData ──────────────────────────────────────────────

describe('getScrollDepthData', () => {
    it('returns cumulative scroll depth buckets', async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [
                    { depth_bucket: 0, session_count: 10 },
                    { depth_bucket: 50, session_count: 7 },
                    { depth_bucket: 100, session_count: 3 },
                ],
            })
            .mockResolvedValueOnce({ rows: [{ total: 10 }] });

        const result = await getScrollDepthData('r1');

        expect(result.totalSessions).toBe(10);
        expect(result.depths.length).toBe(11); // 0, 10, 20, ..., 100
        expect(result.depths[0].depthPct).toBe(0);
        // Bucket 0% sums all buckets >= 0: 10+7+3=20, percentage capped or calculated
        expect(result.depths[0].sessions).toBeGreaterThanOrEqual(10);
        // 100% bucket: only sessions at depth_bucket >= 100
        const last = result.depths[result.depths.length - 1];
        expect(last.depthPct).toBe(100);
        expect(last.sessions).toBe(3);
    });
});

// ─── getPageFunnels ──────────────────────────────────────────────────

describe('getPageFunnels', () => {
    it('returns top pages and transitions', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                { visitor_id: 'v1', page_url: '/home', first_visit: '2026-01-01' },
                { visitor_id: 'v1', page_url: '/pricing', first_visit: '2026-01-01' },
                { visitor_id: 'v2', page_url: '/home', first_visit: '2026-01-01' },
                { visitor_id: 'v2', page_url: '/about', first_visit: '2026-01-01' },
            ],
        });

        const result = await getPageFunnels('r1');

        expect(result.totalVisitors).toBe(2);
        expect(result.topPages.length).toBeGreaterThan(0);
        expect(result.topPages[0].pageUrl).toBe('/home'); // most visited
        expect(result.transitions.length).toBeGreaterThan(0);
    });
});

// ─── getExportData ───────────────────────────────────────────────────

describe('getExportData', () => {
    it('returns sessions and events arrays', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ id: 's1' }, { id: 's2' }] })
            .mockResolvedValueOnce({ rows: [{ session_id: 's1', event_type: 'click' }] });

        const result = await getExportData('r1');

        expect(result.sessions).toHaveLength(2);
        expect(result.events).toHaveLength(1);
    });
});

// ─── savePageScreenshot ──────────────────────────────────────────────

describe('savePageScreenshot', () => {
    it('updates tracking_pages with s3key', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await savePageScreenshot('r1', 'https://example.com', 'screenshots/r1/page.png');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE tracking_pages'),
            ['screenshots/r1/page.png', 'r1', 'https://example.com']
        );
    });
});

// ─── saveTrackingConfig ──────────────────────────────────────────────

describe('saveTrackingConfig', () => {
    it('merges new config into existing', async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [{ config: JSON.stringify({ trackingConfig: { captureClicks: true } }) }],
            })
            .mockResolvedValueOnce({ rows: [] });

        await saveTrackingConfig('r1', { captureScroll: true });

        const savedConfig = JSON.parse(mockQuery.mock.calls[1][1][0]);
        expect(savedConfig.trackingConfig.captureClicks).toBe(true);
        expect(savedConfig.trackingConfig.captureScroll).toBe(true);
    });

    it('throws when research not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        await expect(saveTrackingConfig('bad', {})).rejects.toThrow('Research not found');
    });
});
