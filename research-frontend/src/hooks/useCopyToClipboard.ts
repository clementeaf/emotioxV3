import { useState, useCallback } from 'react';

/**
 * Hook for copying text to clipboard with visual feedback state.
 * Returns [copied, copy] — `copied` resets after `resetMs` (default 2000ms).
 */
export function useCopyToClipboard(resetMs = 2000): [boolean, (text: string) => Promise<void>] {
    const [copied, setCopied] = useState(false);

    const copy = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), resetMs);
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), resetMs);
        }
    }, [resetMs]);

    return [copied, copy];
}
