// Tipos técnicos estándar para preguntas de SmartVOC

export type SmartVOCType =
  | 'smartvoc_voc'
  | 'smartvoc_csat'
  | 'smartvoc_ces'
  | 'smartvoc_cv'
  | 'smartvoc_nps'
  | 'smartvoc_nev';

// Interface base para una pregunta de SmartVOC
export interface SmartVOCQuestion {
  id: string;
  type: SmartVOCType;
  title: string;
  description?: string;
  config?: Record<string, unknown>;
  labels?: string[];
  images?: string[];
  [key: string]: unknown;
}
