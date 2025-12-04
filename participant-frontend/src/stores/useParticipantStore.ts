/**
 * Store unificado para el participante
 * Maneja respuestas, navegación y persistencia de forma simple y clara
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Response, ResponseId, ResponseValue, ResponseMetadata, ResponsesMap } from '../types/responses';

interface ParticipantState {
  // Navegación
  currentStep: string;

  // Respuestas
  responses: ResponsesMap;

  // Actions - Navegación
  setCurrentStep: (step: string) => void;

  // Actions - Respuestas
  saveResponse: (moduleId: string, componentId: string, value: ResponseValue, metadata?: ResponseMetadata) => void;
  getResponse: (moduleId: string, componentId: string) => Response | null;
  getResponsesByModule: (moduleId: string) => Response[];
  updateResponse: (moduleId: string, componentId: string, value: ResponseValue, metadata?: ResponseMetadata) => void;
  clearResponse: (moduleId: string, componentId: string) => void;
  clearAllResponses: () => void;
}

/**
 * Genera un ID único para una respuesta
 * @param moduleId - ID del módulo
 * @param componentId - ID del componente
 * @returns ID único de la respuesta
 */
export const createResponseId = (moduleId: string, componentId: string): ResponseId => {
  return `${moduleId}_${componentId}`;
};

/**
 * Convierte ResponsesMap a objeto para persistencia
 * @param map - Mapa de respuestas
 * @returns Array de respuestas
 */
function mapToArray(map: ResponsesMap): Response[] {
  return Array.from(map.values());
}

/**
 * Convierte array de respuestas a ResponsesMap
 * @param responses - Array de respuestas
 * @returns Mapa de respuestas
 */
function arrayToMap(responses: Response[]): ResponsesMap {
  const map = new Map<ResponseId, Response>();
  responses.forEach((response) => {
    map.set(response.id, response);
  });
  return map;
}

export const useParticipantStore = create<ParticipantState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      currentStep: 'welcome',
      responses: new Map<ResponseId, Response>(),

      /**
       * Establece el step actual
       * @param step - ID del step
       */
      setCurrentStep: (step: string) => {
        set({ currentStep: step });
      },

      /**
       * Guarda una respuesta
       * Si ya existe, la actualiza
       * @param moduleId - ID del módulo
       * @param componentId - ID del componente
       * @param value - Valor de la respuesta
       * @param metadata - Metadata opcional
       */
      saveResponse: (moduleId: string, componentId: string, value: ResponseValue, metadata?: ResponseMetadata) => {
        const responseId = createResponseId(moduleId, componentId);
        const { responses } = get();
        const existingResponse = responses.get(responseId);

        const newResponse: Response = {
          id: responseId,
          moduleId,
          componentId,
          value,
          metadata: {
            ...existingResponse?.metadata,
            ...metadata,
            timestamp: Date.now(),
          },
        };

        const newResponses = new Map(responses);
        newResponses.set(responseId, newResponse);

        set({ responses: newResponses });
      },

      /**
       * Obtiene una respuesta específica
       * @param moduleId - ID del módulo
       * @param componentId - ID del componente
       * @returns Respuesta o null si no existe
       */
      getResponse: (moduleId: string, componentId: string): Response | null => {
        const { responses } = get();
        const responseId = createResponseId(moduleId, componentId);
        return responses.get(responseId) || null;
      },

      /**
       * Obtiene todas las respuestas de un módulo
       * @param moduleId - ID del módulo
       * @returns Array de respuestas del módulo
       */
      getResponsesByModule: (moduleId: string): Response[] => {
        const { responses } = get();
        return Array.from(responses.values()).filter((response) => response.moduleId === moduleId);
      },

      /**
       * Actualiza una respuesta existente
       * Si no existe, la crea
       * @param moduleId - ID del módulo
       * @param componentId - ID del componente
       * @param value - Nuevo valor
       * @param metadata - Metadata opcional
       */
      updateResponse: (moduleId: string, componentId: string, value: ResponseValue, metadata?: ResponseMetadata) => {
        get().saveResponse(moduleId, componentId, value, metadata);
      },

      /**
       * Elimina una respuesta específica
       * @param moduleId - ID del módulo
       * @param componentId - ID del componente
       */
      clearResponse: (moduleId: string, componentId: string) => {
        const { responses } = get();
        const responseId = createResponseId(moduleId, componentId);
        const newResponses = new Map(responses);
        newResponses.delete(responseId);
        set({ responses: newResponses });
      },

      /**
       * Elimina todas las respuestas
       */
      clearAllResponses: () => {
        set({ responses: new Map<ResponseId, Response>() });
      },
    }),
    {
      name: 'participant-store',
      partialize: (state) => ({
        currentStep: state.currentStep,
        responses: mapToArray(state.responses),
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as { currentStep?: string; responses?: Response[] };
        return {
          ...currentState,
          currentStep: persisted.currentStep ?? currentState.currentStep,
          responses: persisted.responses ? arrayToMap(persisted.responses) : currentState.responses,
        };
      },
    }
  )
);

