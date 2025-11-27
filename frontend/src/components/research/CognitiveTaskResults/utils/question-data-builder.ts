/**
 * Utilidades para construir objetos questionData desde preguntas y datos procesados
 */

import type { ProcessedDataItem } from '../types/data-processing';
import type { ResearchConfigQuestionWithFiles } from '../types/data-processing';
import type { FinalQuestionData } from '../CognitiveTaskResults';
import type { RatingData } from '../components/RatingResults';
import type { ImageSelectionData } from '../components/ImageSelectionResults';
import { getViewType, getQuestionType } from './question-type-mapper';
import {
  transformSentimentData,
  transformChoiceData,
  transformLinearScaleData,
  transformRankingData,
  transformPreferenceTestData,
  transformNavigationFlowData
} from './data-transformers';

interface BuildQuestionDataParams {
  question: ResearchConfigQuestionWithFiles;
  processedDataForQuestion: ProcessedDataItem | undefined;
  researchConfig: { questions?: ResearchConfigQuestionWithFiles[] } | null;
  researchId: string | null;
}

/**
 * Construye el objeto questionData completo para una pregunta
 * @param params - Parámetros necesarios para construir los datos
 * @returns Objeto questionData con todos los datos transformados
 */
export function buildQuestionData({
  question,
  processedDataForQuestion,
  researchConfig,
  researchId
}: BuildQuestionDataParams): FinalQuestionData {
  const questionType = (question.type as string) || '';

  // Aplicar transformaciones de datos usando funciones helper
  const transformedSentimentData = transformSentimentData(processedDataForQuestion, question);
  const transformedChoiceData = transformChoiceData(processedDataForQuestion, question);
  const transformedLinearScaleData = transformLinearScaleData(processedDataForQuestion, question);
  const transformedRankingData = transformRankingData(processedDataForQuestion, question);
  const transformedPreferenceTestData = transformPreferenceTestData(
    processedDataForQuestion,
    question,
    researchConfig
  );
  const transformedNavigationFlowData = transformNavigationFlowData(
    processedDataForQuestion,
    question,
    researchConfig,
    researchId
  );

  return {
    key: `question-${question.id}`,
    questionId: question.id,
    questionType: getQuestionType(question.type),
    questionText: question.title || question.description || `Pregunta ${question.id}`,
    required: question.required || false,
    conditionalityDisabled: question.showConditionally || false,
    hasNewData: processedDataForQuestion ? (processedDataForQuestion.totalResponses || 0) > 0 : false,
    viewType: getViewType(question.type),
    sentimentData: transformedSentimentData,
    choiceData: transformedChoiceData,
    rankingData: transformedRankingData,
    linearScaleData: transformedLinearScaleData,
    ratingData: processedDataForQuestion?.ratingData as RatingData | undefined,
    preferenceTestData: transformedPreferenceTestData,
    imageSelectionData: processedDataForQuestion?.imageSelectionData as ImageSelectionData | undefined,
    navigationFlowData: transformedNavigationFlowData,
    initialActiveTab: 'sentiment' as const,
    themeImageSrc: ''
  };
}

