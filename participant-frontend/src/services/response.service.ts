/**
 * Response Service
 * Handles participant response submission to backend
 */

import { configService } from './config.service';

interface ResponseData {
    moduleId: string;
    componentId: string;
    value: unknown;
    metadata?: {
        timestamp?: number;
        duration?: number;
        interactions?: number;
        deviceInfo?: Record<string, unknown>;
        [key: string]: unknown;
    };
}

interface ModuleResponsePayload {
    participantId: string;
    moduleId: string;
    responses: ResponseData[];
    metadata?: {
        completedAt?: number;
        totalDuration?: number;
        [key: string]: unknown;
    };
}

interface SubmitResponseResult {
    success: boolean;
    message?: string;
    responseId?: string;
}

class ResponseService {
    private baseUrl: string;
    private pendingResponses: Map<string, ResponseData[]> = new Map();
    private submitQueue: Promise<void> = Promise.resolve();

    constructor() {
        this.baseUrl = configService.getBaseUrl();
    }

    /**
     * Submit a single response immediately
     * @param researchId - Research ID
     * @param participantId - Participant ID
     * @param response - Response data
     * @returns Submission result
     */
    async submitResponse(
        researchId: string,
        participantId: string,
        response: ResponseData
    ): Promise<SubmitResponseResult> {
        try {
            const endpoint = `/public/research/${researchId}/responses`;
            const url = `${this.baseUrl}${endpoint}`;

            const payload = {
                participantId,
                moduleId: response.moduleId,
                responses: [response],
                metadata: {
                    timestamp: Date.now(),
                },
            };

            const httpResponse = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!httpResponse.ok) {
                throw new Error(`Failed to submit response: ${httpResponse.statusText}`);
            }

            const result = await httpResponse.json() as SubmitResponseResult;
      console.log('Response submitted:', response.moduleId, response.componentId);
            return result;
    } catch (error: unknown) {
            console.error('Error submitting response:', error);
            throw error;
        }
    }

    /**
     * Submit module responses (all responses for a module)
     * @param researchId - Research ID
     * @param _participantId - Participant ID (included in payload, prefixed with _ to indicate unused)
     * @param payload - Module response payload
     * @returns Submission result
     */
    async submitModuleResponses(
        researchId: string,
        _participantId: string,
        payload: ModuleResponsePayload
    ): Promise<SubmitResponseResult> {
        try {
            const endpoint = `/public/research/${researchId}/responses`;
            const url = `${this.baseUrl}${endpoint}`;

            const httpResponse = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!httpResponse.ok) {
                throw new Error(`Failed to submit module responses: ${httpResponse.statusText}`);
            }

            const result = await httpResponse.json() as SubmitResponseResult;
      console.log('Module responses submitted:', payload.moduleId, `(${payload.responses.length} responses)`);
            return result;
    } catch (error: unknown) {
            console.error('Error submitting module responses:', error);
            throw error;
        }
    }

    /**
     * Queue response for batch submission
     * @param moduleId - Module ID
     * @param response - Response data
     */
    queueResponse(moduleId: string, response: ResponseData): void {
        const queue = this.pendingResponses.get(moduleId) || [];
        queue.push(response);
        this.pendingResponses.set(moduleId, queue);
    }

    /**
     * Flush queued responses for a module
     * @param researchId - Research ID
     * @param participantId - Participant ID
     * @param moduleId - Module ID
     * @returns Submission result
     */
    async flushModule(
        researchId: string,
        participantId: string,
        moduleId: string
    ): Promise<SubmitResponseResult | null> {
        const queue = this.pendingResponses.get(moduleId);
        if (!queue || queue.length === 0) {
            return null;
        }

        const payload: ModuleResponsePayload = {
            participantId,
            moduleId,
            responses: queue,
            metadata: {
                completedAt: Date.now(),
            },
        };

        // Clear queue before submission
        this.pendingResponses.delete(moduleId);

        // Submit with queue management
        this.submitQueue = this.submitQueue.then(async () => {
            await this.submitModuleResponses(researchId, participantId, payload);
        });

        await this.submitQueue;
        return { success: true, message: 'Module responses submitted' };
    }

    /**
     * Flush all pending responses
     * @param researchId - Research ID
     * @param participantId - Participant ID
     * @returns Array of submission results
     */
    async flushAll(researchId: string, participantId: string): Promise<SubmitResponseResult[]> {
        const results: SubmitResponseResult[] = [];

        for (const moduleId of this.pendingResponses.keys()) {
            const result = await this.flushModule(researchId, participantId, moduleId);
            if (result) {
                results.push(result);
            }
        }

        return results;
    }

    /**
     * Clear all pending responses
     */
    clearQueue(): void {
        this.pendingResponses.clear();
    }

    /**
     * Get pending response count
     */
    getPendingCount(): number {
        let count = 0;
        for (const queue of this.pendingResponses.values()) {
            count += queue.length;
        }
        return count;
    }
}

export const responseService = new ResponseService();

// Export types
export type { ResponseData, ModuleResponsePayload, SubmitResponseResult };
