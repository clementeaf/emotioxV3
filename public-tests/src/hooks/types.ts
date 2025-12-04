/**
 * 🧪 TIPOS SIMPLIFICADOS PARA HOOKS
 *
 * Este archivo contiene solo los tipos necesarios para hooks locales,
 * sin referencias a backend o envío de datos.
 */

// Tipos para hooks de estado local
export interface UseLocalDataProps {
  researchId: string;
  participantId: string;
}

export interface UseLocalDataReturn {
  isLoading: boolean;
  error: string | null;
  metadata: Record<string, unknown>;
  saveResponse: (questionKey: string, response: unknown) => void;
  getResponse: (questionKey: string) => unknown | null;
  updateResponse: (questionKey: string, newResponse: unknown) => void;
  clearAllResponses: () => void;
  startSession: () => void;
  endSession: () => void;
  updateCurrentStep: (stepKey: string) => void;
  updateProgress: (progress: number) => void;
}

// Tipos para navegación local
export interface UseNavigationProps {
  steps: Array<{ id: string; type: string; name: string }>;
  currentStepIndex: number;
}

export interface UseNavigationReturn {
  currentStep: { id: string; type: string; name: string } | null;
  canGoNext: boolean;
  canGoPrevious: boolean;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (stepIndex: number) => void;
  progress: number;
}

// Tipos para useDeleteState
export interface UseDeleteStateProps {
  onSuccess?: () => void;
  buttonText?: string;
  showToasts?: boolean;
}

export interface UseDeleteStateReturn {
  isDeleting: boolean;
  buttonText: string;
  isButtonDisabled: boolean;
  handleDelete: (deleteFn: () => Promise<void>) => Promise<void>;
}

// Tipos para useSubmitState
export interface UseSubmitStateProps {
  onSuccess?: () => void;
  buttonText?: string;
  hasPreviousResponse?: boolean;
}

export interface UseSubmitStateReturn {
  isSubmitting: boolean;
  isSuccess: boolean;
  buttonText: string;
  isButtonDisabled: boolean;
  handleSubmit: (submitFn: () => Promise<void>) => Promise<void>;
}
