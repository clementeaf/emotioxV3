import React from 'react';
import { useDisqualificationRedirect } from '../../../hooks/useDisqualificationRedirect';
import { useEyeTrackingConfigQuery } from '../../../hooks/useEyeTrackingConfigQuery';
import { useOptimizedMonitoringWebSocket } from '../../../hooks/useOptimizedMonitoringWebSocket';
import { useDemographicValidation } from '../../../hooks/useDemographicValidation';
import { useDemographicSave } from '../../../hooks/useDemographicSave';
import { useDemographicData } from '../../../hooks/useDemographicData';
import { useTestStore } from '../../../stores/useTestStore';
import { useParticipantStore } from '../../../stores/useParticipantStore';
import { DemographicFormUI } from './DemographicFormUI';

interface DemographicFormProps {
  demographicQuestions: Record<string, unknown>;
  currentQuestionKey?: string;
  onSubmit?: (data: Record<string, string>) => void;
}

export const DemographicForm: React.FC<DemographicFormProps> = ({
  demographicQuestions,
  currentQuestionKey = 'demographics',
  onSubmit
}) => {
  const { researchId } = useTestStore();
  const { data: eyeTrackingConfig } = useEyeTrackingConfigQuery(researchId || '');
  const { redirectToDisqualification } = useDisqualificationRedirect();
  const { sendParticipantDisqualified } = useOptimizedMonitoringWebSocket();

  const { validateCurrentData } = useDemographicValidation({ demographicQuestions });
  const { isLoading, saveDemographicsToBackend } = useDemographicSave({ currentQuestionKey });
  const { formValues, hasLoadedData, handleInputChange } = useDemographicData({ currentQuestionKey });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eyeTrackingConfig?.demographicQuestions) return;

    if (!formValues || Object.keys(formValues).length === 0) {
      return;
    }

    const validationResult = validateCurrentData(formValues);

    if (validationResult.isDisqualified) {
      await saveDemographicsToBackend(formValues, true);
      
      const { getParticipantId } = useParticipantStore.getState();
      const participantId = getParticipantId();
      
      sendParticipantDisqualified(
        participantId,
        validationResult.reason || 'Descalificado por criterios demográficos',
        formValues,
        'demographics'
      );

      redirectToDisqualification(eyeTrackingConfig, validationResult.reason);
      return;
    } else {
      await saveDemographicsToBackend(formValues, false);
      onSubmit?.(formValues);
    }
  };

  const questionsToShow = eyeTrackingConfig?.demographicQuestions || demographicQuestions;

  const questions = Object.entries(questionsToShow)
    .filter(([, questionData]) => (questionData as { enabled?: boolean })?.enabled)
    .map(([key, questionData]) => {
      const questionDataAny = questionData as { 
        enabled?: boolean;
        type?: string; 
        required?: boolean; 
        title?: string;
        options?: string[];
        disqualifyingAges?: string[];
        disqualifyingCountries?: string[];
        disqualifyingGenders?: string[];
        disqualifyingEducation?: string[];
        disqualifyingIncomes?: string[];
        disqualifyingEmploymentStatuses?: string[];
        disqualifyingHours?: string[];
        disqualifyingProficiencies?: string[];
      };

      const disqualifyingOptions = questionDataAny?.disqualifyingAges ||
        questionDataAny?.disqualifyingCountries ||
        questionDataAny?.disqualifyingGenders ||
        questionDataAny?.disqualifyingEducation ||
        questionDataAny?.disqualifyingIncomes ||
        questionDataAny?.disqualifyingEmploymentStatuses ||
        questionDataAny?.disqualifyingHours ||
        questionDataAny?.disqualifyingProficiencies || [];

      const allOptions = questionDataAny?.options || [];

      const sortedOptions = key === 'age'
        ? allOptions.sort((a: string, b: string) => {
          const getMinAge = (range: string) => {
            if (range.includes('+')) {
              return parseInt(range.replace('+', ''));
            }
            return parseInt(range.split('-')[0]);
          };
          return getMinAge(a) - getMinAge(b);
        })
        : allOptions;

      return {
        key,
        enabled: questionDataAny?.enabled || false,
        required: questionDataAny?.required || false,
        options: sortedOptions,
        disqualifyingOptions
      };
    });

  return (
    <DemographicFormUI
      questions={questions}
      formValues={formValues}
      hasLoadedData={hasLoadedData}
      isLoading={isLoading}
      onInputChange={handleInputChange}
      onSubmit={handleSubmit}
    />
  );
};
