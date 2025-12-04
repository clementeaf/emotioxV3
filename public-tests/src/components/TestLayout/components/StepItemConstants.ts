/**
 * Constantes para el componente StepItem
 */

import { StepState } from '../../../stores/useStepStore';

/**
 * Estilos base para el contenedor del step
 */
const BASE_STYLES = 'px-3 py-2 rounded-xl text-sm font-medium transition-colors';

/**
 * Configuración de estilos por estado
 */
export const STEP_STYLES: Record<StepState, string> = {
  disabled: `${BASE_STYLES} bg-neutral-100 text-neutral-400 cursor-not-allowed`,
  completed: `${BASE_STYLES} bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer`,
  active: `${BASE_STYLES} bg-primary-50 text-primary-500 font-semibold cursor-pointer`,
  available: `${BASE_STYLES} bg-white text-neutral-500 hover:bg-neutral-50 cursor-pointer`
};

/**
 * Configuración de iconos para cada estado
 */
export const STEP_ICON_CONFIG: Record<StepState, { className: string; path: string }> = {
  disabled: {
    className: "w-4 h-4 text-neutral-400",
    path: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
  },
  completed: {
    className: "w-4 h-4 text-green-600",
    path: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
  },
  active: {
    className: "w-4 h-4 text-primary-500",
    path: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
  },
  available: {
    className: "w-4 h-4 text-neutral-400",
    path: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
  }
};

/**
 * Obtiene la configuración completa para un estado
 */
export const getStepConfig = (stepState: StepState) => ({
  styles: STEP_STYLES[stepState],
  iconConfig: STEP_ICON_CONFIG[stepState]
});
