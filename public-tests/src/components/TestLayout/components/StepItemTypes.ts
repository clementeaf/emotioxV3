/**
 * Interfaces para el componente StepItem
 */

import { StepState } from '../../../stores/useStepStore';
import { StepItemProps } from '../types/types';

export interface StepItemPropsWithState extends StepItemProps {
  stepState: StepState;
  canAccess: boolean;
}

export interface StepItemUIProps {
  step: {
    title: string;
    [key: string]: unknown;
  };
  stepState: StepState;
  canClick: boolean;
  onClick: () => void;
}

export interface UseStepItemProps {
  stepState: StepState;
  canAccess: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export interface StepItemConfig {
  styles: string;
  icon: React.ReactNode;
  canClick: boolean;
}
