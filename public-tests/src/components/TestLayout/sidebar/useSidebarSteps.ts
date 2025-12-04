import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useAvailableFormsQuery } from '../../../hooks/useApiQueries';
import { useStepStore } from '../../../stores/useStepStore';
import { useTestStore } from '../../../stores/useTestStore';
import { SidebarStep } from '../types';

export function useSidebarSteps(
  researchId: string,
  localSteps: SidebarStep[],
  onStepsReady?: (steps: SidebarStep[]) => void
) {
  const { setCurrentQuestionKey } = useStepStore();
  const { hasResponse } = useTestStore();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useAvailableFormsQuery(researchId);

  useEffect(() => {
    if (researchId) {
      queryClient.invalidateQueries({ queryKey: ['availableForms', researchId] });
    }
  }, [researchId, queryClient]);

  const steps = useMemo(() => {

    if (data?.steps && data.steps.length > 0) {
      const apiSteps = data.steps.map((stepKey: string, i: number) => ({
        label: `Paso ${i + 1}`,
        questionKey: stepKey
      }));
      return apiSteps;
    }

    return localSteps;
  }, [data, localSteps]);

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (steps.length > 0 && !hasInitializedRef.current) {
      const firstStep = steps[0];
      if (firstStep && !hasResponse(firstStep.questionKey)) {
        setCurrentQuestionKey(firstStep.questionKey);
        hasInitializedRef.current = true;
      }
    }
  }, [steps, hasResponse, setCurrentQuestionKey]);

  const stepsNotifiedRef = useRef(false);

  useEffect(() => {
    if (steps.length > 0 && onStepsReady && !stepsNotifiedRef.current) {
      stepsNotifiedRef.current = true;
      onStepsReady(steps);
    }
  }, [steps, onStepsReady]);

  return {
    steps,
    isLoading,
    error,
    refetch
  };
}
