/**
 * Website Tracking Service
 * API client for tracking configuration and analytics endpoints.
 */

import apiClient from './api/client';

// ─── Types ───────────────────────────────────────────────────────────

export interface TrackingConfig {
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

export interface TrackingOverview {
    totalSessions: number;
    uniqueVisitors: number;
    pagesTracked: number;
    totalEvents: number;
    avgSessionDuration: number;
}

export interface TrackedPage {
    id: string;
    pageUrl: string;
    pageTitle: string | null;
    screenshotS3Key: string | null;
    viewportWidth: number | null;
    viewportHeight: number | null;
    sessionCount: number;
    eventCount: number;
}

export interface ClickHeatmapData {
    clicks: Array<{ x: number; y: number; count: number }>;
    totalClicks: number;
    sessions: number;
}

export interface TrackingSession {
    id: string;
    visitorId: string;
    pageUrl: string;
    pageTitle: string | null;
    viewportWidth: number;
    viewportHeight: number;
    userAgent: string | null;
    referrer: string | null;
    startedAt: string;
    endedAt: string | null;
    eventCount: number;
}

// ─── API Calls ───────────────────────────────────────────────────────

export const getOverview = async (researchId: string): Promise<TrackingOverview> => {
    return apiClient.get<TrackingOverview>(`/tracking/${researchId}/overview`);
};

export const getTrackedPages = async (researchId: string): Promise<TrackedPage[]> => {
    const response = await apiClient.get<{ pages: TrackedPage[] }>(`/tracking/${researchId}/pages`);
    return response.pages;
};

export const getClickHeatmap = async (
    researchId: string,
    pageUrl?: string,
    device?: 'mobile' | 'tablet' | 'desktop'
): Promise<ClickHeatmapData> => {
    const params: Record<string, string> = {};
    if (pageUrl) params.page = pageUrl;
    if (device) params.device = device;
    return apiClient.get<ClickHeatmapData>(`/tracking/${researchId}/heatmap`, { params });
};

export const getSessions = async (
    researchId: string,
    limit = 50,
    offset = 0
): Promise<TrackingSession[]> => {
    const response = await apiClient.get<{ sessions: TrackingSession[] }>(`/tracking/${researchId}/sessions`, {
        params: { limit, offset },
    });
    return response.sessions;
};

export const verifyInstallation = async (
    researchId: string,
    sinceSeconds = 120
): Promise<{ count: number; hasData: boolean }> => {
    return apiClient.get<{ count: number; hasData: boolean }>(`/tracking/${researchId}/verify`, {
        params: { since: sinceSeconds },
    });
};

export const getEmbedSnippet = async (researchId: string): Promise<string> => {
    const response = await apiClient.get<{ snippet: string }>(`/tracking/${researchId}/snippet`);
    return response.snippet;
};

export const updateConfig = async (
    researchId: string,
    config: Partial<TrackingConfig>
): Promise<void> => {
    await apiClient.put(`/tracking/${researchId}/config`, config);
};

export const savePageScreenshot = async (
    researchId: string,
    pageUrl: string,
    screenshotS3Key: string
): Promise<void> => {
    await apiClient.post(`/tracking/${researchId}/pages/screenshot`, {
        pageUrl,
        screenshotS3Key,
    });
};

// ─── Scroll Depth ────────────────────────────────────────────────────

export interface ScrollDepthData {
    depths: Array<{ depthPct: number; sessions: number; percentage: number }>;
    totalSessions: number;
}

export const getScrollDepth = async (researchId: string, pageUrl?: string): Promise<ScrollDepthData> => {
    const params = pageUrl ? { page: pageUrl } : {};
    return apiClient.get<ScrollDepthData>(`/tracking/${researchId}/scroll`, { params });
};

// ─── Session Replay ──────────────────────────────────────────────────

export interface SessionReplayEvent {
    eventType: string;
    x: number | null;
    y: number | null;
    scrollY: number | null;
    scrollDepthPct: number | null;
    targetSelector: string | null;
    targetText: string | null;
    timestampMs: number;
    metadata: Record<string, unknown> | null;
}

export interface SessionReplayData {
    session: {
        id: string;
        visitorId: string;
        pageUrl: string;
        pageTitle: string | null;
        viewportWidth: number;
        viewportHeight: number;
        screenshotS3Key: string | null;
        startedAt: string;
        endedAt: string | null;
    };
    events: SessionReplayEvent[];
}

export const getSessionReplay = async (researchId: string, sessionId: string): Promise<SessionReplayData> => {
    return apiClient.get<SessionReplayData>(`/tracking/${researchId}/sessions/${sessionId}/events`);
};

// ─── Funnels ─────────────────────────────────────────────────────────

export interface FunnelData {
    totalVisitors: number;
    topPages: Array<{ pageUrl: string; visitors: number }>;
    transitions: Array<{ from: string; to: string; count: number }>;
}

export const getFunnels = async (researchId: string): Promise<FunnelData> => {
    return apiClient.get<FunnelData>(`/tracking/${researchId}/funnels`);
};

// ─── Export ──────────────────────────────────────────────────────────

export interface ExportData {
    sessions: Array<Record<string, unknown>>;
    events: Array<Record<string, unknown>>;
}

export const getExportData = async (researchId: string): Promise<ExportData> => {
    return apiClient.get<ExportData>(`/tracking/${researchId}/export`);
};
