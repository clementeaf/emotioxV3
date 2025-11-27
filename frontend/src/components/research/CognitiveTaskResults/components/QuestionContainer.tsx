'use client';

import React from 'react';

import { CognitiveTaskQuestion } from '../types';
import { NavigationFlowData } from './NavigationFlow/types';
import { AnalysisTabType } from './AnalysisTabs';
import { ChoiceQuestionData } from './ChoiceResults';
import { ImageSelectionData } from './ImageSelectionResults';
import { LinearScaleData } from './LinearScaleResults';
import { PreferenceTestData } from './PreferenceTestResults';
import { RankingQuestionData } from './RankingResults';
import { RatingData } from './RatingResults';

import {
  ChoiceResults,
  ImageSelectionResults,
  LinearScaleResults,
  MainContent,
  NavigationFlowResults,
  PreferenceTestResults,
  QuestionInfo,
  RankingResults,
  RatingResults
} from './';

export type QuestionViewType = 'sentiment' | 'choice' | 'ranking' | 'linear_scale' | 'rating' | 'preference' | 'image_selection' | 'navigation_flow';

interface QuestionContainerProps {
  questionId: string;
  questionText: string;
  questionType: string;
  conditionalityDisabled: boolean;
  required?: boolean;
  hasNewData?: boolean;
  viewType: QuestionViewType;
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

export function QuestionContainer({
  questionId,
  questionText,
  questionType,
  conditionalityDisabled,
  required = false,
  hasNewData = false,
  viewType,
  sentimentData,
  choiceData,
  rankingData,
  linearScaleData,
  ratingData,
  preferenceTestData,
  imageSelectionData,
  navigationFlowData,
  initialActiveTab,
  themeImageSrc,
  choiceImageSrc
}: QuestionContainerProps) {
  /**
   * Mapeo de tipos de visualización a sus componentes y renderizado
   */
  const renderViewContent = (): React.ReactNode => {
    const viewMap: Record<QuestionViewType, React.ReactNode> = {
      sentiment: sentimentData ? (
        <MainContent
          data={sentimentData}
          initialActiveTab={initialActiveTab}
          themeImageSrc={themeImageSrc}
        />
      ) : null,
      choice: choiceData ? (
        <ChoiceResults
          data={choiceData}
          imageSrc={choiceImageSrc}
        />
      ) : null,
      ranking: rankingData ? (
        <RankingResults data={rankingData} />
      ) : null,
      linear_scale: linearScaleData ? (
        <LinearScaleResults data={linearScaleData} />
      ) : null,
      rating: ratingData ? (
        <RatingResults data={ratingData} />
      ) : null,
      preference: preferenceTestData ? (
        <PreferenceTestResults data={preferenceTestData} />
      ) : null,
      image_selection: imageSelectionData ? (
        <ImageSelectionResults data={imageSelectionData} />
      ) : null,
      navigation_flow: (
        <NavigationFlowResults
          researchId={questionId}
          data={navigationFlowData}
        />
      )
    };

    return viewMap[viewType] || null;
  };

  return (
    <div className="w-full bg-white rounded-lg border border-neutral-200 mb-6">
      <QuestionInfo
        questionId={questionId}
        questionText={questionText}
        questionType={questionType}
        conditionalityDisabled={conditionalityDisabled}
        required={required}
        hasNewData={hasNewData}
      />

      {renderViewContent()}
    </div>
  );
}
