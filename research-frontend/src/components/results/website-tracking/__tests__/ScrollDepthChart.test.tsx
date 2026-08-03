/**
 * Tests for ScrollDepthChart component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScrollDepthChart } from '../ScrollDepthChart';

vi.mock('../../../../services/tracking.service', () => ({
    getScrollDepth: vi.fn(),
}));

import * as trackingService from '../../../../services/tracking.service';

const renderComponent = (props: { researchId: string; pageUrl?: string }) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <ScrollDepthChart {...props} />
        </QueryClientProvider>
    );
};

describe('ScrollDepthChart', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading skeleton while fetching', () => {
        vi.mocked(trackingService.getScrollDepth).mockReturnValue(new Promise(() => {}));
        renderComponent({ researchId: 'r1' });
        expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows empty state when no data (totalSessions = 0)', async () => {
        vi.mocked(trackingService.getScrollDepth).mockResolvedValue({
            depths: [],
            totalSessions: 0,
        });
        renderComponent({ researchId: 'r1' });

        await waitFor(() => {
            expect(screen.getByText(/No scroll data yet/)).toBeInTheDocument();
        });
    });

    it('renders depth bars with correct percentages', async () => {
        vi.mocked(trackingService.getScrollDepth).mockResolvedValue({
            depths: [
                { depthPct: 25, sessions: 80, percentage: 80 },
                { depthPct: 50, sessions: 60, percentage: 60 },
                { depthPct: 75, sessions: 30, percentage: 30 },
                { depthPct: 100, sessions: 10, percentage: 10 },
            ],
            totalSessions: 100,
        });
        renderComponent({ researchId: 'r1' });

        await waitFor(() => {
            expect(screen.getByText('25%')).toBeInTheDocument();
            expect(screen.getByText('50%')).toBeInTheDocument();
            expect(screen.getByText('75%')).toBeInTheDocument();
            expect(screen.getByText('100%')).toBeInTheDocument();
        });

        // Check percentage labels inside bars
        expect(screen.getByText('80% (80 visitors)')).toBeInTheDocument();
        expect(screen.getByText('60% (60 visitors)')).toBeInTheDocument();
    });

    it('shows session count in header', async () => {
        vi.mocked(trackingService.getScrollDepth).mockResolvedValue({
            depths: [{ depthPct: 25, sessions: 50, percentage: 50 }],
            totalSessions: 50,
        });
        renderComponent({ researchId: 'r1' });

        await waitFor(() => {
            expect(screen.getByText('50 sessions with scroll data')).toBeInTheDocument();
        });
    });

    it('applies green color for shallow depth and red for deep depth', async () => {
        vi.mocked(trackingService.getScrollDepth).mockResolvedValue({
            depths: [
                { depthPct: 10, sessions: 90, percentage: 90 },
                { depthPct: 90, sessions: 20, percentage: 20 },
            ],
            totalSessions: 100,
        });
        renderComponent({ researchId: 'r1' });

        await waitFor(() => {
            expect(screen.getByText('10%')).toBeInTheDocument();
        });

        // Find the bar elements by their style attributes
        const bars = document.querySelectorAll('[style*="background"]');
        const barStyles = Array.from(bars).map(b => (b as HTMLElement).style.background);
        // 10% depth should get green (#22c55e), 90% depth should get red (#ef4444)
        expect(barStyles.some(s => s.includes('rgb(34, 197, 94)'))).toBe(true);
        expect(barStyles.some(s => s.includes('rgb(239, 68, 68)'))).toBe(true);
    });
});
