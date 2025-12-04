/**
 * Tipos estrictos para respuestas del participante
 */

/**
 * Identificador único de una respuesta
 * Formato: moduleId-componentId
 */
export type ResponseId = string;

/**
 * Valor de una respuesta (puede ser string, number, array, etc.)
 */
export type ResponseValue = string | number | boolean | string[] | number[] | null;

/**
 * Metadata opcional de una respuesta
 */
export interface ResponseMetadata {
  timestamp?: number;
  [key: string]: unknown;
}

/**
 * Estructura completa de una respuesta
 */
export interface Response {
  id: ResponseId;
  moduleId: string;
  componentId: string;
  value: ResponseValue;
  metadata?: ResponseMetadata;
}

/**
 * Mapa de respuestas indexado por ResponseId
 */
export type ResponsesMap = Map<ResponseId, Response>;

