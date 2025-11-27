/**
 * Thank You Screen Domain Types
 * Type definitions for thank you screen functionality
 */

// Re-export from shared interfaces
export type {
  ThankYouScreenModel,
  ThankYouScreenFormData,
  ThankYouScreenConfig
} from '../../../../../shared/interfaces/thank-you-screen.interface';

// API Response wrapper
export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  message?: string;
}

// Request types for API
export interface CreateThankYouScreenRequest {
  researchId: string;
  isEnabled: boolean;
  title: string;
  message: string;
  redirectUrl?: string;
  metadata?: {
    version?: string;
    [key: string]: any;
  };
}

export interface UpdateThankYouScreenRequest {
  isEnabled?: boolean;
  title?: string;
  message?: string;
  redirectUrl?: string;
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