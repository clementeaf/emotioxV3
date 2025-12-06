/**
 * Real-time Service
 * Provides near real-time updates for participant responses using intelligent polling
 * 
 * Note: This uses polling instead of WebSockets since the backend is serverless (AWS Lambda)
 * which doesn't support persistent connections. Polling interval is optimized for UX.
 */

import { responsesService, type Response } from './responses.service';

type ResponseCallback = (response: Response) => void;
type ErrorCallback = (error: Error) => void;

interface PollingOptions {
    interval?: number; // milliseconds, default 5000 (5 seconds)
    onResponse?: ResponseCallback;
    onError?: ErrorCallback;
}

class RealtimeService {
    private pollingIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
    private lastResponseTimestamps: Map<string, string> = new Map();
    private responseCallbacks: Map<string, ResponseCallback[]> = new Map();
    private errorCallbacks: Map<string, ErrorCallback[]> = new Map();

    /**
     * Start polling for responses in a research
     * @param researchId - Research ID to monitor
     * @param options - Polling configuration
     * @returns Cleanup function to stop polling
     */
    startPolling(researchId: string, options: PollingOptions = {}): () => void {
        const {
            interval = 5000, // Default: poll every 5 seconds
            onResponse,
            onError,
        } = options;

        // Register callbacks
        if (onResponse) {
            this.addResponseCallback(researchId, onResponse);
        }
        if (onError) {
            this.addErrorCallback(researchId, onError);
        }

        // Stop existing polling if any
        this.stopPolling(researchId);

        // Start polling
        const poll = async () => {
            try {
                const result = await responsesService.getByResearch(researchId);
                const responses = result.responses || [];

                // Get last known timestamp
                const lastTimestamp = this.lastResponseTimestamps.get(researchId);

                // Filter new responses
                const newResponses = lastTimestamp
                    ? responses.filter(r => new Date(r.created_at) > new Date(lastTimestamp))
                    : responses;

                // Update last timestamp
                if (responses.length > 0) {
                    const latestResponse = responses.reduce((latest, current) =>
                        new Date(current.created_at) > new Date(latest.created_at) ? current : latest
                    );
                    this.lastResponseTimestamps.set(researchId, latestResponse.created_at);
                }

                // Notify callbacks for each new response
                const callbacks = this.responseCallbacks.get(researchId) || [];
                newResponses.forEach(response => {
                    callbacks.forEach(callback => callback(response));
                });

            } catch (error) {
                const errorCallbacks = this.errorCallbacks.get(researchId) || [];
                const err = error instanceof Error ? error : new Error('Unknown polling error');
                errorCallbacks.forEach(callback => callback(err));
            }
        };

        // Initial poll
        poll();

        // Setup interval
        const intervalId = setInterval(poll, interval);
        this.pollingIntervals.set(researchId, intervalId);

        // Return cleanup function
        return () => this.stopPolling(researchId);
    }

    /**
     * Stop polling for a research
     * @param researchId - Research ID
     */
    stopPolling(researchId: string): void {
        const intervalId = this.pollingIntervals.get(researchId);
        if (intervalId) {
            clearInterval(intervalId);
            this.pollingIntervals.delete(researchId);
        }
        this.lastResponseTimestamps.delete(researchId);
        this.responseCallbacks.delete(researchId);
        this.errorCallbacks.delete(researchId);
    }

    /**
     * Stop all active polling
     */
    stopAll(): void {
        this.pollingIntervals.forEach((intervalId) => clearInterval(intervalId));
        this.pollingIntervals.clear();
        this.lastResponseTimestamps.clear();
        this.responseCallbacks.clear();
        this.errorCallbacks.clear();
    }

    /**
     * Add response callback for a research
     * @param researchId - Research ID
     * @param callback - Callback function
     */
    private addResponseCallback(researchId: string, callback: ResponseCallback): void {
        const callbacks = this.responseCallbacks.get(researchId) || [];
        callbacks.push(callback);
        this.responseCallbacks.set(researchId, callbacks);
    }

    /**
     * Add error callback for a research
     * @param researchId - Research ID
     * @param callback - Callback function
     */
    private addErrorCallback(researchId: string, callback: ErrorCallback): void {
        const callbacks = this.errorCallbacks.get(researchId) || [];
        callbacks.push(callback);
        this.errorCallbacks.set(researchId, callbacks);
    }

    /**
     * Check if polling is active for a research
     * @param researchId - Research ID
     * @returns true if polling is active
     */
    isPolling(researchId: string): boolean {
        return this.pollingIntervals.has(researchId);
    }

    /**
     * Get response count for a research
     * @param researchId - Research ID
     * @returns Promise with response count
     */
    async getResponseCount(researchId: string): Promise<number> {
        try {
            const result = await responsesService.getByResearch(researchId);
            return result.responses?.length || 0;
        } catch (error) {
            console.error('Failed to get response count:', error);
            return 0;
        }
    }
}

export const realtimeService = new RealtimeService();

// Export types
export type { PollingOptions, ResponseCallback, ErrorCallback };
