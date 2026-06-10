/**
 * Integration tests for WebsiteTrackingResults
 * Mocks tracking service API calls, verifies component renders correctly.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../../../contexts/ToastContext';
import { WebsiteTrackingResults } from '../WebsiteTrackingResults';

// Mock the tracking service
vi.mock('../../../../services/tracking.service', () => ({
    getOverview: vi.fn(),
    getTrackedPages: vi.fn(),
    getClickHeatmap: vi.fn(),
    getSessions: vi.fn(),
    getScrollDepth: vi.fn(),
    getFunnels: vi.fn(),
    getExportData: vi.fn(),
    savePageScreenshot: vi.fn(),
    getLiveSessions: vi.fn().mockResolvedValue([]),
    getVisitorJourneys: vi.fn().mockResolvedValue([]),
}));

// Mock media service
vi.mock('../../../../services/media.service', () => ({
    resolveMediaUrl: (url: string) => url,
    mediaService: { uploadFile: vi.fn() },
}));

// Mock research service (used by useResearch inside WebTrackingReportButton)
vi.mock('../../../../services/research.service', () => ({
    researchService: {
        getById: vi.fn().mockResolvedValue({
            research: { id: 'test-r1', name: 'Test Research', settings: {} },
        }),
        list: vi.fn().mockResolvedValue({ researches: [] }),
    },
}));

import * as trackingService from '../../../../services/tracking.service';

const mockOverview = {
    totalSessions: 25,
    uniqueVisitors: 15,
    pagesTracked: 3,
    totalEvents: 450,
    avgSessionDuration: 120,
};

const mockPages = [
    { id: 'p1', pageUrl: 'https://example.com/', pageTitle: 'Home', screenshotS3Key: null, screenshotDevices: null, viewportWidth: 1920, viewportHeight: 1080, sessionCount: 15, eventCount: 300, lastVisitedAt: '2026-04-29T10:00:00Z' },
    { id: 'p2', pageUrl: 'https://example.com/pricing', pageTitle: 'Pricing', screenshotS3Key: null, screenshotDevices: null, viewportWidth: 1920, viewportHeight: 1080, sessionCount: 10, eventCount: 150, lastVisitedAt: '2026-04-29T09:30:00Z' },
];

const mockHeatmap = {
    clicks: [
        { x: 500, y: 300, count: 10 },
        { x: 800, y: 600, count: 5 },
    ],
    totalClicks: 15,
    sessions: 5,
};

const renderComponent = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <MemoryRouter>
                    <WebsiteTrackingResults researchId="test-r1" />
                </MemoryRouter>
            </ToastProvider>
        </QueryClientProvider>
    );
};

describe('WebsiteTrackingResults', () => {
    beforeEach(() => {
        vi.mocked(trackingService.getOverview).mockResolvedValue(mockOverview);
        vi.mocked(trackingService.getTrackedPages).mockResolvedValue(mockPages);
        vi.mocked(trackingService.getClickHeatmap).mockResolvedValue(mockHeatmap);
        vi.mocked(trackingService.getSessions).mockResolvedValue([]);
        vi.mocked(trackingService.getVisitorJourneys).mockResolvedValue({ visitors: [], totalVisitors: 0 });
    });

    it('renders inline stats', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('25')).toBeInTheDocument();   // sessions
            expect(screen.getByText('15')).toBeInTheDocument();   // visitors
            expect(screen.getByText('3')).toBeInTheDocument();    // pages
            expect(screen.getByText('2m 0s')).toBeInTheDocument(); // avg duration
        });
    });

    it('renders result tabs', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Funnels')).toBeInTheDocument();
            expect(screen.getByText('Heatmaps')).toBeInTheDocument();
            expect(screen.getByText('Sessions')).toBeInTheDocument();
            expect(screen.getByText('Live')).toBeInTheDocument();
        });
    });

    it('shows empty state when no sessions', async () => {
        vi.mocked(trackingService.getOverview).mockResolvedValue({
            ...mockOverview, totalSessions: 0,
        });

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('No tracking data yet')).toBeInTheDocument();
        });
    });

    it('renders CSV export button', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('CSV')).toBeInTheDocument();
        });
    });

    it('switches to Sessions tab and renders visitor journey', async () => {
        const user = userEvent.setup();
        vi.mocked(trackingService.getVisitorJourneys).mockResolvedValue({
            visitors: [
                {
                    visitorId: 'v_abc123',
                    sessionCount: 1,
                    firstSeen: '2026-04-26T10:00:00Z',
                    lastSeen: '2026-04-26T10:02:00Z',
                    entryPage: 'https://example.com/',
                    viewportWidth: 1920,
                    userAgent: null,
                    totalDurationMs: 120000,
                    pages: [
                        {
                            index: 0,
                            sessionId: 's1',
                            pageUrl: 'https://example.com/',
                            pageTitle: 'Home',
                            startedAt: '2026-04-26T10:00:00Z',
                            durationMs: 120000,
                            eventCount: 42,
                            clickCount: 10,
                        },
                    ],
                },
            ],
            totalVisitors: 1,
        });

        renderComponent();

        await waitFor(() => expect(screen.getByText('Sessions')).toBeInTheDocument());
        await user.click(screen.getByText('Sessions'));

        // Visitor rendered with friendly name + "1 total" count
        await waitFor(() => {
            expect(screen.getByText('1 total')).toBeInTheDocument();
        });
    });
});
