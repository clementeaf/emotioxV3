/**
 * Interface for Thank You Screen Configuration
 */
export interface ThankYouScreenConfig {
  // Whether the thank you screen is enabled
  isEnabled: boolean;
  
  // Title displayed on the thank you screen
  title: string;
  
  // Message displayed on the thank you screen
  message: string;
  
  // Optional URL to redirect after showing the thank you screen
  redirectUrl?: string;
  
  // Metadata (version, etc)
  metadata?: {
    version: string;
    [key: string]: unknown;
  };
}

/**
 * Interface for Thank You Screen Model stored in DynamoDB
 */
export interface ThankYouScreenModel extends ThankYouScreenConfig {
  // Primary key
  id: string;
  
  // Research ID this thank you screen belongs to
  researchId: string;
  
  // Creation and update timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Data structure for creating or updating a Thank You Screen
 */
export interface ThankYouScreenFormData extends ThankYouScreenConfig {
  // ID of the research this screen is associated with
  researchId?: string;
}

/**
 * Response structure when retrieving or modifying a Thank You Screen
 */
export interface ThankYouScreenResponse {
  // Unique identifier of the saved screen
  id?: string;
  
  // The thank you screen data
  data?: ThankYouScreenConfig;
  
  // Success indicator
  success?: boolean;
  
  // Error message if applicable
  error?: string;
  
  // Flag indicating if the requested resource was not found
  notFound?: boolean;
}

/**
 * Validation rules for Thank You Screen fields
 */
export const DEFAULT_THANK_YOU_SCREEN_VALIDATION = {
  title: {
    minLength: 3,
    maxLength: 100,
    required: true
  },
  message: {
    minLength: 10,
    maxLength: 1000,
    required: true
  },
  redirectUrl: {
    minLength: 5,
    maxLength: 2048,
    required: false,
    pattern: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i
  }
};

/**
 * Default Thank You Screen configuration
 */
export const DEFAULT_THANK_YOU_SCREEN_CONFIG: ThankYouScreenConfig = {
  isEnabled: true,
  title: 'Thank You for Participating',
  message: 'We appreciate your time and valuable feedback. Your responses have been recorded successfully.',
  redirectUrl: '',
  metadata: {
    version: '1.0.0'
  }
}; 