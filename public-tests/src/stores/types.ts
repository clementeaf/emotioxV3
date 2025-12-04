export interface Step {
  questionKey: string;
  title: string;
  completed: boolean;
  current: boolean;
}

export interface StepStore {
  // Estado actual
  currentQuestionKey: string;

  // Lista completa de steps
  steps: Step[];
  totalSteps: number;

  // Métodos de control
  setCurrentQuestionKey: (questionKey: string) => void;
  getCurrentQuestionKey: () => string;

  // Métodos para steps
  setSteps: (steps: Step[]) => void;
  getSteps: () => Step[];
  getStep: (questionKey: string) => Step | undefined;
  getCurrentStep: () => Step | undefined;
  getNextStep: () => Step | undefined;
  getPreviousStep: () => Step | undefined;

  // Navegación
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (questionKey: string) => void;

  // Utilidades
  isFirstStep: () => boolean;
  isLastStep: () => boolean;
  canGoNext: () => boolean;
  canGoPrevious: () => boolean;
}
