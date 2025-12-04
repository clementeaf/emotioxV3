import { useCallback } from 'react';
import { UseStepItemProps } from './StepItemTypes';
import { getStepConfig } from './StepItemConstants';

/**
 * Hook para manejar la lógica del StepItem
 */
export const useStepItem = ({
  stepState,
  canAccess,
  isDisabled,
  onClick
}: UseStepItemProps) => {
  const canClick = canAccess && !isDisabled;
  const stepConfig = getStepConfig(stepState);

  const handleClick = useCallback(() => {
    if (canClick) {
      onClick();
    }
  }, [canClick, onClick]);

  return {
    canClick,
    stepConfig,
    handleClick
  };
};
