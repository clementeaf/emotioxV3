/**
 * Transformadores de datos para diferentes tipos de preguntas cognitivas
 */

import type { CognitiveTaskQuestion } from '../types';
import type { ChoiceQuestionData } from '../components/ChoiceResults';
import type { RankingQuestionData } from '../components/RankingResults';
import type { LinearScaleData } from '../components/LinearScaleResults';
import type { PreferenceTestData } from '../components/PreferenceTestResults';
import type { NavigationFlowData } from '../components/NavigationFlow/types';
import type { ResearchConfigQuestionWithFiles } from '../types/data-processing';
import type { ProcessedDataItem } from '../types/data-processing';
import { getQuestionType } from './question-type-mapper';
import {
  getQuestionFiles,
  createFilesMap,
  findImageUrlForOption,
  transformFilesToPreferenceImages,
  transformFilesToImageFiles
} from './file-processor';
import {
  extractClicksFromResponse,
  processNavigationFlowClicks
} from './navigation-flow-parser';
import type { NavigationFlowResponseValue } from '../types/data-processing';

/**
 * Transforma datos de sentimiento
 */
export function transformSentimentData(
  processedDataForQuestion: ProcessedDataItem | undefined,
  question: ResearchConfigQuestionWithFiles
): CognitiveTaskQuestion | undefined {
  if (!processedDataForQuestion?.sentimentData) {
    return undefined;
  }

  const sentimentDataRaw = processedDataForQuestion.sentimentData as {
    responses: Array<{
      text: string;
      participantId: string;
      timestamp: string;
    }>;
    totalResponses: number;
  };

  return {
    id: question.id,
    questionNumber: question.id,
    questionText: question.title || question.description || `Pregunta ${question.id}`,
    questionType: getQuestionType(question.type) as 'short_text' | 'long_text',
    required: question.required || false,
    conditionalityDisabled: question.showConditionally || false,
    sentimentResults: sentimentDataRaw.responses.map((r, index) => ({
      id: `${question.id}-${index}`,
      text: r.text || String(r.text || ''),
      sentiment: 'neutral' as const,
      selected: false,
      type: 'comment' as const
    })),
    sentimentAnalysis: {
      text: `Análisis de ${sentimentDataRaw.totalResponses} respuesta(s)`
    },
    themes: [],
    keywords: []
  };
}

/**
 * Transforma datos de opciones múltiples
 */
export function transformChoiceData(
  processedDataForQuestion: ProcessedDataItem | undefined,
  question: ResearchConfigQuestionWithFiles
): ChoiceQuestionData | undefined {
  if (!processedDataForQuestion?.choiceData) {
    return undefined;
  }

  const choiceDataRaw = processedDataForQuestion.choiceData as {
    choices: Array<{
      id?: string;
      label: string;
      count: number;
      percentage: number;
    }>;
    totalResponses: number;
  };

  const configChoices = question.choices || [];
  const processedChoicesMap = new Map(
    choiceDataRaw.choices.map((c) => [c.id || c.label, c])
  );

  configChoices.forEach((configChoice: { id?: string; text?: string; label?: string }) => {
    const choiceId = configChoice.id || '';
    const choiceText = configChoice.text || configChoice.label || '';
    const key = choiceId || choiceText;

    if (key && !processedChoicesMap.has(key)) {
      processedChoicesMap.set(key, {
        id: choiceId,
        label: choiceText,
        count: 0,
        percentage: 0
      });
    }
  });

  const orderedChoices =
    configChoices.length > 0
      ? configChoices.map((configChoice: { id?: string; text?: string; label?: string }, index: number) => {
          const choiceId = configChoice.id || '';
          const choiceText = configChoice.text || configChoice.label || '';
          const key = choiceId || choiceText;

          const processedChoice =
            processedChoicesMap.get(key) || {
              id: choiceId,
              label: choiceText,
              count: 0,
              percentage: 0
            };

          return {
            id: processedChoice.id || `${question.id}-choice-${index}`,
            text: processedChoice.label,
            count: processedChoice.count,
            percentage: processedChoice.percentage
          };
        })
      : Array.from(processedChoicesMap.values()).map((choice, index) => ({
          id: choice.id || `${question.id}-choice-${index}`,
          text: choice.label,
          count: choice.count,
          percentage: choice.percentage
        }));

  return {
    question: question.title || question.description || `Pregunta ${question.id}`,
    description: question.description,
    instructions: question.instructions || question.instruction || undefined,
    options: orderedChoices,
    totalResponses: choiceDataRaw.totalResponses,
    responseDuration: undefined
  };
}

