import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';

export interface AnalysisModule {
    id: string;
    name: string;
    type: string;
    description?: string;
}

export interface AnalysisModulesResponse {
    modules: AnalysisModule[];
}

export interface AnalyzeQuestionData {
    module_type: string;
}

export interface AnalysisResult {
    question_id: string;
    module_type: string;
    analysis_data: Record<string, unknown>;
    created_at: string;
}

export interface AnalysisResponse {
    analysis: AnalysisResult;
}

/**
 * Servicio de análisis
 * Maneja todas las operaciones relacionadas con análisis de respuestas
 */
class AnalysisService {
    /**
     * Obtiene la lista de módulos de análisis disponibles
     * @returns Lista de módulos de análisis
     * @throws ApiErrorResponse si falla la petición
     */
    async getModules(): Promise<AnalysisModulesResponse> {
        try {
            return await apiClient.get<AnalysisModulesResponse>('/analysis/modules');
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to fetch analysis modules');
        }
    }

    /**
     * Analiza una pregunta con un módulo de análisis específico
     * @param questionId - ID de la pregunta
     * @param moduleType - Tipo de módulo de análisis
     * @returns Resultado del análisis
     * @throws ApiErrorResponse si falla el análisis
     */
    async analyzeQuestion(questionId: string, moduleType: string): Promise<AnalysisResponse> {
        try {
            return await apiClient.post<AnalysisResponse>(`/analysis/question/${questionId}`, {
                module_type: moduleType,
            });
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to analyze question');
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

export const analysisService = new AnalysisService();

