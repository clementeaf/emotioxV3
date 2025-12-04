import { AvailableFormsResponse, StepConfiguration } from '../../../lib/types';

export const QUESTION_TYPE_MAP = {
  // Screens especiales
  welcome_screen: 'screen',
  thank_you_screen: 'screen',

  // Demographics
  demographics: 'demographics',

  // SmartVOC questions
  smartvoc: 'smartvoc',
  smartvoc_csat: 'smartvoc_csat',
  smartvoc_ces: 'smartvoc_ces',
  smartvoc_cv: 'smartvoc_cv',
  smartvoc_nev: 'smartvoc_nev',
  smartvoc_nps: 'smartvoc_nps',
  smartvoc_voc: 'smartvoc_voc',

  // Cognitive Task questions
  cognitive_short_text: 'cognitive_short_text',
  cognitive_long_text: 'cognitive_long_text',
  cognitive_multiple_choice: 'cognitive_multiple_choice',
  cognitive_single_choice: 'cognitive_single_choice',
  cognitive_linear_scale: 'cognitive_linear_scale',
  cognitive_rating: 'cognitive_rating',
  cognitive_ranking: 'cognitive_ranking',
  cognitive_navigation_flow: 'cognitive_navigation_flow',
  cognitive_preference_test: 'cognitive_preference_test',

  // Tipos adicionales para StepsComponents
  scale: 'scale',
  hierarchy: 'hierarchy',
  detailed: 'detailed',
  text: 'text',
  choice: 'choice',
  pending: 'pending'
} as const;

export type QuestionType = typeof QUESTION_TYPE_MAP[keyof typeof QUESTION_TYPE_MAP];

/**
 * Obtiene el step data actual basado en el questionKey
 */
export const getCurrentStepData = (
  formsData: AvailableFormsResponse | undefined,
  currentQuestionKey: string
): StepConfiguration | undefined => {
  if (!formsData?.stepsConfiguration) {
    return undefined;
  }

  return formsData.stepsConfiguration.find(
    (step: StepConfiguration) => step.questionKey === currentQuestionKey
  );
};

/**
 * Obtiene el tipo de componente basado en el questionKey
 */
export const getQuestionType = (questionKey: string): QuestionType => {
  return QUESTION_TYPE_MAP[questionKey as keyof typeof QUESTION_TYPE_MAP] || 'unknown';
};
