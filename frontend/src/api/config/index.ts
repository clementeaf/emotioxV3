/**
 * API Configuration Barrel Export
 * Consolidates all API configuration into a single import point
 */

// Re-export everything from api.ts (main API configuration)
export {
  API_BASE_URL,
  WS_BASE_URL,
  SECURE_API_BASE_URL,
  API_ENDPOINTS,
  ApiClient,
  ApiError,
  apiClient,
  moduleResponsesAPI,
  getApiUrl,
  getWebsocketUrl,
  getPublicTestsUrl,
  validateApiConfiguration
} from './api';

export type {
  ApiCategory,
  ApiOperation
} from './api';

// Re-export axios configuration
export {
  getAuthToken,
  updateApiToken
} from './axios';

// Export the main apiClient as default for backward compatibility
export { apiClient as default } from './api';