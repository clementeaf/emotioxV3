/**
 * Tests for TrackingEmotionsTab component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TrackingEmotionsTab } from '../TrackingEmotionsTab';

vi.mock('../../../../services/tracking.service', () => ({
    getTrackingEmotions: vi.fn(),
}));

import * as trackingService from '../../../../services/tracking.service';

const mockEmotionData = {
    totalSessions: 12,
    totalSamples: 3400,
    distribution: {
        neutral: 35,
        joy: 25,
        sadness: 10,
        anger: 5,
        surprise: 15,
        fear: 5,
        disgust: 5,
    },
    dominantEmotion: 'neutral' as const,
    avgConfidence: 0.72,
    timeline: [
        { timestampS: 0, emotion: 'neutral' as const, confidence: 0.8 },
        { timestampS: 1, emotion: 'joy' as const, confidence: 0.7 },
    ],
    perSession: [
        {
            sessionId: 's1',
            visitorId: 'v1',
            pageUrl: 'https://example.com/',
            dominantEmotion: 'joy' as const,
            sampleCount: 200,
            hasVideo: true,
        },
        {
            sessionId: 's2',
            visitorId: 'v2',
            pageUrl: 'https://example.com/pricing',
            dominantEmotion: 'neutral' as const,
            sampleCount: 150,
            hasVideo: false,
        },
    ],
    valenceArousal: [
        { timestampS: 0, valence: 0.3, arousal: 0.5 },
        { timestampS: 1, valence: 0.5, arousal: 0.4 },
    ],
};

const renderComponent = (props: { researchId: string; selectedPageUrl?: string }) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <TrackingEmotionsTab {...props} />
        </QueryClientProvider>
    );
};

describe('TrackingEmotionsTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state with pulse skeletons', () => {
        vi.mocked(trackingService.getTrackingEmotions).mockReturnValue(new Promise(() => {}));
        renderComponent({ researchId: 'r1' });
        const pulseElements = document.querySelectorAll('.animate-pulse');
        expect(pulseElements.length).toBeGreaterThanOrEqual(3);
    });

    it('shows empty state when no emotion data (totalSamples = 0)', async () => {
        vi.mocked(trackingService.getTrackingEmotions).mockResolvedValue({
            ...mockEmotionData,
            totalSamples: 0,
        });
        renderComponent({ researchId: 'r1' });

        await waitFor(() => {
            expect(screen.getByText('No emotion data collected yet')).toBeInTheDocument();
        });
    });

    it('renders emotion distribution bars for all 7 emotions', async () => {
        vi.mocked(trackingService.getTrackingEmotions).mockResolvedValue(mockEmotionData);
        renderComponent({ researchId: 'r1' });

        await waitFor(() => {
            expect(screen.getByText('Expression Distribution')).toBeInTheDocument();
        });

        // All 7 emotion labels should be in the distribution bars
        // Some labels may appear multiple times (distribution + session list)
        const emotionLabels = ['Neutral', 'Happy', 'Sad', 'Angry', 'Surprised', 'Scared', 'Disgusted'];
        for (const label of emotionLabels) {
            expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
        }
    });

    it('shows dominant emotion and confidence in summary cards', async () => {
        vi.mocked(trackingService.getTrackingEmotions).mockResolvedValue(mockEmotionData);
        renderComponent({ researchId: 'r1' });

        await waitFor(() => {
            // Dominant = Neutral
            expect(screen.getByText('Dominant')).toBeInTheDocument();
            // avgConfidence 0.72 = 72%
            expect(screen.getByText('72%')).toBeInTheDocument();
        });
    });

    it('renders circumplex canvas element', async () => {
        vi.mocked(trackingService.getTrackingEmotions).mockResolvedValue(mockEmotionData);
        renderComponent({ researchId: 'r1' });

        await waitFor(() => {
            expect(screen.getByText('Affect Space')).toBeInTheDocument();
        });

        const canvasElements = document.querySelectorAll('canvas');
        expect(canvasElements.length).toBeGreaterThanOrEqual(1);
    });

    it('shows session list with page URLs and sample counts', async () => {
        vi.mocked(trackingService.getTrackingEmotions).mockResolvedValue(mockEmotionData);
        renderComponent({ researchId: 'r1' });

        await waitFor(() => {
            expect(screen.getByText('Sessions with Emotions (2)')).toBeInTheDocument();
        });

        expect(screen.getByText('https://example.com/')).toBeInTheDocument();
        expect(screen.getByText('https://example.com/pricing')).toBeInTheDocument();
        expect(screen.getByText('200 samples')).toBeInTheDocument();
        expect(screen.getByText('150 samples')).toBeInTheDocument();
    });
});
