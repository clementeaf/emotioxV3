/**
 * Response Service
 * Handles participant response submission to backend
 */

import { configService } from './config.service';
import { useSessionStore } from '../stores/useSessionStore';

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

            // Turnstile temporarily disabled
            // TODO: Re-enable when TURNSTILE_SECRET_KEY is configured
            const TURNSTILE_ENABLED = false;
            
            // Get Turnstile token from session store (if available and enabled)
            let turnstileToken: string | undefined;
            if (TURNSTILE_ENABLED) {
                try {
                    const token = useSessionStore.getState().turnstileToken;
                    turnstileToken = token || undefined;
                } catch {
                    console.warn('[ResponseService] Could not get Turnstile token for submitResponse');
                }
            }

            const payload = {
                participantId,
                moduleId: response.moduleId,
                responses: [response],
                metadata: {
                    timestamp: Date.now(),
                    turnstileToken,
                    isPreviewMode: false,
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
                const errorText = await httpResponse.text();
                let errorMessage = `Failed to submit response: ${httpResponse.statusText}`;
                
                try {
                    const errorData = JSON.parse(errorText) as { message?: string; error?: string };
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch {
                    if (errorText) {
                        errorMessage = errorText;
                    }
                }
                
                if (errorMessage.includes('verification') || errorMessage.includes('Anti-bot') || errorMessage.includes('security') || errorMessage.includes('Turnstile')) {
                    const verificationError = new Error(errorMessage);
                    verificationError.name = 'TurnstileVerificationError';
                    throw verificationError;
                }
                
                throw new Error(errorMessage);
            }

            const result = await httpResponse.json() as SubmitResponseResult;
      // Removed excessive logging for production
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
                const errorText = await httpResponse.text();
                let errorMessage = `Failed to submit module responses: ${httpResponse.statusText}`;
                
                // Try to parse error message from response
                try {
                    const errorData = JSON.parse(errorText) as { message?: string; error?: string };
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch {
                    // If parsing fails, use the text as is
                    if (errorText) {
                        errorMessage = errorText;
                    }
                }
                
                // Check if error is related to Turnstile verification
                if (errorMessage.includes('verification') || errorMessage.includes('Anti-bot') || errorMessage.includes('security') || errorMessage.includes('Turnstile')) {
                    const verificationError = new Error(errorMessage);
                    verificationError.name = 'TurnstileVerificationError';
                    throw verificationError;
                }
                
                throw new Error(errorMessage);
            }

            const result = await httpResponse.json() as SubmitResponseResult;
      // Removed excessive logging for production
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

        // Turnstile temporarily disabled
        // TODO: Re-enable when TURNSTILE_SECRET_KEY is configured
        const TURNSTILE_ENABLED = false;
        
        // Get Turnstile token from session store (if available and enabled)
        let turnstileToken: string | undefined;
        if (TURNSTILE_ENABLED) {
            try {
                const token = useSessionStore.getState().turnstileToken;
                turnstileToken = token || undefined;
            } catch {
                // If store is not available, token will be undefined
                console.warn('[ResponseService] Could not get Turnstile token for flushModule');
            }
        }

        const payload: ModuleResponsePayload = {
            participantId,
            moduleId,
            responses: queue,
            metadata: {
                completedAt: Date.now(),
                turnstileToken,
                isPreviewMode: false,
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
