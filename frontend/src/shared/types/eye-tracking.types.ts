/**
 * Eye Tracking Types - Frontend-specific eye tracking types
 */

// Re-export eye tracking types from shared interfaces
export * from '../interfaces/eye-tracking.interface';
export * from '../interfaces/eyeTrackingRecruit.interface';

// Frontend-specific eye tracking types

import type { EyeTrackingRecruitConfig } from '../interfaces/eyeTrackingRecruit.interface';

// Eye tracking data management
export interface EyeTrackingData {
  id: string;
  researchId: string;
  buildConfig?: EyeTrackingBuildConfig;
  recruitConfig?: EyeTrackingRecruitConfig;
  results?: EyeTrackingResults;
  build?: EyeTrackingBuildConfig;
  recruit?: EyeTrackingRecruitConfig;
  createdAt: string;
  updatedAt: string;
}

export interface EyeTrackingBuildConfig {
  id?: string;
  researchId: string;
  status: 'draft' | 'configured' | 'active' | 'completed';
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
    id: string;
    url: string;
    type: string;
    duration?: number;
  }>;
  validationErrors?: string[];
}

export interface EyeTrackingRecruitConfigExtended {
  status: 'draft' | 'active' | 'paused' | 'completed';
  participantCount: number;
  targetParticipants: number;
  completionRate: number;
  lastActivity?: string;
}

// Age quota configuration
export interface AgeQuota {
  minAge: number;
  maxAge: number;
  targetCount: number;
  currentCount: number;
  isActive: boolean;
}

// Eye tracking results and analysis
export interface EyeTrackingResults {
  id: string;
  researchId: string;
  participantId: string;
  sessionId: string;
  data: EyeTrackingDataPoint[];
  analysis?: EyeTrackingAnalysis;
  exportedAt?: string;
  createdAt: string;
}

export interface EyeTrackingDataPoint {
  timestamp: number;
  x: number;
  y: number;
  confidence: number;
  stimulusId?: string;
  event?: string;
}

export interface EyeTrackingAnalysis {
  totalFixations: number;
  averageFixationDuration: number;
  scanPathLength: number;
  areasOfInterest: Array<{
    id: string;
    name: string;
    fixations: number;
    timeSpent: number;
    firstFixationTime: number;
  }>;
  heatmapData: Array<{
    x: number;
    y: number;
    intensity: number;
  }>;
}

// Eye tracking form and validation
export interface EyeTrackingFormState {
  step: number;
  data: Record<string, unknown>;
  validation: EyeTrackingValidation;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface EyeTrackingValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// Eye tracking export and import
export interface EyeTrackingExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeRawData: boolean;
  includeAnalysis: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface EyeTrackingImportOptions {
  format: 'csv' | 'json' | 'xlsx';
  mapping: Record<string, string>;
  validation: boolean;
}

// Eye tracking error handling
export interface EyeTrackingError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// Eye tracking analysis options
export interface EyeTrackingAnalysisOptions {
  smoothing: boolean;
  fixationThreshold: number;
  saccadeThreshold: number;
  areasOfInterest: Array<{
    id: string;
    name: string;
    coordinates: Array<{ x: number; y: number }>;
  }>;
}

// Eye tracking device configuration
export interface EyeTrackingDeviceConfig {
  type: 'webcam' | 'tobii' | 'eyelink' | 'pupil';
  settings: {
    sampleRate: number;
    accuracy: number;
    latency: number;
  };
  calibration: {
    points: number;
    validation: boolean;
    threshold: number;
  };
}

// Eye tracking session management
export interface EyeTrackingSession {
  id: string;
  researchId: string;
  participantId: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  startTime: string;
  endTime?: string;
  duration?: number;
  dataPoints: number;
  lastDataPoint?: string;
}

// Eye tracking real-time data
export interface EyeTrackingRealTimeData {
  timestamp: number;
  x: number;
  y: number;
  confidence: number;
  stimulusId?: string;
  event?: string;
  sessionId: string;
}

// Eye tracking API responses
export interface EyeTrackingApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface EyeTrackingListResponse {
  success: boolean;
  data: EyeTrackingData[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Eye tracking hooks return types
export interface UseEyeTrackingDataReturn {
  data: EyeTrackingData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseEyeTrackingListReturn {
  data: EyeTrackingData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

// Eye tracking form data (extended from shared)
export interface EyeTrackingFormDataExtended {
  id?: string;
  status?: 'draft' | 'active' | 'completed';
  participantCount?: number;
  completionRate?: number;
  lastActivity?: string;
}
