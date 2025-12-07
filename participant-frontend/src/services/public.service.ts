/**
 * Public Service
 * Handles public API endpoints for participant-frontend
 * No authentication required
 */

import { configService } from './config.service';
import type { ModuleConfig } from '../types/module';

// Alias for consistency
type Module = ModuleConfig;

interface Stage {
    id: string;
    name: string;
    order: number;
    modules: Module[];
}

interface ResearchData {
    id: string;
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
    private baseUrl: string;

    constructor() {
        this.baseUrl = configService.getBaseUrl();
    }

    /**
     * Fetch public research data (no auth required)
     * @param researchId - Research ID
     * @returns Research data with stages and modules
     */
    async getResearch(researchId: string): Promise<ResearchData> {
        try {
            const endpoint = configService.getEndpoint('public', 'research', { id: researchId });
            const url = `${this.baseUrl}${endpoint}`;
            
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
        } catch (error) {
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
            const endpoint = configService.getEndpoint('public', 'submitResponse', { id: researchId });
            const url = `${this.baseUrl}${endpoint}`;
            
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
        } catch (error) {
            console.error('Error submitting response:', error);
            throw error;
        }
    }
}

export const publicService = new PublicService();

// Export types
export type { 
    ResearchData, 
    Stage, 
    Module, 
    SubmitResponseData,
    SubmitResponseResult 
};
