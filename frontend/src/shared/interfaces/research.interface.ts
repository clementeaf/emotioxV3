/**
 * Enum for research types
 */
export enum ResearchType {
  EYE_TRACKING = 'eye-tracking',
  ATTENTION_PREDICTION = 'attention-prediction',
  COGNITIVE_ANALYSIS = 'cognitive-analysis'
}

/**
 * Enum for research status
 */
export enum ResearchStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

/**
 * Enum for research stages
 */
export enum ResearchStage {
  BUILD = 'build',
  RECRUIT = 'recruit',
  RESULTS = 'results'
}

/**
 * Interface for research configuration
 */
export interface ResearchConfig {
  /**
   * Basic research information
   */
  basic: {
    /**
     * Title of the research project
     */
    title: string;

    /**
     * Description of the research project
     */
    description: string;

    /**
     * Type of research being conducted
     */
    type: ResearchType;

    /**
     * Target number of participants
     */
    targetParticipants: number;

    /**
     * Research objectives
     */
    objectives: string[];

    /**
     * Keywords/tags associated with the research
     */
    tags?: string[];
  };

  /**
   * Research stages configuration
   */
  stages: {
    /**
     * Build stage configuration
     */
    build: {
      /**
       * Whether the welcome screen is configured
       */
      hasWelcomeScreen: boolean;

      /**
       * Whether Smart VOC is configured
       */
      hasSmartVOC: boolean;

      /**
       * Whether cognitive tasks are configured
       */
      hasCognitiveTasks: boolean;

      /**
       * Whether eye tracking is configured
       */
      hasEyeTracking: boolean;

      /**
       * Whether thank you screen is configured
       */
      hasThankYouScreen: boolean;
    };

    /**
     * Recruit stage configuration
     */
    recruit: {
      /**
       * Whether screener is configured
       */
      hasScreener: boolean;

      /**
       * Whether participant welcome screen is configured
       */
      hasWelcomeScreen: boolean;

      /**
       * Whether implicit association is configured
       */
      hasImplicitAssociation: boolean;

      /**
       * Whether cognitive task is configured
       */
      hasCognitiveTask: boolean;

      /**
       * Whether eye tracking is configured
       */
      hasEyeTracking: boolean;

      /**
       * Whether thank you screen is configured
       */
      hasThankYouScreen: boolean;
    };
  };

  /**
   * Optional metadata
   */
  metadata?: {
    /**
     * Version of the research configuration
     */
    version?: string;

    /**
     * Last time the configuration was updated
     */
    lastUpdated?: Date;

    /**
     * User who last modified the configuration
     */
    lastModifiedBy?: string;
  };
}

/**
 * Interface for research validation
 */
export interface ResearchValidation {
  basic: {
    title: {
      minLength: number;
      maxLength: number;
      required: boolean;
    };
    description: {
      minLength: number;
      maxLength: number;
      required: boolean;
    };
    targetParticipants: {
      min: number;
      max: number;
      required: boolean;
    };
    objectives: {
      minItems: number;
      maxItems: number;
      required: boolean;
    };
  };
}

/**
 * Default validation rules for research
 */
export const DEFAULT_RESEARCH_VALIDATION: ResearchValidation = {
  basic: {
    title: {
      minLength: 5,
      maxLength: 200,
      required: true
    },
    description: {
      minLength: 20,
      maxLength: 2000,
      required: true
    },
    targetParticipants: {
      min: 1,
      max: 10000,
      required: true
    },
    objectives: {
      minItems: 1,
      maxItems: 10,
      required: true
    }
  }
};

/**
 * Default research configuration
 */
export const DEFAULT_RESEARCH_CONFIG: ResearchConfig = {
  basic: {
    title: '',
    description: '',
    type: ResearchType.EYE_TRACKING,
    targetParticipants: 100,
    objectives: [],
    tags: []
  },
  stages: {
    build: {
      hasWelcomeScreen: false,
      hasSmartVOC: false,
      hasCognitiveTasks: false,
      hasEyeTracking: false,
      hasThankYouScreen: false
    },
    recruit: {
      hasScreener: false,
      hasWelcomeScreen: false,
      hasImplicitAssociation: false,
      hasCognitiveTask: false,
      hasEyeTracking: false,
      hasThankYouScreen: false
    }
  },
  metadata: {
    version: '1.0.0'
  }
};

