/**
 * @vitest-environment jsdom
 *
 * Verifies NavigationFlow advances when clicking the container area (getClickableRect fallback
 * when no <img> is rendered: placeholder, loading, or mock). Without this fallback, clicks
 * would do nothing in Safari, Opera, Chrome, etc.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NavigationFlow } from './NavigationFlow';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}));

vi.mock('../../services/media.service', () => ({
    mediaService: {
        getMediaUrl: vi.fn().mockResolvedValue(''),
    },
}));

vi.mock('../../hooks/useResponse', () => ({
    useResponse: () => ({
        save: vi.fn(),
        value: null,
        update: vi.fn(),
        clear: vi.fn(),
        exists: false,
    }),
}));

describe('NavigationFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * Single image, no URL: placeholder is shown, no <img>. getClickableRect uses container.
     * Click inside container must advance and call onComplete after 800ms.
     */
    it('calls onComplete when clicking container (fallback rect, no img)', async () => {
        const onComplete = vi.fn();

        render(
            <NavigationFlow
                images={[{ id: '1', name: 'Only', hitZones: [] }]}
                onComplete={onComplete}
            />
        );

        await waitFor(() => {
            expect(screen.getAllByTestId('navigation-flow-click-area').length).toBeGreaterThan(0);
        });

        const area = screen.getAllByTestId('navigation-flow-click-area')[0];
        const rect: DOMRect = {
            left: 0, top: 0, width: 400, height: 300,
            right: 400, bottom: 300, x: 0, y: 0,
            toJSON: () => ({}),
        };
        area.getBoundingClientRect = () => rect;

        fireEvent.click(area, { clientX: 200, clientY: 150 });

        await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 2000 });
    });
});
