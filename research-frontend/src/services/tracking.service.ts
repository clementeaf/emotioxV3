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

export const getClickHeatmap = async (researchId: string, pageUrl?: string): Promise<ClickHeatmapData> => {
    const params = pageUrl ? { page: pageUrl } : {};
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
