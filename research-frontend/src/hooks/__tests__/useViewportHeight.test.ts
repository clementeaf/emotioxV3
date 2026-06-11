import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useViewportHeight } from '../useViewportHeight';

describe('useViewportHeight', () => {
    const original = window.innerHeight;

    beforeEach(() => {
        vi.useFakeTimers();
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 900 });
    });

    afterEach(() => {
        vi.useRealTimers();
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: original });
    });

    it('returns initial computed height', () => {
        const { result } = renderHook(() => useViewportHeight());
        // 900 - 220 (FIXED_CHROME) = 680
        expect(result.current).toBe(680);
    });

    it('updates after resize event with debounce', () => {
        const { result } = renderHook(() => useViewportHeight());
        expect(result.current).toBe(680);

        act(() => {
            Object.defineProperty(window, 'innerHeight', { value: 1100 });
            window.dispatchEvent(new Event('resize'));
        });

        // Before debounce fires — still old value
        expect(result.current).toBe(680);

        act(() => { vi.advanceTimersByTime(300); });

        // 1100 - 220 = 880, delta = 200 > 20 threshold
        expect(result.current).toBe(880);
    });

    it('ignores resize when delta < 20px', () => {
        const { result } = renderHook(() => useViewportHeight());
        expect(result.current).toBe(680);

        act(() => {
            Object.defineProperty(window, 'innerHeight', { value: 910 }); // delta = 10
            window.dispatchEvent(new Event('resize'));
            vi.advanceTimersByTime(300);
        });

        expect(result.current).toBe(680);
    });

    it('enforces minimum height of 300', () => {
        Object.defineProperty(window, 'innerHeight', { value: 400 });
        const { result } = renderHook(() => useViewportHeight());
        // 400 - 220 = 180, clamped to 300
        expect(result.current).toBe(300);
    });

    it('cleans up listener on unmount', () => {
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        const { unmount } = renderHook(() => useViewportHeight());

        unmount();

        expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
        removeSpy.mockRestore();
    });
});
