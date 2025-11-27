/**
 * Welcome Screen Domain Barrel Export
 * Central export point for welcome screen domain
 */

// Export API methods
export { welcomeScreenApi } from './welcome-screen.api';

// Export hooks
export {
  welcomeScreenKeys,
  useWelcomeScreenData,
  useWelcomeScreenValidation,
  useCreateWelcomeScreen,
  useUpdateWelcomeScreen,
  useDeleteWelcomeScreen
} from './welcome-screen.hooks';

// Export types
export type {
  ApiResponse,
  WelcomeScreenModel,
  WelcomeScreenConfig,
  WelcomeScreenRecord,
  WelcomeScreenFormData,
  WelcomeScreenUpdate,
  CreateWelcomeScreenRequest,
  UpdateWelcomeScreenRequest,
  ValidationResponse
} from './welcome-screen.types';

