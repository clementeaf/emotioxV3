/**
 * Smart VOC Domain Types
 * Type definitions for smart VOC functionality
 */

// Re-export from shared interfaces
export type {
  SmartVOCFormData,
  SmartVOCFormResponse,
  SmartVOCQuestion,
  QuestionConfig,
  QuestionConfigBase,
  CSATConfig,
  CESConfig,
  CVConfig,
  NEVConfig,
  NPSConfig,
  VOCConfig,
  ConditionalLogic
} from '../../../../../shared/interfaces/smart-voc.interface';

// Import for local use
import type { SmartVOCQuestion } from '../../../../../shared/interfaces/smart-voc.interface';

// API Response wrapper
export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  message?: string;
}

// Request types for API
export interface CreateSmartVOCRequest {
  researchId: string;
  questions: SmartVOCQuestion[];
  randomizeQuestions: boolean;
  smartVocRequired: boolean;
  metadata?: {
    estimatedCompletionTime?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface UpdateSmartVOCRequest {
  questions?: SmartVOCQuestion[];
  randomizeQuestions?: boolean;
  smartVocRequired?: boolean;
  metadata?: {
    estimatedCompletionTime?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

// Validation response
export interface ValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}