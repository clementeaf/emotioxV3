import { useEffect, type RefObject } from 'react';

/**
 * Calls handler when a click occurs outside the referenced element.
 * Commonly used for closing dropdowns, menus, and popovers.
 */
export function useClickOutside<T extends HTMLElement>(
    ref: RefObject<T | null>,
    handler: () => void,
    enabled = true
): void {
    useEffect(() => {
        if (!enabled) return;

        const listener = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                handler();
            }
        };

        document.addEventListener('mousedown', listener);
        return () => document.removeEventListener('mousedown', listener);
    }, [ref, handler, enabled]);
}
