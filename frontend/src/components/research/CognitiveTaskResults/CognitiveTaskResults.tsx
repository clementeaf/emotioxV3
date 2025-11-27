'use client';

import { useParams } from 'next/navigation';
import React from 'react';
import { useCognitiveTaskResponses } from '@/hooks/useCognitiveTaskResponses';
import { Filters } from '../../research/SmartVOCResults/Filters';
import { ResultsStateHandler } from '../shared/ResultsStateHandler';
import {
  CognitiveTaskResultsSkeleton,
  QuestionContainer
} from './components';
import type { CognitiveTaskQuestion } from './types';
import type { ChoiceQuestionData } from './components/ChoiceResults';
import type { RankingQuestionData } from './components/RankingResults';
import type { LinearScaleData } from './components/LinearScaleResults';
import type { PreferenceTestData } from './components/PreferenceTestResults';
import type { RatingData } from './components/RatingResults';
import type { ImageSelectionData } from './components/ImageSelectionResults';
import type { NavigationFlowData } from './components/NavigationFlow/types';
import type { AnalysisTabType } from './components/AnalysisTabs';
import type {
  ResearchConfigQuestionWithFiles,
} from './types/data-processing';
import {
  createProcessedDataIndex,
  findProcessedDataForQuestion
} from './utils/processed-data-index';
import { createQuestionsFromConfig } from './utils/question-builder';
import { buildQuestionData } from './utils/question-data-builder';

interface CognitiveTaskResultsProps {
  researchId?: string;
}

export interface ResearchConfig {
  questions?: ResearchConfigQuestionWithFiles[];
  [key: string]: unknown;
}

export interface FinalQuestionData {
  key: string;
  questionId: string;
  questionType: string;
  questionText: string;
  required: boolean;
  conditionalityDisabled: boolean;
  hasNewData: boolean;
  viewType: 'sentiment' | 'choice' | 'ranking' | 'linear_scale' | 'preference' | 'image_selection' | 'navigation_flow';
  sentimentData?: CognitiveTaskQuestion;
  choiceData?: ChoiceQuestionData;
  rankingData?: RankingQuestionData;
  linearScaleData?: LinearScaleData;
  ratingData?: RatingData;
  preferenceTestData?: PreferenceTestData;
  imageSelectionData?: ImageSelectionData;
  navigationFlowData?: NavigationFlowData;
  initialActiveTab?: AnalysisTabType;
  themeImageSrc?: string;
  choiceImageSrc?: string;
}

export const CognitiveTaskResults: React.FC<CognitiveTaskResultsProps> = ({ researchId: propResearchId }) => {
  const params = useParams();
  const researchId = React.useMemo(() => {
    return propResearchId || params?.research as string || params?.id as string || null;
  }, [propResearchId, params?.research, params?.id]);

  const {
    researchConfig,
    processedData,
    isLoading,
    isError,
    error,
    refetch
  } = useCognitiveTaskResponses(researchId);

  const processedDataIndex = React.useMemo(() => {
    return createProcessedDataIndex(processedData);
  }, [processedData]);

  const config = (researchConfig as unknown) as ResearchConfig | null;

  const finalQuestions = React.useMemo(() => {
    if (config?.questions) {
      return config.questions.map((question: ResearchConfigQuestionWithFiles) => {
        const questionType = (question.type as string) || '';
        
        const processedDataForQuestion = findProcessedDataForQuestion(
          processedDataIndex,
          question.id,
          questionType
        );

        return buildQuestionData({
          question,
          processedDataForQuestion,
          researchConfig,
          researchId
        });
      });
    }
    return createQuestionsFromConfig(researchConfig);
  }, [config, processedDataIndex, researchConfig, researchId]);

  // 🎯 Si no hay configuración pero tampoco hay error real, mostrar mensaje en lugar de error
  const errorObj = error as { response?: { status?: number } } | null;
  const is404Error = errorObj?.response?.status === 404;
  const shouldShowError = isError && error && !is404Error;
  const hasNoData = !isLoading && !config && !isError && processedData.length === 0;
  
  return (
    <ResultsStateHandler
      isLoading={isLoading}
      error={shouldShowError ? error : null}
      onRetry={refetch}
      loadingSkeleton={<CognitiveTaskResultsSkeleton />}
    >
      {hasNoData ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center max-w-md">
            <p className="text-lg font-medium text-gray-900 mb-2">
              No hay datos disponibles
            </p>
            <p className="text-sm text-gray-500 mb-4">
              No se encontraron respuestas de tareas cognitivas para esta investigación.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-8 w-full overflow-hidden">
          <div className="flex-1 space-y-6 min-w-0">
            {finalQuestions.map((q: FinalQuestionData) => (
            <QuestionContainer
              key={q.key}
              questionId={q.questionId}
              questionText={q.questionText}
              questionType={q.questionType}
              conditionalityDisabled={q.conditionalityDisabled}
              required={q.required}
              hasNewData={q.hasNewData}
              viewType={q.viewType}
              sentimentData={q.sentimentData}
              choiceData={q.choiceData}
              rankingData={q.rankingData}
              linearScaleData={q.linearScaleData}
              ratingData={q.ratingData}
              preferenceTestData={q.preferenceTestData}
              imageSelectionData={q.imageSelectionData}
              navigationFlowData={q.navigationFlowData}
              initialActiveTab={q.initialActiveTab}
              themeImageSrc={q.themeImageSrc}
            />
          ))}
          </div>
          <div className="w-80 shrink-0">
            {researchId ? (
              <Filters researchId={researchId} />
            ) : (
              <div className="p-4 border border-neutral-200 rounded-lg bg-white">
                <div className="text-sm text-neutral-500 italic text-center py-8">
                  No se pudo obtener el ID de investigación
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ResultsStateHandler>
  );
};
