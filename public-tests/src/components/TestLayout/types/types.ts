import { AvailableFormsResponse } from '../../../lib/types';

export interface Question {
  title?: string;
  questionKey?: string;
  type?: string;
  config?: Record<string, unknown>;
  choices?: Choice[];
  files?: unknown[];
  description?: string;
}

export interface SidebarStep {
  label: string;
  questionKey: string;
}

export interface StepData {
  originalSk: string;
  derivedType?: string;
  config: {
    title?: string;
    questions?: Question[];
    questionKey?: string;
    [key: string]: unknown;
  };
  questionKey?: string;
}

export type StepSearchResult =
  | StepData
  | (Question & { parentStep: StepData })
  | Question
  | StepData['config']
  | { demographicQuestions: Question[]; parentStep: StepData }
  | undefined;

export interface ScreenStep {
  title?: string;
  description?: string;
  message?: string;
  startButtonText?: string;
  questionKey?: string;
  [key: string]: unknown;
}

export interface StepItemProps {
  step: { title: string; questionKey: string };
  isActive: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}

export interface StepsListProps {
  steps: SidebarStep[];
  currentStepKey: string;
  isStepEnabled?: (index: number) => boolean;
  onStepClick?: (step: SidebarStep, index: number) => void;
}



// Eliminada definición duplicada de TestLayoutSidebarProps

export interface DemographicQuestion {
  key: string;
  enabled: boolean;
  required: boolean;
  options: Array<string | { value: string; label: string }>;
  // Puedes agregar más campos según tu estructura real
}

export type StepType = 'screen' | 'demographics' | 'parent' | 'question' | 'smart-voc' | 'unknown';


export interface ScaleRangeQuestionProps {
  min?: number;
  max?: number;
  leftLabel?: string;
  rightLabel?: string;
  startLabel?: string;
  endLabel?: string;
  value?: number;
  onChange?: (value: number) => void;
}
export interface Choice {
  id: string;
  text: string;
  isQualify?: boolean;
  isDisqualify?: boolean;
}

export interface SingleAndMultipleChoiceQuestionProps {
  choices: Choice[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
}

export interface PreferenceFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface PreferenceTestTaskProps {
  stepConfig: Record<string, unknown>;
  selectedImageId?: string | null;
  onImageSelect?: (imageId: string) => void;
  currentQuestionKey?: string;
}

export interface ModuleResponseData {
  participantId: string;
  researchId: string;
  questionKey: string;
  response: unknown;
}

export interface QuestionComponentProps {
  question: Question;
  currentStepKey: string;
}

export interface UseSidebarLogicProps {
  researchId?: string;
  onStepsReady?: (steps: SidebarStep[]) => void;
  onNavigateToStep?: (stepKey: string) => void;
  onDeleteAllResponses?: () => Promise<void>;
}

export interface CustomStep {
  title: string;
  questionKey: string;
}

export interface UseSidebarLogicReturn {
  formsData: AvailableFormsResponse | undefined;
  steps: CustomStep[];
  totalSteps: number;
  isLoading: boolean;
  error: Error | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  selectedQuestionKey: string;
  isStepEnabled: (stepIndex: number) => boolean;
  handleStepClick: (questionKey: string) => void;
  handleDeleteAllResponses: () => Promise<void>;
  isDeleting: boolean;
  deleteButtonText: string;
  isDeleteDisabled: boolean;
  refetchForms: () => void;
}

export interface CustomStep {
  title: string;
  questionKey: string;
}

export interface CustomStepsListProps {
  steps: CustomStep[];
  currentStepKey: string;
  isStepEnabled?: (index: number) => boolean;
}

export interface TestLayoutSidebarProps {
  researchId?: string;
  onStepsReady?: (steps: SidebarStep[]) => void;
  onNavigateToStep?: (stepKey: string) => void;
  onDeleteAllResponses?: () => Promise<void>;
}

export interface DemographicQuestionData {
  enabled: boolean;
  required: boolean;
  options: string[];
}

export interface DemographicFormProps {
  demographicQuestions: Record<string, DemographicQuestionData>;
  onSubmit?: (values: Record<string, string>) => void;
}

export interface ButtonStepsProps {
  currentQuestionKey: string;
  formData?: Record<string, unknown>;
  isWelcomeScreen?: boolean;
}

export interface Props {
  onStepsReady?: (steps: SidebarStep[]) => void;
  onNavigateToStep?: (stepKey: string) => void;
}

export interface RendererArgs {
  contentConfiguration: Record<string, unknown>;
  currentQuestionKey: string;
}
