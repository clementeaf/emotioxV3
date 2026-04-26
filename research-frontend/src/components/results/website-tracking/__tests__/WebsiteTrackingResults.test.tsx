/**
 * Integration tests for WebsiteTrackingResults
 * Mocks tracking service API calls, verifies component renders correctly.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
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
}));

// Mock media service
vi.mock('../../../../services/media.service', () => ({
    resolveMediaUrl: (url: string) => url,
    mediaService: { uploadFile: vi.fn() },
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
    { id: 'p1', pageUrl: 'https://example.com/', pageTitle: 'Home', screenshotS3Key: null, viewportWidth: 1920, viewportHeight: 1080, sessionCount: 15, eventCount: 300 },
    { id: 'p2', pageUrl: 'https://example.com/pricing', pageTitle: 'Pricing', screenshotS3Key: null, viewportWidth: 1920, viewportHeight: 1080, sessionCount: 10, eventCount: 150 },
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
            <MemoryRouter>
                <WebsiteTrackingResults researchId="test-r1" />
            </MemoryRouter>
        </QueryClientProvider>
    );
};

describe('WebsiteTrackingResults', () => {
    beforeEach(() => {
        vi.mocked(trackingService.getOverview).mockResolvedValue(mockOverview);
        vi.mocked(trackingService.getTrackedPages).mockResolvedValue(mockPages);
        vi.mocked(trackingService.getClickHeatmap).mockResolvedValue(mockHeatmap);
        vi.mocked(trackingService.getSessions).mockResolvedValue([]);
    });

    it('renders overview metric cards', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('25')).toBeInTheDocument();      // totalSessions
            expect(screen.getByText('15')).toBeInTheDocument();      // uniqueVisitors
            expect(screen.getByText('3')).toBeInTheDocument();       // pagesTracked
            expect(screen.getByText('450')).toBeInTheDocument();     // totalEvents
            expect(screen.getByText('2m 0s')).toBeInTheDocument();   // avgSessionDuration
        });
    });

    it('renders page tabs', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Home')).toBeInTheDocument();
            expect(screen.getByText('Pricing')).toBeInTheDocument();
        });
    });

    it('renders result tabs', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Click Heatmap')).toBeInTheDocument();
            expect(screen.getByText('Scroll Depth')).toBeInTheDocument();
            expect(screen.getByText('Sessions')).toBeInTheDocument();
            expect(screen.getByText('Funnels')).toBeInTheDocument();
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

    it('shows upload button when no screenshot', async () => {
        renderComponent();

        await waitFor(() => {
            // Heatmap has data but no screenshot → shows upload button
            expect(screen.getByText(/clicks recorded/)).toBeInTheDocument();
            expect(screen.getByText('Upload Screenshot')).toBeInTheDocument();
        });
    });

    it('renders click count from heatmap', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText(/15 clicks recorded/)).toBeInTheDocument();
        });
    });

    it('switches to Sessions tab', async () => {
        const user = userEvent.setup();
        vi.mocked(trackingService.getSessions).mockResolvedValue([
            {
                id: 's1', visitorId: 'v_abc123', pageUrl: 'https://example.com/',
                pageTitle: 'Home', viewportWidth: 1920, viewportHeight: 1080,
                userAgent: null, referrer: null,
                startedAt: '2026-04-26T10:00:00Z', endedAt: '2026-04-26T10:02:00Z',
                eventCount: 42,
            },
        ]);

        renderComponent();

        await waitFor(() => expect(screen.getByText('Sessions')).toBeInTheDocument());
        await user.click(screen.getByText('Sessions'));

        await waitFor(() => {
            expect(screen.getByText('v_abc123')).toBeInTheDocument();
            expect(screen.getByText('42')).toBeInTheDocument();
        });
    });

    it('renders Export CSV button', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Export CSV')).toBeInTheDocument();
        });
    });
});
