/**
 * Hook helper para manejar respuestas de forma simple
 * Facilita el uso de respuestas en componentes
 */
import { useCallback } from 'react';
import { useParticipantStore } from '../stores/useParticipantStore';
import type { ResponseValue, ResponseMetadata } from '../types/responses';

interface UseResponseOptions {
  moduleId: string;
  componentId: string;
}

interface UseResponseReturn {
  value: ResponseValue;
  save: (value: ResponseValue, metadata?: ResponseMetadata) => void;
  update: (value: ResponseValue, metadata?: ResponseMetadata) => void;
  clear: () => void;
  exists: boolean;
}

/**
 * Hook para manejar una respuesta específica
 * @param options - Opciones con moduleId y componentId
 * @returns Objeto con value, save, update, clear y exists
 */
export function useResponse(options: UseResponseOptions): UseResponseReturn {
  const { moduleId, componentId } = options;
  const { getResponse, saveResponse, clearResponse } = useParticipantStore();

  const response = getResponse(moduleId, componentId);
  const value = response?.value ?? null;
  const exists = response !== null;

  const save = useCallback(
    (newValue: ResponseValue, metadata?: ResponseMetadata) => {
      saveResponse(moduleId, componentId, newValue, metadata);
    },
    [moduleId, componentId, saveResponse]
  );

  const update = useCallback(
    (newValue: ResponseValue, metadata?: ResponseMetadata) => {
      saveResponse(moduleId, componentId, newValue, metadata);
    },
    [moduleId, componentId, saveResponse]
  );

  const clear = useCallback(() => {
    clearResponse(moduleId, componentId);
  }, [moduleId, componentId, clearResponse]);

  return {
    value,
    save,
    update,
    clear,
    exists,
  };
}

