import React from 'react';
import { useButtonSteps } from '../../hooks/useButtonSteps';
import { ButtonStepsUI } from './components/ButtonStepsUI';
import { ButtonStepsProps } from './types/types';

export const ButtonSteps: React.FC<ButtonStepsProps> = ({
  currentQuestionKey,
  isWelcomeScreen = false
}) => {
  const { buttonText, isDisabled, handleClick, isSaving, isNavigating } = useButtonSteps({
    currentQuestionKey,
    isWelcomeScreen
  });

  return (
    <ButtonStepsUI
      buttonText={buttonText}
      isDisabled={isDisabled}
      onClick={handleClick}
      isLoading={isSaving || isNavigating}
    />
  );
};
