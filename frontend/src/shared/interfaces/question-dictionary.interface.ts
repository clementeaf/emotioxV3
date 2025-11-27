// Diccionario global de preguntas para EmotioXV2

export type QuestionModule = 'smartvoc' | 'cognitive_task' | 'demographic' | 'eye_tracking' | 'custom' | string;

export interface QuestionDictionaryEntry {
  /**
   * Clave única global para la pregunta (ej: "smartvoc:VOC:uuid")
   */
  questionKey: string;
  /**
   * ID único de la pregunta (UUID o string)
   */
  id: string;
  /**
   * Módulo de origen (smartvoc, cognitive_task, etc.)
   */
  module: QuestionModule;
  /**
   * Tipo de pregunta (VOC, CSAT, SHORT_TEXT, etc.)
   */
  type: string;
  /**
   * Título visible de la pregunta
   */
  title: string;
  /**
   * Descripción o instrucciones
   */
  description?: string;
  /**
   * Placeholder para la respuesta (si aplica)
   */
  placeholder?: string;
  /**
   * Labels para opciones, escalas, etc.
   */
  labels?: string[];
  /**
   * Rutas de imágenes asociadas (si aplica)
   */
  images?: string[];
  /**
   * Configuración de hitzones (si aplica)
   */
  hitzones?: unknown;
  /**
   * Configuración extra específica del tipo de pregunta
   */
  config?: Record<string, unknown>;
  /**
   * Nombre del componente React a renderizar
   */
  renderComponent: string;
  /**
   * Extensible para otros props específicos
   */
  [key: string]: unknown;
}

/**
 * Diccionario global: clave = questionKey, valor = metadata de la pregunta
 */
export type QuestionDictionary = Record<string, QuestionDictionaryEntry>;