/**
 * Transforma datos de escala lineal
 */
export function transformLinearScaleData(
  processedDataForQuestion: ProcessedDataItem | undefined,
  question: ResearchConfigQuestionWithFiles
): LinearScaleData | undefined {
  if (!processedDataForQuestion?.linearScaleData) {
    return undefined;
  }

  const linearScaleDataRaw = processedDataForQuestion.linearScaleData as {
    values?: number[];
    responses?: Array<{ value: number; count: number }>;
    distribution?: Record<number, number>;
    scaleRange?: { start: number; end: number };
    average: number;
    totalResponses: number;
  };

  const scaleRange =
    linearScaleDataRaw.scaleRange ||
    (question.scaleConfig
      ? {
          start: question.scaleConfig.startValue || 1,
          end: question.scaleConfig.endValue || 5
        }
      : { start: 1, end: 5 });

  return {
    question: question.title || question.description || `Pregunta ${question.id}`,
    description: question.description,
    scaleRange,
    responses: linearScaleDataRaw.responses || [],
    distribution: linearScaleDataRaw.distribution || {},
    average: linearScaleDataRaw.average,
    totalResponses: linearScaleDataRaw.totalResponses
  };
}

/**
 * Transforma datos de ranking
 */
export function transformRankingData(
  processedDataForQuestion: ProcessedDataItem | undefined,
  question: ResearchConfigQuestionWithFiles
): RankingQuestionData | undefined {
  if (!processedDataForQuestion?.rankingData) {
    return undefined;
  }

  const rankingDataRaw = processedDataForQuestion.rankingData as {
    responses: Array<{
      participantId: string;
      ranking: unknown;
      timestamp: string;
    }>;
    totalResponses: number;
  };

  const rankingMap: Record<string, { ranks: number[]; text: string }> = {};

  rankingDataRaw.responses.forEach((response) => {
    const ranking = response.ranking;

    if (Array.isArray(ranking) && ranking.length > 0 && typeof ranking[0] === 'string') {
      ranking.forEach((optionText, position) => {
        const choice = question.choices?.find(
          (c: { text: string; id?: string }) => c.text === optionText || c.id === optionText
        );

        const optionId = choice?.id || `option-${position + 1}`;
        const text = choice?.text || optionText;
        const rank = position + 1;

        if (!rankingMap[optionId]) {
          rankingMap[optionId] = { ranks: [], text };
        }
        rankingMap[optionId].ranks.push(rank);
      });
    } else if (Array.isArray(ranking) && ranking.length > 0 && typeof ranking[0] === 'number') {
      ranking.forEach((rank, index) => {
        const optionId = question.choices?.[index]?.id || `option-${index + 1}`;
        const optionText = question.choices?.[index]?.text || `Opción ${index + 1}`;

        if (!rankingMap[optionId]) {
          rankingMap[optionId] = { ranks: [], text: optionText };
        }
        rankingMap[optionId].ranks.push(rank);
      });
    } else if (typeof ranking === 'object' && ranking !== null && !Array.isArray(ranking)) {
      Object.entries(ranking as Record<string, number>).forEach(([key, rank]) => {
        const optionId = key;
        const optionText =
          question.choices?.find((c: { id: string; text: string }) => c.id === key)?.text || key;

        if (!rankingMap[optionId]) {
          rankingMap[optionId] = { ranks: [], text: optionText };
        }
        rankingMap[optionId].ranks.push(rank);
      });
    }
  });

  const options = Object.entries(rankingMap).map(([id, data]) => {
    const mean = data.ranks.length > 0 ? data.ranks.reduce((sum, rank) => sum + rank, 0) / data.ranks.length : 0;

    const distribution: { 1: number; 2: number; 3: number; 4: number; 5: number; 6: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0
    };

    data.ranks.forEach((rank) => {
      const rankKey = Math.min(Math.max(Math.round(rank), 1), 6) as 1 | 2 | 3 | 4 | 5 | 6;
      distribution[rankKey] = (distribution[rankKey] || 0) + 1;
    });

    return {
      id,
      text: data.text,
      mean,
      distribution,
      responseTime: '0s'
    };
  });

  return {
    question: question.title || question.description || `Pregunta ${question.id}`,
    options
  };
}

