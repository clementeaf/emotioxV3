import React from 'react';
import { StepItemPropsWithState } from './StepItemTypes';
import { useStepItem } from './useStepItem';
import { StepIcon } from './StepIcon';

const StepItem: React.FC<StepItemPropsWithState> = ({
  step,
  onClick,
  isDisabled,
  stepState,
  canAccess
}) => {

  const { stepConfig, handleClick } = useStepItem({
    stepState,
    canAccess,
    isDisabled: isDisabled || false,
    onClick
  });

  return (
    <li
      className={stepConfig.styles}
      onClick={handleClick}
    >
      <span className="flex items-center gap-2">
        <StepIcon stepState={stepState} />
        {step.title}
      </span>
    </li>
  );
};

export default StepItem;
