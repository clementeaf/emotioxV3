/**
 * Public Service
 * Handles public API endpoints for participant-frontend
 * No authentication required
 */

import { configService } from './config.service';
import type { ModuleConfig } from '../types/module';

// Alias for consistency
type Module = ModuleConfig & {
    config?: {
        backlinks?: {
            complete?: string;
            disqualified?: string;
            overquota?: string;
        };
        linkConfig?: {
            allowMobile?: boolean;
            trackLocation?: boolean;
            allowMultiple?: boolean;
        };
        participantLimit?: number;
    };
};

interface Stage {
    id: string;
    name: string;
    description: string;
    order_index: number;
    modules: Module[];
}

interface ResearchData {
    id: string;
    name: string;
    title: string;
    description: string;
    status: string;
    stages: Stage[];
    modules?: Module[]; // Legacy: backend may return modules directly
}

interface PublicResearchResponse {
    research: ResearchData;
}

interface SubmitResponseData {
    participantId: string;
    moduleId: string;
    responses: Record<string, unknown>;
}

interface SubmitResponseResult {
    success: boolean;
    message: string;
}

class PublicService {
    /**
     * Fetch public research data (no auth required)
     * @param researchId - Research ID
     * @returns Research data with stages and modules
     */
    async getResearch(researchId: string, preview?: boolean): Promise<ResearchData> {
        try {
            const baseUrl = configService.getBaseUrl();
            const endpoint = configService.getEndpoint('public', 'research', { id: researchId });
            const url = preview ? `${baseUrl}${endpoint}?preview=true` : `${baseUrl}${endpoint}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch research: ${response.statusText}`);
            }

            const data = await response.json() as PublicResearchResponse;
            return data.research;
        } catch (error: unknown) {
            console.error('Error fetching research:', error);
            throw error;
        }
    }

    /**
     * Submit participant response
     * @param researchId - Research ID
     * @param data - Response data
     * @returns Submission result
     */
    async submitResponse(researchId: string, data: SubmitResponseData): Promise<SubmitResponseResult> {
        try {
            const baseUrl = configService.getBaseUrl();
            const endpoint = configService.getEndpoint('public', 'submitResponse', { id: researchId });
            const url = `${baseUrl}${endpoint}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`Failed to submit response: ${response.statusText}`);
            }

            const result = await response.json() as SubmitResponseResult;
            return result;
        } catch (error: unknown) {
            console.error('Error submitting response:', error);
            throw error;
        }
    }

    /**
     * Validate participant demographics
     * @param researchId - Research ID
     * @param demographics - Demographic answers
     * @returns Validation result
     */
    async validateDemographics(researchId: string, demographics: Record<string, string>, participantId?: string): Promise<ValidationResult> {
        try {
            const baseUrl = configService.getBaseUrl();
            const endpoint = configService.getEndpoint('public', 'validateDemographics', { id: researchId });
            const url = `${baseUrl}${endpoint}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ demographics, participantId }),
            });

            if (!response.ok) {
                throw new Error(`Failed to validate demographics: ${response.statusText}`);
            }

            const data = await response.json() as { validation: ValidationResult };
            return data.validation;
        } catch (error: unknown) {
            console.error('Error validating demographics:', error);
            throw error;
        }
    }
    /**
     * Fetch participation mode for a research
     * @param researchId - Research ID
     * @returns Participation mode ('kiosk' or 'panel')
     */
    async getParticipationMode(researchId: string): Promise<ParticipationMode> {
        try {
            const baseUrl = configService.getBaseUrl();
            const endpoint = configService.getEndpoint('public', 'participationMode', { id: researchId });
            const url = `${baseUrl}${endpoint}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch participation mode: ${response.statusText}`);
            }

            const data = await response.json() as { mode: ParticipationMode };
            return data.mode;
        } catch (error: unknown) {
            console.error('Error fetching participation mode:', error);
            // Default to panel for retrocompatibility
            return 'panel';
        }
    }

    /**
     * Request a new kiosk session (generates incremental participantId)
     * @param researchId - Research ID
     * @returns Generated participantId (e.g., 'kiosk-1')
     */
    async requestKioskSession(researchId: string): Promise<string> {
        const baseUrl = configService.getBaseUrl();
        const endpoint = configService.getEndpoint('public', 'kioskSession', { id: researchId });
        const url = `${baseUrl}${endpoint}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`Failed to create kiosk session: ${response.statusText}`);
        }

        const data = await response.json() as { participantId: string };
        return data.participantId;
    }
    /**
     * Check if a participant has already responded
     */
    async getParticipantStatus(researchId: string, participantId: string): Promise<{ hasResponded: boolean }> {
        try {
            const baseUrl = configService.getBaseUrl();
            const url = `${baseUrl}/public/research/${researchId}/participant/${encodeURIComponent(participantId)}/status`;

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) return { hasResponded: false };

            const data = await response.json() as { hasResponded: boolean };
            return data;
        } catch {
            return { hasResponded: false };
        }
    }
}

export type ParticipationMode = 'kiosk' | 'panel';

export const publicService = new PublicService();

export interface ValidationResult {
    valid: boolean;
    reason?: 'QUOTA_FULL' | 'DISQUALIFIED';
    details?: string;
}

// Export types
export type {
    ResearchData,
    Stage,
    Module,
    SubmitResponseData,
    SubmitResponseResult
};
