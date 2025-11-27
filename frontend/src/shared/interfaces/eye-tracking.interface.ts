/**
 * Eye Tracking Interfaces
 * Defines the data structure for eye tracking configuration and data
 */

// Basic validation rules for eye tracking
export const EYE_TRACKING_VALIDATION = {
  samplingRate: {
    min: 30,
    max: 120
  },
  fixationThreshold: {
    min: 50,
    max: 200
  },
  saccadeVelocityThreshold: {
    min: 20,
    max: 100
  },
  durationPerStimulus: {
    min: 1,
    max: 60
  }
};

// Tracking device options
export type TrackingDeviceType = 'webcam' | 'tobii' | 'gazepoint' | 'eyetech';

// Presentation sequence options
export type PresentationSequenceType = 'sequential' | 'random' | 'custom';

// Basic eye tracking configuration
export interface EyeTrackingConfig {
  enabled: boolean;
  trackingDevice: TrackingDeviceType;
  calibration: boolean;
  validation: boolean;
  recording: {
    audio: boolean;
    video: boolean;
  };
  visualization: {
    showGaze: boolean;
    showFixations: boolean;
    showSaccades: boolean;
    showHeatmap: boolean;
  };
  parameters: {
    samplingRate: number;
    fixationThreshold: number;
    saccadeVelocityThreshold: number;
  };
}

// Stimulus item
export interface EyeTrackingStimulus {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  order: number;
  s3Key?: string;  // Clave del objeto en S3
  error?: boolean; // Indica si hubo un error al cargar
  errorMessage?: string; // Mensaje de error durante la carga
}

// Area of Interest
export interface EyeTrackingAreaOfInterest {
  id: string;
  name: string;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  stimulusId: string;
}

// Stimuli configuration
export interface EyeTrackingStimuliConfig {
  presentationSequence: PresentationSequenceType;
  durationPerStimulus: number;
  items: EyeTrackingStimulus[];
}

// Areas of Interest configuration
export interface EyeTrackingAreaOfInterestConfig {
  enabled: boolean;
  areas: EyeTrackingAreaOfInterest[];
}

// Complete Eye Tracking form data
export interface EyeTrackingFormData {
  researchId: string;
  config: EyeTrackingConfig;
  stimuli: EyeTrackingStimuliConfig;
  areasOfInterest: EyeTrackingAreaOfInterestConfig;
  deviceFrame: boolean;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    lastModifiedBy?: string;
  };
}

// Eye Tracking model for database storage (extends form data with ID)
export interface EyeTrackingModel extends EyeTrackingFormData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Response from server when saving eye tracking configuration
export interface EyeTrackingFormResponse {
  data?: EyeTrackingFormData;
  id?: string;
  success?: boolean;
  error?: string;
}

// Default values for a new eye tracking configuration
export const DEFAULT_EYE_TRACKING_CONFIG: EyeTrackingFormData = {
  researchId: '',
  config: {
    enabled: true,
    trackingDevice: 'webcam',
    calibration: true,
    validation: true,
    recording: {
      audio: false,
      video: true
    },
    visualization: {
      showGaze: true,
      showFixations: true,
      showSaccades: true,
      showHeatmap: true
    },
    parameters: {
      samplingRate: 60,
      fixationThreshold: 100,
      saccadeVelocityThreshold: 30
    }
  },
  stimuli: {
    presentationSequence: 'sequential',
    durationPerStimulus: 5,
    items: []
  },
  areasOfInterest: {
    enabled: true,
    areas: []
  },
  deviceFrame: false
}; 