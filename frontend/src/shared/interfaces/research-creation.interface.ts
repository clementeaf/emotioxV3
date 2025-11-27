/**
 * Interfaces para el módulo de creación de investigaciones
 */

/**
 * Props para componentes modales de confirmación
 */
export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  onNew: () => void;
}

/**
 * Datos de investigación exitosa
 */
export interface SuccessData {
  id: string;
  name: string;
}

/**
 * Props para secciones de creación
 */
export interface CreateSectionProps {
  onResearchCreated: (id: string, name: string) => void;
}

/**
 * Props para sección de éxito
 */
export interface SuccessSectionProps {
  id: string;
  name: string;
  onClose: () => void;
}

/**
 * Props para sección de etapas
 */
export interface StagesSectionProps {
  id: string;
}

/**
 * Props para sección de error
 */
export interface ErrorSectionProps {
  onNavigateToStart: () => void;
}

/**
 * Estados posibles del flujo de creación
 */
export type ResearchCreationStep = 'create' | 'success' | 'stages' | 'error';

/**
 * Configuración del flujo de creación
 */
export interface ResearchCreationConfig {
  step: ResearchCreationStep;
  researchId?: string;
  successData?: SuccessData;
}
