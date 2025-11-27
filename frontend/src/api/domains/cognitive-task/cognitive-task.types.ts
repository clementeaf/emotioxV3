/**
 * Cognitive Task Domain Types
 * Type definitions for cognitive task functionality
 */

// Re-export from shared interfaces
export type {
  CognitiveTaskFormData,
  CognitiveTaskModel,
  CognitiveTaskFormResponse,
  CognitiveTaskResult,
  Question,
  QuestionType,
  Choice,
  ScaleConfig,
  UploadedFile,
  QuestionTypeInfo
} from '../../../../../shared/interfaces/cognitive-task.interface';

// Import for local use
import type { CognitiveTaskFormData, Question } from '../../../../../shared/interfaces/cognitive-task.interface';

// API Response wrapper
export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  message?: string;
}

// Request types for API
export interface CreateCognitiveTaskRequest {
  researchId: string;
  questions: Question[];
  randomizeQuestions: boolean;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    lastModifiedBy?: string;
    version?: string;
    lastUpdated?: string;
  };
  title?: string;
  description?: string;
}

export interface UpdateCognitiveTaskRequest {
  questions?: Question[];
  randomizeQuestions?: boolean;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    lastModifiedBy?: string;
    version?: string;
    lastUpdated?: string;
  };
  title?: string;
  description?: string;
}

// Validation response
export interface ValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}