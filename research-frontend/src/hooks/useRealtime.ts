/**
 * useRealtime Hook
 * React hook for real-time participant response updates
 * 
 * Usage:
 * ```tsx
 * const { responseCount, isPolling } = useRealtime(researchId, {
 *   onNewResponse: (response) => {
 *     console.log('New response:', response);
 *     toast.success('Nueva respuesta recibida!');
 *   }
 * });
 * ```
 */

import { useEffect, useState, useCallback } from 'react';
import { realtimeService, type PollingOptions } from '../services/realtime.service';
import type { Response } from '../services/responses.service';

interface UseRealtimeOptions {
    enabled?: boolean; // Whether to start polling automatically (default: true)
    interval?: number; // Polling interval in ms (default: 5000)
    onNewResponse?: (response: Response) => void;
    onError?: (error: Error) => void;
}

interface UseRealtimeReturn {
    responseCount: number;
    isPolling: boolean;
    startPolling: () => void;
    stopPolling: () => void;
    refresh: () => Promise<void>;
}

export function useRealtime(
    researchId: string | undefined,
    options: UseRealtimeOptions = {}
): UseRealtimeReturn {
    const {
        enabled = true,
        interval = 5000,
        onNewResponse,
        onError,
    } = options;

    const [responseCount, setResponseCount] = useState(0);
    const [isPolling, setIsPolling] = useState(false);

    // Refresh response count
    const refresh = useCallback(async () => {
        if (!researchId) return;
        const count = await realtimeService.getResponseCount(researchId);
        setResponseCount(count);
    }, [researchId]);

    // Start polling
    const startPolling = useCallback(() => {
        if (!researchId) return;

        const pollingOptions: PollingOptions = {
            interval,
            onResponse: (response) => {
                // Increment count
                setResponseCount(prev => prev + 1);
                // Call user callback
                onNewResponse?.(response);
            },
            onError: (error) => {
                console.error('Polling error:', error);
                onError?.(error);
            },
        };

        realtimeService.startPolling(researchId, pollingOptions);
        setIsPolling(true);
    }, [researchId, interval, onNewResponse, onError]);

    // Stop polling
    const stopPolling = useCallback(() => {
        if (!researchId) return;
        realtimeService.stopPolling(researchId);
        setIsPolling(false);
    }, [researchId]);

    // Auto-start polling on mount if enabled
    useEffect(() => {
        if (!researchId || !enabled) return;

        // Initial count fetch
        refresh();

        // Start polling
        startPolling();

        // Cleanup on unmount
        return () => {
            stopPolling();
        };
    }, [researchId, enabled, refresh, startPolling, stopPolling]);

    return {
        responseCount,
        isPolling,
        startPolling,
        stopPolling,
        refresh,
    };
}

// Export types
export type { UseRealtimeOptions, UseRealtimeReturn };
