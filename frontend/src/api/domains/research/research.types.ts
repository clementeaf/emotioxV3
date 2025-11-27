/**
 * Research Domain Types
 */

// Re-export types from existing research types
// export type {
//   Research,
//   UpdateResearchRequest,
//   ResearchAPIResponse,
//   ResearchListResponse,
//   ResearchRecord,
//   ResearchConfig,
//   ResearchFormData,
//   ResearchCreationResponse,
//   ResearchBasicData
// } from '@/shared/types/research.types'; // Comentado - tipos no existen

// Import the correct backend type for API calls
export type { CreateResearchRequest } from '../../../../../shared/types/backend-core.types';

export type { ResearchType, ResearchStatus } from '@/shared/types/research.types';

// Additional research-specific types for the domain
export interface ResearchFilters {
  status?: string;
  type?: string;
  search?: string;
}

export interface ResearchListParams {
  page?: number;
  limit?: number;
  filters?: ResearchFilters;
}

export interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}