/**
 * Eye Tracking Types - Centralized type definitions for eye tracking functionality
 * Re-exports from shared interfaces and defines frontend-specific types
 */

// Re-export eye tracking types from shared interfaces
export * from '../../../shared/interfaces/eye-tracking.interface';
export * from '../../../shared/interfaces/eyeTrackingRecruit.interface';

// Frontend-specific eye tracking types

// Eye tracking data management
export interface EyeTrackingData {
  id: string;
  researchId: string;
  buildConfig?: EyeTrackingBuildConfig;
  recruitConfig?: EyeTrackingRecruitFormDataLocal;
  results?: EyeTrackingResults;
  build?: EyeTrackingBuildConfig;
  recruit?: EyeTrackingRecruitFormDataLocal;
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

export interface EyeTrackingRecruitConfigExtended extends EyeTrackingRecruitFormDataLocal {
  status: 'draft' | 'active' | 'paused' | 'completed';
  generatedLink?: string;
  participantCount?: number;
  completedCount?: number;
}

export interface EyeTrackingResults {
  researchId: string;
  participants: EyeTrackingParticipantResult[];
  aggregatedData: EyeTrackingAggregatedData;
  visualizations: EyeTrackingVisualization[];
  exportFormats: string[];
}

export interface EyeTrackingParticipantResult {
  participantId: string;
  sessionId: string;
  gazeData: GazePoint[];
  fixations: Fixation[];
  saccades: Saccade[];
  aoiData: AOIData[];
  heatmapData: HeatmapPoint[];
  metadata: {
    sessionDuration: number;
    calibrationAccuracy: number;
    dataQuality: 'high' | 'medium' | 'low';
    deviceInfo: DeviceInfo;
  };
}

export interface GazePoint {
  timestamp: number;
  x: number;
  y: number;
  stimulusId: string;
  confidence: number;
}

export interface Fixation {
  id: string;
  startTime: number;
  duration: number;
  x: number;
  y: number;
  stimulusId: string;
}

export interface Saccade {
  id: string;
  startTime: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  velocity: number;
  amplitude: number;
}

export interface AOIData {
  aoiId: string;
  participantId: string;
  fixationCount: number;
  totalDwellTime: number;
  firstFixationTime: number;
  averageFixationDuration: number;
  visitCount: number;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
  stimulusId: string;
}

export interface DeviceInfo {
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  browser: string;
  browserVersion: string;
  operatingSystem: string;
}

export interface EyeTrackingAggregatedData {
  totalParticipants: number;
  averageSessionDuration: number;
  averageFixationDuration: number;
  averageSaccadeVelocity: number;
  stimulusSummary: StimulusSummary[];
  aoiSummary: AOISummary[];
}

export interface StimulusSummary {
  stimulusId: string;
  fileName: string;
  totalViewingTime: number;
  averageViewingTime: number;
  uniqueViewers: number;
  popularAreas: PopularArea[];
}

export interface AOISummary {
  aoiId: string;
  name: string;
  stimulusId: string;
  averageDwellTime: number;
  viewerCount: number;
  attentionPercentage: number;
}

export interface PopularArea {
  x: number;
  y: number;
  width: number;
  height: number;
  popularity: number;
}

export interface EyeTrackingVisualization {
  type: 'heatmap' | 'gazepath' | 'aoiChart' | 'timeline';
  stimulusId: string;
  data: Record<string, unknown>;
  metadata: {
    participantFilter?: string[];
    timeRange?: [number, number];
    settings: Record<string, unknown>;
  };
}

// Hook return types
export interface UseEyeTrackingDataOptions {
  includeBuild?: boolean;
  includeRecruit?: boolean;
  includeResults?: boolean;
  autoRefresh?: boolean;
  enabled?: boolean;
  type?: string;
}

export interface UseEyeTrackingDataReturn {
  // Data
  data?: EyeTrackingData;
  eyeTrackingData: EyeTrackingData | null;
  buildConfig: EyeTrackingBuildConfig | null;
  recruitConfig: EyeTrackingRecruitFormDataLocal | null;
  results: EyeTrackingResults | null;
  
  // State
  isLoading: boolean;
  isLoadingBuild: boolean;
  isLoadingRecruit: boolean;
  isLoadingResults: boolean;
  error: string | null;
  
  // Actions
  saveBuildConfig: (config: Partial<EyeTrackingBuildConfig>) => Promise<void>;
  saveRecruitConfig: (config: Partial<EyeTrackingRecruitFormDataLocal>) => Promise<void>;
  generateRecruitmentLink: () => Promise<string>;
  exportResults: (format: 'csv' | 'json' | 'xlsx') => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Validation
  validateBuildConfig: () => string[];
  validateRecruitConfig: () => string[];
}

// Form data types for frontend components - using types from shared interfaces
// Note: DemographicQuestions, LinkConfig, etc. are exported from eyeTrackingRecruit.interface.ts
export interface EyeTrackingRecruitFormDataLocal {
  id?: string;
  researchId: string;
  demographicQuestions: {
    age?: { enabled: boolean; required: boolean; };
    country?: { enabled: boolean; required: boolean; };
    gender?: { enabled: boolean; required: boolean; };
  };
  linkConfig: {
    allowMobile: boolean;
    trackLocation: boolean;
    allowMultipleAttempts: boolean;
  };
  participantLimit: {
    enabled: boolean;
    value: number;
  };
  backlinks: {
    complete: string;
    disqualified: string;
    overquota: string;
  };
  researchUrl: string;
  parameterOptions: {
    saveDeviceInfo: boolean;
    saveLocationInfo: boolean;
    saveResponseTimes: boolean;
    saveUserJourney: boolean;
  };
}

// Additional utility types
export type EyeTrackingStage = 'build' | 'recruit' | 'results';

export interface EyeTrackingError {
  stage: EyeTrackingStage;
  field?: string;
  message: string;
  code?: string;
}

export interface EyeTrackingValidation {
  isValid: boolean;
  errors: EyeTrackingError[];
  warnings: string[];
}

// Export format options
export interface EyeTrackingExportOptions {
  format: 'csv' | 'json' | 'xlsx' | 'pdf';
  includeRawData: boolean;
  includeVisualizations: boolean;
  participantFilter?: string[];
  stimulusFilter?: string[];
  timeRange?: [number, number];
}

// Analysis options
export interface EyeTrackingAnalysisOptions {
  includeHeatmaps: boolean;
  includeGazePaths: boolean;
  includeAOIAnalysis: boolean;
  includeComparisons: boolean;
  fixationThreshold: number;
  saccadeVelocityThreshold: number;
}