import { useState } from 'react';

export function useTestStep(initialStep: number = 0) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep);

  const goToStep = (index: number) => setCurrentStepIndex(index);

  return {
    currentStepIndex,
    setCurrentStepIndex: goToStep,
  };
}