/**
 * Transforma datos de test de preferencia
 */
export function transformPreferenceTestData(
  processedDataForQuestion: ProcessedDataItem | undefined,
  question: ResearchConfigQuestionWithFiles,
  researchConfig: { questions?: ResearchConfigQuestionWithFiles[] } | null
): PreferenceTestData | undefined {
  if (!processedDataForQuestion?.preferenceTestData) {
    return undefined;
  }

  const preferenceTestDataRaw = processedDataForQuestion.preferenceTestData as {
    preferences: Array<{
      option: string;
      count: number;
      percentage: number;
    }>;
    totalResponses: number;
  };

  const questionFiles = getQuestionFiles(question, researchConfig);
  const filesMap = createFilesMap(questionFiles);

  const options = preferenceTestDataRaw.preferences.map((pref, index) => {
    const imageUrl = findImageUrlForOption(filesMap, questionFiles, pref.option, index);

    return {
      id: `option-${index + 1}`,
      name: pref.option,
      image: imageUrl,
      selected: pref.count,
      percentage: pref.percentage,
      color: undefined
    };
  });

  return {
    question: question.title || question.description || `Pregunta ${question.id}`,
    description: question.description,
    options,
    totalSelections: preferenceTestDataRaw.totalResponses,
    totalParticipants: preferenceTestDataRaw.totalResponses,
    allImages: transformFilesToPreferenceImages(questionFiles)
  };
}

/**
 * Transforma datos de flujo de navegación
 */
export function transformNavigationFlowData(
  processedDataForQuestion: ProcessedDataItem | undefined,
  question: ResearchConfigQuestionWithFiles,
  researchConfig: { questions?: ResearchConfigQuestionWithFiles[] } | null,
  researchId: string | null
): NavigationFlowData | undefined {
  if (!processedDataForQuestion?.navigationFlowData) {
    return undefined;
  }

  const navigationFlowDataRaw = processedDataForQuestion.navigationFlowData as {
    responses: Array<{
      participantId: string;
      data: unknown;
      value?: unknown;
      timestamp: string;
    }>;
    totalResponses: number;
  };

  const allClicksTracking: Array<{
    x: number;
    y: number;
    timestamp: number;
    hitzoneId?: string;
    imageIndex: number;
    isCorrectHitzone: boolean;
    participantId?: string;
  }> = [];

  const visualClickPoints: Array<{
    x: number;
    y: number;
    timestamp: number;
    isCorrect: boolean;
    imageIndex: number;
    participantId?: string;
  }> = [];

  const imageSelections: Record<
    string,
    {
      hitzoneId: string;
      click: {
        x: number;
        y: number;
        hitzoneWidth: number;
        hitzoneHeight: number;
      };
    }
  > = {};

  if (navigationFlowDataRaw.responses && navigationFlowDataRaw.responses.length > 0) {
    navigationFlowDataRaw.responses.forEach((response, index) => {
      const rawValue = response.data || response.value;
      const responseValue = rawValue as NavigationFlowResponseValue;

      const clicks = extractClicksFromResponse(responseValue, response.timestamp);

      if (clicks.length > 0) {
        const processed = processNavigationFlowClicks(
          clicks,
          responseValue,
          response.timestamp,
          response.participantId,
          index
        );

        allClicksTracking.push(...processed.allClicksTracking);
        visualClickPoints.push(...processed.visualClickPoints);
        Object.assign(imageSelections, processed.imageSelections);
      }
    });
  }

  const questionFiles = getQuestionFiles(question, researchConfig);
  const transformedFiles = transformFilesToImageFiles(questionFiles);

  const uniqueParticipants = new Set(
    navigationFlowDataRaw.responses.map((r) => r.participantId).filter(Boolean)
  );
  const totalParticipants = uniqueParticipants.size;

  return {
    question: question.title || question.description || `Pregunta ${question.id}`,
    totalSelections: navigationFlowDataRaw.totalResponses,
    totalParticipants,
    researchId: researchId || '',
    imageSelections,
    visualClickPoints,
    allClicksTracking,
    files: transformedFiles
  };
}

