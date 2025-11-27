

import { apiClient, moduleResponsesAPI } from '../api/config';
import {
  CreateModuleResponseDto,
  ParticipantResponsesDocument,
  UpdateModuleResponseDto
} from '../shared/interfaces/module-response.interface';

interface QuestionResponse {
  participantId: string;
  value: any;
  timestamp: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

interface QuestionWithResponses {
  questionKey: string;
  responses: QuestionResponse[];
}

interface GroupedResponsesResponse {
  data: QuestionWithResponses[];
  status: number;
}

export class ModuleResponseService {
  constructor() {
    // Ya no necesitamos inicializar apiClient aquí, usamos la instancia global
  }

  /**
   * Obtener respuestas de un participante específico
   */
  async getResponsesForParticipant(
    researchId: string,
    participantId: string
  ): Promise<ParticipantResponsesDocument | null> {
    try {
      const response = await moduleResponsesAPI.getResponsesForParticipant(researchId, participantId);
      return response?.data || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener todas las respuestas de un research
   */
  async getResponsesByResearch(researchId: string): Promise<ParticipantResponsesDocument[]> {
    try {
      const response = await moduleResponsesAPI.getResponsesByResearch(researchId);
      return response?.data || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener respuestas agrupadas por pregunta para análisis estadísticos
   * Esta estructura es más eficiente para análisis de múltiples participantes
   */
  async getResponsesGroupedByQuestion(researchId: string): Promise<GroupedResponsesResponse> {
    try {
      const response = await moduleResponsesAPI.getResponsesGroupedByQuestion(researchId);

      // Si no hay respuesta o es null, devolver respuesta vacía
      if (!response) {
        return {
          data: [],
          status: 404
        };
      }

      // Validar que la respuesta tenga el formato esperado
      if (!response.data || !Array.isArray(response.data)) {
        return {
          data: [],
          status: 200
        };
      }

      return {
        data: response.data,
        status: response.status || 200
      };
    } catch (error) {

      // Si el error incluye "not found", "404", o cualquier error de red, devolver respuesta vacía
      if (error instanceof Error && (
        error.message.includes('not found') ||
        error.message.includes('404') ||
        error.message.includes('No se pudo obtener') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('fetch') ||
        error.message.includes('Unknown error') ||
        error.message.includes('200') ||
        error.message.includes('Requested resource not found') ||
        error.message.includes('DATABASE_ERROR')
      )) {
        return {
          data: [],
          status: 200  // Cambiar a 200 porque es un comportamiento esperado para research nuevos
        };
      }

      // Para cualquier otro error, también devolver datos vacíos en lugar de fallar
      return {
        data: [],
        status: 500
      };
    }
  }

  /**
   * Guardar una nueva respuesta
   */
  async saveResponse(data: CreateModuleResponseDto): Promise<ParticipantResponsesDocument> {
    try {
      const response = await moduleResponsesAPI.saveResponse(data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar una respuesta existente
   */
  async updateResponse(id: string, data: UpdateModuleResponseDto): Promise<ParticipantResponsesDocument> {
    try {
      const response = await moduleResponsesAPI.updateResponse(id, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Marcar respuestas como completadas
   */
  async markAsCompleted(researchId: string, participantId: string): Promise<ParticipantResponsesDocument | null> {
    try {
      // Este endpoint no está definido en moduleResponsesAPI, usar apiClient directamente
      const response = await apiClient.post('moduleResponses', 'saveResponse', {
        researchId,
        participantId,
        completed: true
      });
      return response?.data || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar todas las respuestas de un participante
   */
  async deleteAllResponses(researchId: string, participantId: string): Promise<void> {
    try {
      await moduleResponsesAPI.deleteAllResponses(researchId, participantId);
    } catch (error) {
      throw error;
    }
  }
}

// Instancia singleton del servicio
export const moduleResponseService = new ModuleResponseService();
