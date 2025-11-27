/**
 * Utilidades para construir preguntas desde la configuración
 */

import type { ResearchConfigQuestionWithFiles } from '../types/data-processing';
import type { ResearchConfig, FinalQuestionData } from '../CognitiveTaskResults';
import { getViewType, getSimplifiedQuestionType } from './question-type-mapper';
import { DEFAULT_COGNITIVE_QUESTIONS } from './default-questions';

/**
 * Crea preguntas desde la configuración de investigación
 * @param researchConfig - Configuración de la investigación
 * @returns Array de preguntas formateadas
 */
export function createQuestionsFromConfig(
  researchConfig: { questions?: ResearchConfigQuestionWithFiles[] } | null
): FinalQuestionData[] {
  const config = (researchConfig as unknown) as ResearchConfig | null;

  if (!config?.questions || config.questions.length === 0) {
    return DEFAULT_COGNITIVE_QUESTIONS;
  }

  return config.questions.map((question: ResearchConfigQuestionWithFiles): FinalQuestionData => {
    return {
      key: `question-${question.id}`,
      questionId: question.id,
      questionType: getSimplifiedQuestionType(question.type),
      questionText: question.title || question.description || `Pregunta ${question.id}`,
      required: question.required || false,
      conditionalityDisabled: question.showConditionally || false,
      hasNewData: false,
      viewType: getViewType(question.type),
      sentimentData: undefined,
      choiceData: undefined,
      rankingData: undefined,
      linearScaleData: undefined,
      ratingData: undefined,
      preferenceTestData: undefined,
      imageSelectionData: undefined,
      navigationFlowData: undefined,
      initialActiveTab: 'sentiment',
      themeImageSrc: ''
    };
  });
}

