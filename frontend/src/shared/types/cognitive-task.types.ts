// Tipos técnicos estándar para preguntas de Cognitive Task

export type CognitiveTaskType =
  | 'cognitive_short_text'
  | 'cognitive_long_text'
  | 'cognitive_multiple_choice'
  | 'cognitive_single_choice'
  | 'cognitive_linear_scale'
  | 'cognitive_ranking'
  | 'cognitive_image_selection';

// Interface base para una pregunta de Cognitive Task
export interface CognitiveTaskQuestion {
  id: string;
  type: CognitiveTaskType;
  title: string;
  description?: string;
  options?: string[];
  labels?: string[];
  images?: string[];
  config?: Record<string, unknown>;
  [key: string]: unknown;
}
