import React from 'react';
import { StepState } from '../../../stores/useStepStore';
import { STEP_ICON_CONFIG } from './StepItemConstants';

interface StepIconProps {
  stepState: StepState;
  className?: string;
}

/**
 * Componente para renderizar iconos de estado del step
 */
export const StepIcon: React.FC<StepIconProps> = ({ 
  stepState, 
  className = '' 
}) => {
  const iconConfig = STEP_ICON_CONFIG[stepState];
  
  return (
    <svg 
      className={`${iconConfig.className} ${className}`} 
      fill="currentColor" 
      viewBox="0 0 20 20"
    >
      <path fillRule="evenodd" d={iconConfig.path} clipRule="evenodd" />
    </svg>
  );
};
