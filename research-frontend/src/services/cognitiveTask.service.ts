import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';

// Types for Cognitive Task responses
export interface CognitiveTaskResponse {
    id: string;
    research_id: string;
    participant_id: string;
    question_id: string;
    question_type: string;
    response_value: Record<string, unknown>;
    created_at: string;
}

export interface ProcessedQuestionData {
    questionId: string;
    questionType: string;
    questionText: string;
    totalResponses: number;
    data: Record<string, unknown>;
}

export interface CognitiveTaskAnalytics {
    responses: CognitiveTaskResponse[];
    processedData: ProcessedQuestionData[];
    totalParticipants: number;
    completionRate: number;
    totalResponses: number;
}

/**
 * Service for Cognitive Task responses and analytics
 */
class CognitiveTaskService {
    /**
     * Get Cognitive Task analytics for a research
     */
    async getAnalytics(researchId: string): Promise<CognitiveTaskAnalytics> {
        try {
            return await apiClient.get<CognitiveTaskAnalytics>(
                `/responses/research/${researchId}/cognitive-task/analytics`
            );
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch Cognitive Task analytics');
        }
    }

    /**
     * Get Cognitive Task responses for a research
     */
    async getResponses(researchId: string): Promise<CognitiveTaskResponse[]> {
        try {
            const data = await apiClient.get<{ responses: CognitiveTaskResponse[] }>(
                `/responses/research/${researchId}/cognitive-task`
            );
            return data.responses;
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch Cognitive Task responses');
        }
    }

    /**
     * Get processed data for a specific question
     */
    async getQuestionAnalytics(
        researchId: string,
        questionId: string
    ): Promise<ProcessedQuestionData> {
        try {
            return await apiClient.get<ProcessedQuestionData>(
                `/responses/research/${researchId}/cognitive-task/question/${questionId}`
            );
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch question analytics');
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

export const cognitiveTaskService = new CognitiveTaskService();
