import React from 'react';
import { useStepStore } from '../../../stores/useStepStore';
import StepItem from './StepItem';
import { CustomStepsListProps } from '../types/types';

const StepsList: React.FC<CustomStepsListProps> = ({ steps, currentStepKey, isStepEnabled }) => {
  const { setCurrentQuestionKey, getStepState } = useStepStore();

  const handleStepClick = (questionKey: string) => {
    setCurrentQuestionKey(questionKey);
  };

  return (
    <ul className="space-y-1 h-[450px] overflow-y-auto">
      {steps.map((step, idx) => {
        const stepStateInfo = getStepState(idx);
        return (
          <StepItem
            key={idx}
            step={step}
            isActive={step.questionKey === currentStepKey}
            isDisabled={isStepEnabled ? !isStepEnabled(idx) : false}
            onClick={() => handleStepClick(step.questionKey)}
            stepState={stepStateInfo.state}
            canAccess={stepStateInfo.canAccess}
          />
        );
      })}
    </ul>
  );
};

export default StepsList;