/**
 * Interface for research DynamoDB record
 */
export interface ResearchRecord extends ResearchConfig {
  /**
   * Unique identifier for the research
   */
  id: string;

  /**
   * User ID who owns this research
   */
  userId: string;

  /**
   * Current status of the research
   */
  status: ResearchStatus;

  /**
   * Current stage of the research
   */
  currentStage: ResearchStage;

  /**
   * Progress percentage of the current stage
   */
  stageProgress: number;

  /**
   * Timestamp when the record was created
   */
  createdAt: Date;

  /**
   * Timestamp when the record was last updated
   */
  updatedAt: Date;

  /**
   * Optional completion date
   */
  completedAt?: Date;
}

/**
 * Type for research form submission
 */
export type ResearchFormData = Omit<ResearchConfig, 'metadata' | 'stages'> & {
  stages?: Partial<ResearchConfig['stages']>;
};

/**
 * Interface for research update operations
 */
export interface ResearchUpdate {
  id: string;
  updates: Partial<ResearchFormData>;
}

/**
 * Interface for research creation response
 */
export interface ResearchCreationResponse {
  id: string;
  status: ResearchStatus;
  message: string;
}

// ========== INTERFACES MIGRADAS DESDE /interfaces/research.ts ==========

/**
 * Estructura de un proyecto de investigación
 * Esta interfaz define la estructura básica de un proyecto de investigación
 * que se utilizará en componentes como ResearchTable, Sidebar, etc.
 */
export interface ResearchProject {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  progress: number;
  type?: string;
  technique?: string;
}

/**
 * Props para el componente ResearchTable
 */
export interface ResearchTableProps {
  className?: string;
  showActions?: boolean;
}

/**
 * Props para cualquier componente que muestre información de investigación
 */
export interface ResearchViewProps {
  researchId?: string;
  className?: string;
}

/**
 * Interfaz para tipos de investigación (usado en ResearchTypes)
 * NOTA: Diferente del enum ResearchType - esta es para UI
 */
export interface ResearchTypeInfo {
  name: string;
  count: number;
  color: string;
}

/**
 * Props para el componente ResearchTypes
 */
export interface ResearchTypesProps {
  className?: string;
}

/**
 * Interfaz para la lista de investigaciones en el componente clients/ResearchList
 */
export interface ClientResearch {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
  date: string;
  researcher: string;
}

/**
 * Props para el componente ResearchList
 */
export interface ResearchListProps {
  className?: string;
  data?: ClientResearch[];
}

/**
 * Interfaz para el borrador de investigación (usado en useResearchStore y ResearchProvider)
 */
export interface ResearchDraft {
  id: string;
  step: 'basic' | 'configuration' | 'review';
  data: {
    basic?: {
      title?: string;
      description?: string;
      type?: string;
      name?: string;
      enterprise?: string;
    };
    configuration?: {
      technique?: string;
      [key: string]: unknown;
    };
  };
  lastUpdated: Date;
}

/**
 * Interfaz para el store de investigación
 */
export interface ResearchStore {
  currentDraft: ResearchDraft | null;
  hasDraft: boolean;

  createDraft: () => ResearchDraft;
  updateDraft: (data: Partial<ResearchDraft['data']>, step: ResearchDraft['step']) => void;
  clearDraft: () => void;
  getDraft: () => ResearchDraft | null;
}

/**
 * Interfaz para las secciones del sidebar
 */
export interface ResearchSection {
  id: string;
  title: string;
  stages?: {
    id: string;
    title: string;
  }[];
}

/**
 * Contexto de investigación
 */
export interface ResearchContextType {
  currentDraft: ResearchDraft | null;
  hasDraft: boolean;
  createDraft: () => ResearchDraft;
  updateDraft: (data: Partial<ResearchDraft['data']>, step: ResearchDraft['step']) => void;
  clearDraft: () => void;
  getDraft: () => ResearchDraft | null;
}

/**
 * Props para el componente ResearchSidebar
 */
export interface ResearchSidebarProps {
  researchId?: string;
  activeStage?: string;
  className?: string;
} 