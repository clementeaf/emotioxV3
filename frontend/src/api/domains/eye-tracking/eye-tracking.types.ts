/**
 * Eye-Tracking Domain Types
 * Strict typing for eye-tracking functionality
 */

// Re-export types from existing eye-tracking types
export type {
  EyeTrackingData,
  EyeTrackingBuildConfig,
  EyeTrackingRecruitConfigExtended,
  EyeTrackingResults,
  UseEyeTrackingDataReturn,
  EyeTrackingError,
  EyeTrackingValidation,
  EyeTrackingExportOptions,
  EyeTrackingAnalysisOptions,
  EyeTrackingFormData
} from '@/shared/types/eye-tracking.types';

// Import recruit types from shared interfaces
import type {
  EyeTrackingRecruitConfig,
  EyeTrackingRecruitParticipant,
  EyeTrackingRecruitStats,
  GenerateRecruitmentLinkResponse,
  CreateEyeTrackingRecruitRequest,
  UpdateEyeTrackingRecruitRequest
} from '../../../../../shared/interfaces/eyeTrackingRecruit.interface';

import { RecruitLinkType } from '../../../../../shared/interfaces/eyeTrackingRecruit.interface';

// Re-export recruit types
export type {
  EyeTrackingRecruitConfig,
  EyeTrackingRecruitParticipant,
  EyeTrackingRecruitStats,
  GenerateRecruitmentLinkResponse,
  CreateEyeTrackingRecruitRequest,
  UpdateEyeTrackingRecruitRequest
};

export { RecruitLinkType };

// API Response types with strict typing
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

export interface ApiError {
  response?: {
    data?: {
      message?: string;
      error?: string;
      details?: any;
    };
    status?: number;
  };
  message?: string;
}

// Request parameter types
export interface EyeTrackingListParams {
  page?: number;
  limit?: number;
  status?: 'draft' | 'configured' | 'active' | 'completed';
  researchId?: string;
}

// Recruitment Link type for internal use
export interface RecruitmentLink {
  id?: string;
  token: string;
  configId: string;
  researchId: string;
  type: RecruitLinkType;
  createdAt: Date;
  expiresAt?: Date;
  lastAccessedAt?: Date;
  isActive: boolean;
}

// File upload types
export interface UploadStimuliResponse {
  urls: string[];
  uploadedFiles: Array<{
    filename: string;
    url: string;
    size: number;
    type: string;
  }>;
}

// Export formats for results
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf';

// Validation response
export interface ValidationResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Build stage specific types
export interface EyeTrackingBuildRequest {
  researchId: string;
  calibration?: {
    enabled: boolean;
    points: number;
    validationEnabled: boolean;
  };
  settings?: {
    sampleRate: number;
    smoothing: boolean;
    accuracy: string;
    duration: number;
  };
  stimuli?: Array<{
    url: string;
    type: string;
    duration?: number;
  }>;
}

export interface EyeTrackingBuildUpdateRequest {
  calibration?: Partial<EyeTrackingBuildRequest['calibration']>;
  settings?: Partial<EyeTrackingBuildRequest['settings']>;
  stimuli?: EyeTrackingBuildRequest['stimuli'];
  status?: 'draft' | 'configured' | 'active' | 'completed';
}

// Results specific types
export interface ParticipantResultsParams {
  researchId: string;
  participantId: string;
  includeRawData?: boolean;
  includeVisualizations?: boolean;
}

export interface ResultsExportParams {
  format: ExportFormat;
  includeRawData?: boolean;
  includeVisualizations?: boolean;
  participantFilter?: string[];
  stimulusFilter?: string[];
}