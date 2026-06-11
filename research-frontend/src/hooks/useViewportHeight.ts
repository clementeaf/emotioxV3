import { useState, useEffect } from 'react';

const DEBOUNCE_MS = 300;
const MIN_DELTA = 20;
const FIXED_CHROME = 220;
const MIN_HEIGHT = 300;

/**
 * Tracks available viewport height for stimulus display.
 * Debounces resize events and ignores deltas smaller than MIN_DELTA
 * to prevent jitter during soft-keyboard toggles or scroll-bar flicker.
 */
export const useViewportHeight = (): number => {
    const compute = (): number => Math.max(MIN_HEIGHT, window.innerHeight - FIXED_CHROME);

    const [height, setHeight] = useState(compute);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;

        const handler = (): void => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                setHeight(prev => {
                    const next = compute();
                    return Math.abs(next - prev) >= MIN_DELTA ? next : prev;
                });
            }, DEBOUNCE_MS);
        };

        window.addEventListener('resize', handler);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', handler);
        };
    }, []);

    return height;
};
