import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCopyToClipboard } from '../useCopyToClipboard';

const writeTextMock = vi.fn().mockResolvedValue(undefined);

describe('useCopyToClipboard', () => {
    beforeEach(() => {
        writeTextMock.mockClear();
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: writeTextMock },
            writable: true,
            configurable: true,
        });
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns [false, copy] initially', () => {
        const { result } = renderHook(() => useCopyToClipboard());

        expect(result.current[0]).toBe(false);
        expect(typeof result.current[1]).toBe('function');
    });

    it('sets copied to true after copy', async () => {
        const { result } = renderHook(() => useCopyToClipboard());

        await act(async () => {
            await result.current[1]('hello');
        });

        expect(result.current[0]).toBe(true);
        expect(writeTextMock).toHaveBeenCalledWith('hello');
    });

    it('resets copied after timeout', async () => {
        const { result } = renderHook(() => useCopyToClipboard(1000));

        await act(async () => {
            await result.current[1]('hello');
        });

        expect(result.current[0]).toBe(true);

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(result.current[0]).toBe(false);
    });
});
