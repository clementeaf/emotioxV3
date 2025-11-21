import apiClient from './api/client';
import type { ApiErrorResponse } from './api/types';

export interface Question {
    id: string;
    module_id: string;
    question_text: string;
    question_type: string;
    order: number;
    required: boolean;
    options?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface CreateQuestionData {
    module_id: string;
    question_text: string;
    question_type: string;
    order?: number;
    required?: boolean;
    options?: Record<string, unknown>;
}

export interface UpdateQuestionData {
    question_text?: string;
    question_type?: string;
    order?: number;
    required?: boolean;
    options?: Record<string, unknown>;
}

export interface ReorderQuestionsData {
    questions: string[];
}

export interface QuestionResponse {
    question: Question;
}

export interface DeleteResponse {
    message: string;
}

/**
 * Servicio de preguntas
 * Maneja todas las operaciones relacionadas con preguntas
 */
class QuestionsService {
    /**
     * Crea una nueva pregunta
     * @param data - Datos de la pregunta
     * @returns Pregunta creada
     * @throws ApiErrorResponse si falla la creación
     */
    async create(data: CreateQuestionData): Promise<QuestionResponse> {
        try {
            return await apiClient.post<QuestionResponse>('/questions', data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to create question');
        }
    }

    /**
     * Actualiza una pregunta
     * @param id - ID de la pregunta
     * @param data - Datos a actualizar
     * @returns Pregunta actualizada
     * @throws ApiErrorResponse si falla la actualización
     */
    async update(id: string, data: UpdateQuestionData): Promise<QuestionResponse> {
        try {
            return await apiClient.put<QuestionResponse>(`/questions/${id}`, data);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to update question');
        }
    }

    /**
     * Reordena las preguntas de un módulo
     * @param moduleId - ID del módulo
     * @param questions - Lista de IDs de preguntas en el nuevo orden
     * @returns Resultado de la operación
     * @throws ApiErrorResponse si falla la operación
     */
    async reorder(moduleId: string, questions: string[]): Promise<{ message: string }> {
        try {
            return await apiClient.post<{ message: string }>(`/questions/${moduleId}/reorder`, { questions });
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to reorder questions');
        }
    }

    /**
     * Elimina una pregunta
     * @param id - ID de la pregunta
     * @returns Mensaje de confirmación
     * @throws ApiErrorResponse si falla la eliminación
     */
    async delete(id: string): Promise<DeleteResponse> {
        try {
            return await apiClient.delete<DeleteResponse>(`/questions/${id}`);
        } catch (error: unknown) {
            throw this.handleError(error, 'Failed to delete question');
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

export const questionsService = new QuestionsService();

