import { useCallback } from 'react';

interface ValidationResult {
  isDisqualified: boolean;
  reason?: string;
}

interface DemographicQuestion {
  disqualifyingOptions?: string[];
}

interface UseDemographicValidationProps {
  demographicQuestions: Record<string, unknown>;
}

export const useDemographicValidation = ({ demographicQuestions }: UseDemographicValidationProps) => {
  const validateDemographics = useCallback((
    data: Record<string, string>, 
    questions: Record<string, unknown>
  ): ValidationResult => {
    for (const [key, value] of Object.entries(data)) {
      const question = questions[key] as DemographicQuestion;
      if (question?.disqualifyingOptions?.includes(value)) {
        return {
          isDisqualified: true,
          reason: `Opción descalificatoria seleccionada: ${value}`
        };
      }
    }
    return { isDisqualified: false };
  }, []);

  const validateCurrentData = useCallback((data: Record<string, string>): ValidationResult => {
    return validateDemographics(data, demographicQuestions);
  }, [validateDemographics, demographicQuestions]);

  return {
    validateDemographics,
    validateCurrentData
  };
};
