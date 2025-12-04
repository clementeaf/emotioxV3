/**
 * Interfaces específicas para CognitiveRenderers
 */

export interface ImageFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  [key: string]: unknown;
}

export interface ScaleConfig {
  startValue?: number;
  endValue?: number;
  startLabel?: string;
  endLabel?: string;
}

export interface CognitiveContentConfiguration {
  title?: string;
  description?: string;
  files?: ImageFile[];
  choices?: Array<{
    id: string;
    text: string;
    label: string;
    value: string;
  }>;
  scaleConfig?: ScaleConfig;
  answerPlaceholder?: string;
}

export interface CognitiveRendererArgs {
  contentConfiguration?: CognitiveContentConfiguration;
  currentQuestionKey: string;
  formData?: Record<string, unknown>;
}
