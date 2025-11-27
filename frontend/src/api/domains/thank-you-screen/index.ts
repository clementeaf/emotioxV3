/**
 * Thank You Screen Domain Barrel Export
 * Central export point for thank you screen domain
 */

// Export API methods
export { thankYouScreenApi } from './thank-you-screen.api';

// Export hooks
export {
  thankYouScreenKeys,
  useThankYouScreenData,
  useThankYouScreenValidation,
  useCreateThankYouScreen,
  useUpdateThankYouScreen,
  useDeleteThankYouScreen
} from './thank-you-screen.hooks';

// Export types
export type {
  ApiResponse,
  ThankYouScreenModel,
  ThankYouScreenFormData,
  ThankYouScreenConfig,
  CreateThankYouScreenRequest,
  UpdateThankYouScreenRequest,
  ValidationResponse
} from './thank-you-screen.types';