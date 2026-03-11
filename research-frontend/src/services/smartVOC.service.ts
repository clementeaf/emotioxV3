import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';

// Types for SmartVOC responses
export interface SmartVOCResponse {
    id: string;
    research_id: string;
    participant_id: string;
    question_key: string;
    question_type: string;
    response_value: Record<string, unknown>;
    created_at: string;
}

export interface SmartVOCMetrics {
    cpvValue: number;
    satisfaction: number;
    retention: number;
    npsScore: number;
    promoters: number;
    neutrals: number;
    detractors: number;
    csatScores: number[];
    cesScores: number[];
    cvScores: number[];
    impact: string;
    trend: string;
}

export interface SmartVOCTimeSeriesData {
    date: string;
    nps: number;
    nev: number;
    csat: number;
    ces: number;
    cv: number;
    cpv: number;
    count: number;
}

export interface SmartVOCIntradayData {
    date: string;
    label: string;
    nps: number;
    nev: number;
    csat: number;
    ces: number;
    cv: number;
    cpv: number;
    count: number;
}

export interface SmartVOCAnalytics {
    responses: SmartVOCResponse[];
    metrics: SmartVOCMetrics;
    timeSeriesData: SmartVOCTimeSeriesData[];
    intradayTimeSeriesData: SmartVOCIntradayData[];
    vocResponses: Array<{ text: string; sentiment?: string }>;
    monthlyNPSData: Array<{
        month: string;
        promoters: number;
        neutrals: number;
        detractors: number;
        npsRatio: number;
        date?: string;
    }>;
    monthlyMetricsData: Array<{
        month: string;
        date: string;
        csatSatisfied: number;
        csatDissatisfied: number;
        cesPositive: number;
        cesNegative: number;
        cvPositive: number;
        cvNegative: number;
        cpv: number;
    }>;
    emotionalStates: Record<string, number>;
}

/**
 * Service for SmartVOC responses and analytics
 */
class SmartVOCService {
    /**
     * Get SmartVOC analytics for a research
     */
    async getAnalytics(researchId: string): Promise<SmartVOCAnalytics> {
        try {
            return await apiClient.get<SmartVOCAnalytics>(
                `/responses/research/${researchId}/smart-voc/analytics`
            );
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch SmartVOC analytics');
        }
    }

    /**
     * Get SmartVOC responses for a research
     */
    async getResponses(researchId: string): Promise<SmartVOCResponse[]> {
        try {
            const data = await apiClient.get<{ responses: SmartVOCResponse[] }>(
                `/responses/research/${researchId}/smart-voc`
            );
            return data.responses;
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch SmartVOC responses');
        }
    }

    private handleError(error: unknown, defaultMessage: string): Error {
        if (error instanceof Error) {
            return error;
        }

        if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as ApiErrorResponse;
            const message = axiosError.response?.data?.error || defaultMessage;
            return new Error(message);
        }

        return new Error(defaultMessage);
    }
}

export const smartVOCService = new SmartVOCService();
