import { StepSearchResult, StepType } from '../types/types';

export function getStepType(step: StepSearchResult): StepType {
  if (!step) return 'unknown';

  // Si tiene screenType, es una pantalla (Bienvenida, Gracias, etc.)
  if ('screenType' in step) return 'screen';

  // Si tiene questionKey de bienvenida o gracias, también es screen
  if ('questionKey' in step && (step.questionKey === 'welcome_screen' || step.questionKey === 'thank_you_screen')) {
    return 'screen';
  }

  if ('demographicQuestions' in step) return 'demographics';
  if ('parentStep' in step) return 'parent';
  if ('questionKey' in step && !('parentStep' in step)) return 'question';

  return 'unknown';
}
