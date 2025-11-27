/**
 * Welcome Screen Domain Types
 * Type definitions for welcome screen functionality
 */

// Re-export from shared interfaces
export type {
  WelcomeScreenConfig,
  WelcomeScreenRecord,
  WelcomeScreenFormData,
  WelcomeScreenUpdate
} from '../../../../../shared/interfaces/welcome-screen.interface';

// API Response wrapper
export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  message?: string;
}

// Request types for API
export interface CreateWelcomeScreenRequest {
  researchId: string;
  isEnabled: boolean;
  title: string;
  message: string;
  startButtonText: string;
  questionKey?: string;
  metadata?: {
    version?: string;
    [key: string]: any;
  };
}

export interface UpdateWelcomeScreenRequest {
  isEnabled?: boolean;
  title?: string;
  message?: string;
  startButtonText?: string;
  metadata?: {
    version?: string;
    [key: string]: any;
  };
}

// Validation response
export interface ValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Model type for API responses
export interface WelcomeScreenModel {
  id: string;
  researchId: string;
  isEnabled: boolean;
  title: string;
  message: string;
  startButtonText: string;
  questionKey?: string;
  metadata?: {
    version?: string;
    lastUpdated?: string;
    lastModifiedBy?: string;
    isDefault?: boolean;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
}

