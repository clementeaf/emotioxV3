/**
 * Smart VOC Domain Barrel Export
 * Central export point for smart VOC domain
 */

// Export API methods
export { smartVocApi } from './smart-voc.api';

// Export hooks
export {
  smartVocKeys,
  useSmartVOCData,
  useSmartVOCValidation,
  useCreateSmartVOC,
  useUpdateSmartVOC,
  useDeleteSmartVOC
} from './smart-voc.hooks';

// Export types
export type {
  ApiResponse,
  SmartVOCFormData,
  SmartVOCFormResponse,
  SmartVOCQuestion,
  QuestionConfig,
  CreateSmartVOCRequest,
  UpdateSmartVOCRequest,
  ValidationResponse
} from './smart-voc.types';