// Interfaces para EyeTracking en la sección Build
export interface EyeTrackingConfig {
  active: boolean;
  device: string;
  sampleRate: number;
  options: {
    calibration: boolean;
    validation: boolean;
    recordAudio: boolean;
    recordVideo: boolean;
    realTimeVisualization: boolean;
  };
}

// Interfaces para EyeTracking en la sección Recruit
export interface EyeTrackingRecruitConfig {
  // Identificador único
  id?: string;
  
  // Información básica
  researchId: string;
  
  // Preguntas demográficas para calificar participantes
  demographicQuestions: {
    age: boolean;
    country: boolean;
    gender: boolean;
    educationLevel: boolean;
    householdIncome: boolean;
    employmentStatus: boolean;
    dailyHoursOnline: boolean;
    technicalProficiency: boolean;
  };
  
  // Configuración del enlace
  linkConfig: {
    allowMobileDevices: boolean;
    trackLocation: boolean;
    allowMultipleAttempts: boolean;
  };
  
  // Límite de participantes
  participantLimit: {
    enabled: boolean;
    value: number;
  };
  
  // Enlaces de retorno
  backlinks: {
    complete: string;
    disqualified: string;
    overquota: string;
  };
  
  // URL de investigación para compartir
  researchUrl: string;
  
  // Parámetros a guardar
  parameterOptions: {
    saveDeviceInfo: boolean;
    saveLocationInfo: boolean;
    saveResponseTimes: boolean;
    saveUserJourney: boolean;
  };
}

// Interfaces para las estadísticas de reclutamiento
export interface EyeTrackingRecruitStats {
  complete: {
    count: number;
    percentage: number;
    label: string;
    description: string;
  };
  disqualified: {
    count: number;
    percentage: number;
    label: string;
    description: string;
  };
  overquota: {
    count: number;
    percentage: number;
    label: string;
    description: string;
  };
}

// Interfaz para los enlaces generados
export interface RecruitmentLink {
  id: string;
  token: string;
  url: string;
  qrCode?: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  accessCount: number;
  conversionCount: number;
}

// Interfaces para respuestas de la API
export interface EyeTrackingRecruitResponse {
  success: boolean;
  data?: EyeTrackingRecruitConfig;
  stats?: EyeTrackingRecruitStats;
  error?: string;
}

// Interfaz para respuesta de enlace
export interface LinkResponse {
  success: boolean;
  data?: {
    link: string;
    token?: string;
    qrCode?: string;
  };
  error?: string;
}

// Interfaz para respuesta de código QR
export interface QRResponse {
  success: boolean;
  data?: {
    qrCode?: string;
    url?: string;
    qrImageUrl?: string;
  };
  error?: string;
}

// Interfaces para las solicitudes de la API
export interface EyeTrackingRecruitRequest {
  researchId: string;
  config: Omit<EyeTrackingRecruitConfig, 'researchId'>;
}

// Tipos para las opciones del formulario
export type DemographicQuestionKey = 
  | 'age' 
  | 'country' 
  | 'gender' 
  | 'educationLevel' 
  | 'householdIncome' 
  | 'employmentStatus' 
  | 'dailyHoursOnline' 
  | 'technicalProficiency';

export type LinkConfigKey = 
  | 'allowMobileDevices'
  | 'trackLocation'
  | 'allowMultipleAttempts';

export type ParameterOptionKey = 
  | 'saveDeviceInfo' 
  | 'saveLocationInfo' 
  | 'saveResponseTimes' 
  | 'saveUserJourney';

export type BacklinkKey = 
  | 'complete' 
  | 'disqualified' 
  | 'overquota'; 