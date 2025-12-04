export interface AvailableFormsResponse {
  steps: string[];
  stepsConfiguration: StepConfiguration[];
  researchId: string;
  count: number;
}

export interface StepConfiguration {
  questionKey: string;
  contentConfiguration: Record<string, unknown>;
}

// 🎯 ALINEADO CON BACKEND: IndividualResponseSchema
export interface IndividualResponse {
  questionKey: string;
  response: unknown; // ModuleResponseValueSchema permite string | array | number | boolean | record | null
  timestamp: string; // ISO date string
  createdAt: string; // ISO date string - cuando se creó
  updatedAt?: string; // ISO date string - última actualización
  metadata?: ResponseMetadata;
}

// 🎯 ALINEADO CON BACKEND: ResponseMetadata
export interface ResponseMetadata {
  deviceInfo?: {
    deviceType?: 'mobile' | 'tablet' | 'desktop';
    userAgent?: string;
    screenWidth?: number;
    screenHeight?: number;
    platform?: string;
    language?: string;
  };
  locationInfo?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
    region?: string;
    ipAddress?: string;
  };
  timingInfo?: {
    startTime?: number;
    endTime?: number;
    duration?: number;
    sectionTimings?: Array<{
      sectionId: string;
      startTime: number;
      endTime?: number;
      duration?: number;
    }>;
  };
  sessionInfo?: {
    reentryCount?: number;
    sessionStartTime?: number;
    lastVisitTime?: number;
    totalSessionTime?: number;
    isFirstVisit?: boolean;
  };
  technicalInfo?: {
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    connectionType?: string;
    timezone?: string;
  };
  // 🎯 EXTENSIÓN PARA DESCALIFICACIÓN (se mantiene en metadata personalizada)
  [key: string]: unknown; // Permitir propiedades adicionales para casos especiales
}

// 🎯 ALINEADO CON BACKEND: ParticipantResponsesDocumentSchema
export interface ParticipantResponsesDocument {
  id: string; // UUID del documento
  researchId: string; // ID del research
  participantId: string; // ID del participante
  responses: IndividualResponse[]; // Array de respuestas individuales
  metadata: ResponseMetadata; // Metadata global del documento
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  isCompleted: boolean; // Indica si todas las respuestas están completas
  quotaResult?: {
    status: 'QUALIFIED' | 'DISQUALIFIED_OVERQUOTA';
    order: number;
    quotaLimit: number;
  }; // 🎯 RESULTADO DE VERIFICACIÓN DE CUOTA
}

// 🎯 ALINEADO CON BACKEND: CreateModuleResponseDtoSchema
export interface CreateModuleResponseDto {
  researchId: string;
  participantId: string;
  questionKey: string;
  responses: IndividualResponse[];
  metadata: ResponseMetadata;
}

// 🎯 ALINEADO CON BACKEND: UpdateModuleResponseDtoSchema
export interface UpdateModuleResponseDto {
  researchId: string;
  participantId: string;
  questionKey: string;
  responses: IndividualResponse[];
  metadata: ResponseMetadata;
}

// 🎯 ALINEADO CON BACKEND: InternalUser interface
export interface InternalUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'researcher' | 'user' | 'participant';
  isActive: boolean;
  isVerified: boolean;
  permissions?: string[];
  preferences?: {
    language: string;
    notifications: boolean;
    theme: string;
  };
  lastLogin?: number;
  loginCount: number;
  createdAt: number;
  updatedAt: number;
}

// 🎯 ALINEADO CON BACKEND: LoginCredentialsDto
export interface LoginCredentialsDto {
  email: string;
  password: string;
}

// 🎯 ALINEADO CON BACKEND: CreateUserDto
export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'researcher' | 'user' | 'participant';
  permissions?: string[];
  preferences?: {
    language?: string;
    notifications?: boolean;
    theme?: string;
  };
}

// 🎯 ALINEADO CON BACKEND: JwtPayload
export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'researcher' | 'user' | 'participant';
  researchId?: string; // ID de la investigación para participantes
  iat?: number;
  exp?: number;
  sub?: string;
}

// 🎯 BACKWARD COMPATIBILITY: Alias para ModuleResponse (usado en hooks y routes)
export type ModuleResponse = IndividualResponse;

export interface ApiResponse<T = Record<string, unknown>> {
  data: T;
  status: number;
  message?: string;
}
