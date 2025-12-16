/**
 * Request deduplication utility
 * Prevents multiple identical API requests from being made simultaneously
 */

type PendingRequest<T> = Promise<T>;

class RequestDeduplicator {
    private pendingRequests = new Map<string, PendingRequest<unknown>>();

    /**
     * Wraps a request function to deduplicate concurrent calls
     */
    async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
        // Check if there's already a pending request for this key
        const pending = this.pendingRequests.get(key);
        if (pending) {
            console.log('[RequestDeduplicator] Using existing request for:', key);
            return pending as Promise<T>;
        }

        // Create new request
        console.log('[RequestDeduplicator] Creating new request for:', key);
        const promise = requestFn()
            .finally(() => {
                // Remove from pending once complete
                this.pendingRequests.delete(key);
            });

        // Store as pending
        this.pendingRequests.set(key, promise);

        return promise;
    }

    /**
     * Clear a specific key or all pending requests
     */
    clear(key?: string): void {
        if (key) {
            this.pendingRequests.delete(key);
        } else {
            this.pendingRequests.clear();
        }
    }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();
