/**
 * Interfaces compartidas para el módulo de reclutamiento de Eye Tracking
 * Este archivo contiene todas las interfaces necesarias para el funcionamiento
 * del módulo de reclutamiento tanto en el frontend como en el backend.
 */

// Tipos para las claves de las preguntas demográficas
export type DemographicQuestionKeys =
  | 'age'
  | 'country'
  | 'gender'
  | 'educationLevel'
  | 'householdIncome'
  | 'employmentStatus'
  | 'dailyHoursOnline'
  | 'technicalProficiency';

// Tipos para las claves de la configuración del enlace
export type LinkConfigKeys =
  | 'allowMobile'
  | 'trackLocation'
  | 'allowMultipleAttempts';

// Tipos para las claves de las opciones de parámetros
export type ParameterOptionKeys =
  | 'saveDeviceInfo'
  | 'saveLocationInfo'
  | 'saveResponseTimes'
  | 'saveUserJourney';

// Estructura para las preguntas demográficas
export interface DemographicQuestions {
  age: {
    enabled: boolean;
    required: boolean;
    options?: string[]; // Rangos de edad predefinidos
    disqualifyingAges?: string[]; // Edades que descalifican
  };
  country: {
    enabled: boolean;
    required: boolean;
    options?: string[]; // Lista de países o "all"
    disqualifyingCountries?: string[]; // Países que descalifican
    priorityCountries?: string[]; // Países con prioridad en el reclutamiento
  };
  gender: {
    enabled: boolean;
    required: boolean;
    options?: string[]; // Lista de opciones de género
    disqualifyingGenders?: string[]; // Géneros que descalifican
  };
  educationLevel: {
    enabled: boolean;
    required: boolean;
    options?: string[]; // Niveles de educación
    disqualifyingEducation?: string[]; // Niveles educativos que descalifican
  };
  householdIncome: {
    enabled: boolean;
    required: boolean;
    options?: string[]; // Rangos de ingresos
    disqualifyingIncomes?: string[]; // Ingresos que descalifican
  };
  employmentStatus: {
    enabled: boolean;
    required: boolean;
    options?: string[]; // Estados de empleo
    disqualifyingEmploymentStatuses?: string[]; // Estados de empleo que descalifican
  };
  dailyHoursOnline: {
    enabled: boolean;
    required: boolean;
    options?: string[]; // Rangos de horas
    disqualifyingHours?: string[]; // Horas que descalifican
  };
  technicalProficiency: {
    enabled: boolean;
    required: boolean;
    options?: string[]; // Niveles de habilidad técnica
    disqualifyingProficiencies?: string[]; // Niveles de competencia que descalifican
  };
}

// Estructura para la configuración del enlace
export interface LinkConfig {
  allowMobile: boolean; // Permitir dispositivos móviles
  trackLocation: boolean; // Rastrear ubicación del participante
  allowMultipleAttempts: boolean; // Permitir múltiples intentos del mismo participante
}

// Estructura para el límite de participantes
export interface ParticipantLimit {
  enabled: boolean; // Habilitar límite de participantes
  value: number; // Número máximo de participantes
}

// Estructura para los enlaces de retorno
export interface Backlinks {
  complete: string; // URL para participantes que completan
  disqualified: string; // URL para participantes descalificados
  overquota: string; // URL para cuando se alcanza el límite de participantes
}

// Estructura para las opciones de parámetros
export interface ParameterOptions {
  saveDeviceInfo: boolean; // Guardar información del dispositivo
  saveLocationInfo: boolean; // Guardar información de ubicación
  saveResponseTimes: boolean; // Guardar tiempos de respuesta
  saveUserJourney: boolean; // Guardar recorrido del usuario
}

// Estructura principal de la configuración de reclutamiento
export interface EyeTrackingRecruitConfig {
  id?: string; // ID de la configuración
  researchId: string; // ID de la investigación relacionada
  demographicQuestions: DemographicQuestions; // Preguntas demográficas
  linkConfig: LinkConfig; // Configuración del enlace
  participantLimit: ParticipantLimit; // Límite de participantes
  backlinks: Backlinks; // Enlaces de retorno
  researchUrl: string; // URL de la investigación
  parameterOptions: ParameterOptions; // Opciones de parámetros
  createdAt?: Date; // Fecha de creación
  updatedAt?: Date; // Fecha de actualización
}

// Elemento para estadísticas
export interface StatisticItem {
  count: number; // Número de participantes
  percentage: number; // Porcentaje del total
}

// Estructura para las estadísticas de reclutamiento
export interface EyeTrackingRecruitStats {
  complete: StatisticItem; // Participantes que completaron
  disqualified: StatisticItem; // Participantes descalificados
  overquota: StatisticItem; // Participantes en exceso de cuota
}

// Estructura para los datos de un participante
export interface EyeTrackingRecruitParticipant {
  id?: string; // ID del participante
  researchId: string; // ID de la investigación
  recruitConfigId: string; // ID de la configuración de reclutamiento
  status: 'complete' | 'disqualified' | 'overquota' | 'inprogress'; // Estado del participante
  demographicData?: { // Datos demográficos del participante
    age?: number;
    country?: string;
    gender?: string;
    educationLevel?: string;
    householdIncome?: string;
    employmentStatus?: string;
    dailyHoursOnline?: number;
    technicalProficiency?: string;
  };
  deviceInfo?: { // Información del dispositivo
    userAgent: string;
    platform: string;
    screenResolution: string;
    browser: string;
    browserVersion: string;
  };
  locationInfo?: { // Información de ubicación
    country: string;
    city: string;
    region: string;
  };
  startedAt: Date; // Fecha de inicio
  completedAt?: Date; // Fecha de finalización
  sessionDuration?: number; // Duración de la sesión en segundos
}

// Estructura genérica para respuestas de la API
export interface ApiResponse<T> {
  success: boolean; // Indicador de éxito
  data?: T; // Datos de la respuesta
  error?: string; // Mensaje de error
  message?: string; // Mensaje informativo
}

// Request para crear una configuración de reclutamiento
export interface CreateEyeTrackingRecruitRequest {
  researchId: string; // ID de la investigación
  demographicQuestions: DemographicQuestions; // Preguntas demográficas
  linkConfig: LinkConfig; // Configuración del enlace
  participantLimit: ParticipantLimit; // Límite de participantes
  backlinks: Backlinks; // Enlaces de retorno
  researchUrl: string; // URL de la investigación
  parameterOptions: ParameterOptions; // Opciones de parámetros
}

// Request para actualizar una configuración de reclutamiento
export interface UpdateEyeTrackingRecruitRequest {
  demographicQuestions?: Partial<DemographicQuestions>; // Preguntas demográficas
  linkConfig?: Partial<LinkConfig>; // Configuración del enlace
  participantLimit?: Partial<ParticipantLimit>; // Límite de participantes
  backlinks?: Partial<Backlinks>; // Enlaces de retorno
  researchUrl?: string; // URL de la investigación
  parameterOptions?: Partial<ParameterOptions>; // Opciones de parámetros
}

// Respuesta para generación de enlace de reclutamiento
export interface GenerateRecruitmentLinkResponse {
  link: string; // Enlace generado
  qrCode?: string; // Código QR en formato base64
  expiresAt?: Date; // Fecha de expiración
}

// Tipos de enlace de reclutamiento
export enum RecruitLinkType {
  STANDARD = 'standard', // Enlace estándar
  PREVIEW = 'preview', // Enlace de vista previa
  ADMIN = 'admin' // Enlace de administrador
}
