import { useEffect } from 'react';
import { useFormDataStore } from '../stores/useFormDataStore';
import { useStepStore } from '../stores/useStepStore';

export const useDebugSteps = () => {
  const { backendResponses, currentQuestionKey, steps, hasBackendResponse, getStepState } = useStepStore();
  const { formData } = useFormDataStore();

  useEffect(() => {
    // Debug functionality - currently disabled for production
    // This hook can be used to track state changes during development
  }, [backendResponses, currentQuestionKey, steps, formData, hasBackendResponse, getStepState]);
};
