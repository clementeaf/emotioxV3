/**
 * Cognitive Task Domain Barrel Export
 * Central export point for cognitive task domain
 */

// Export API methods
export { cognitiveTaskApi } from './cognitive-task.api';

// Export hooks
export {
  cognitiveTaskKeys,
  useCognitiveTaskData,
  useCognitiveTaskValidation,
  useCreateCognitiveTask,
  useUpdateCognitiveTask,
  useDeleteCognitiveTask
} from './cognitive-task.hooks';

// Export types
export type {
  ApiResponse,
  CognitiveTaskFormData,
  CognitiveTaskModel,
  CognitiveTaskFormResponse,
  CognitiveTaskResult,
  Question,
  QuestionType,
  Choice,
  CreateCognitiveTaskRequest,
  UpdateCognitiveTaskRequest,
  ValidationResponse
} from './cognitive-task.types';