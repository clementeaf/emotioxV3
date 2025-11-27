
import { QuestionType } from './question-types.enum';

/**
 * Interface definitions for Smart VOC (Voice of Customer) feature
 */

/**
 * Base configuration for all question types
 */
export interface QuestionConfigBase {
  /**
   * Input type for the question
   */
  type?: 'stars' | 'numbers' | 'emojis' | 'scale' | 'text';

  /**
   * Scale range configuration for questions with scale type
   */
  scaleRange?: {
    start: number;
    end: number;
  };

  /**
   * Company name for questions that reference a company
   */
  companyName?: string;

  /**
   * Start label for scale questions (e.g. "Not at all")
   */
  startLabel?: string;

  /**
   * End label for scale questions (e.g. "Very much")
   */
  endLabel?: string;
}

/**
 * Specific configuration for CSAT questions
 */
export interface CSATConfig extends QuestionConfigBase {
  type: 'stars' | 'numbers' | 'emojis';
  companyName: string;
}

/**
 * Specific configuration for CES questions
 */
export interface CESConfig extends QuestionConfigBase {
  type: 'scale';
  scaleRange: {
    start: number;
    end: number;
  };
}

/**
 * Specific configuration for CV questions
 */
export interface CVConfig extends QuestionConfigBase {
  type: 'scale';
  scaleRange: {
    start: number;
    end: number;
  };
  startLabel?: string;
  endLabel?: string;
}

/**
 * Specific configuration for NEV questions
 */
export interface NEVConfig extends QuestionConfigBase {
  type: 'emojis';
  companyName: string;
  emotions?: string[];
}

/**
 * Specific configuration for NPS questions
 */
export interface NPSConfig extends QuestionConfigBase {
  type: 'scale';
  scaleRange: {
    start: number;
    end: number;
  };
  companyName: string;
}

/**
 * Specific configuration for VOC questions
 */
export interface VOCConfig extends QuestionConfigBase {
  type: 'text';
  maxLength?: number;
}

/**
 * Union type for all possible question configurations
 */
export type QuestionConfig = CSATConfig | CESConfig | CVConfig | NEVConfig | NPSConfig | VOCConfig | QuestionConfigBase;

/**
 * Question in the Smart VOC form
 */
export interface SmartVOCQuestion {
  /**
   * Unique identifier for the question
   */
  id: string;

  /**
   * Type of question using the global QuestionType enum
   */
  type: QuestionType;

  /**
   * Title of the question
   */
  title: string;

  /**
   * Description/text of the question
   */
  description: string;

  /**
   * Optional instructions or additional information for participants
   */
  instructions?: string;

  /**
   * Whether this question is required
   */
  required?: boolean;

  /**
   * Whether this question should be shown conditionally
   */
  showConditionally: boolean;

  /**
   * Configuration specific to the question type
   */
  config: QuestionConfig;

  /**
   * Optional module response ID
   */
  moduleResponseId?: string;

  /**
   * Question key for identification
   */
  questionKey?: string;
}

/**
 * Configuration for conditional display of questions
 * (Reserved for future implementation)
 */
export interface ConditionalLogic {
  /**
   * ID of the question this condition depends on
   */
  questionId: string;

  /**
   * Operator for the condition
   */
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';

  /**
   * Value to compare against
   */
  value: string | number;
}

/**
 * Complete Smart VOC form configuration
 */
export interface SmartVOCFormData {
  /**
   * ID of the research this form belongs to
   */
  researchId: string;

  /**
   * Array of questions in the form
   */
  questions: SmartVOCQuestion[];

  /**
   * Whether to randomize the order of questions
   */
  randomizeQuestions: boolean;

  /**
   * Whether the Smart VOC section is required for participants
   */
  smartVocRequired: boolean;

  /**
   * Additional metadata (optional)
   */
  metadata?: {
    /**
     * Estimated completion time in minutes
     */
    estimatedCompletionTime?: string;

    /**
     * Created date
     */
    createdAt?: string;

    /**
     * Last updated date
     */
    updatedAt?: string;
  };
}

/**
 * Response from the server when saving a Smart VOC form
 */
export interface SmartVOCFormResponse {
  /**
   * Unique identifier of the saved form (optional for error responses)
   */
  id?: string;

  /**
   * Success status
   */
  success: boolean;

  /**
   * Error message if any
   */
  error?: string;

  /**
   * Form data that was saved
   */
  data?: SmartVOCFormData;

  /**
   * Flag indicating if the resource was not found
   */
  notFound?: boolean;
}

/**
 * Default values for new Smart VOC form
 */
export const DEFAULT_SMART_VOC_FORM: SmartVOCFormData = {
  researchId: '',
  questions: [
    {
      id: 'csat',
      type: QuestionType.SMARTVOC_CSAT,
      title: 'Customer Satisfaction Score (CSAT)',
      description: 'How would you rate your overall satisfaction level with [company]?',
      showConditionally: false,
      instructions: '',
      config: {
        type: 'stars',
        companyName: ''
      }
    }
  ],
  randomizeQuestions: false,
  smartVocRequired: true,
  metadata: {
    estimatedCompletionTime: '3-5 minutes'
  }
};
