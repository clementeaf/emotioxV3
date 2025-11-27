/**
 * Modelo de datos para la investigación
 * Este archivo define las interfaces que se utilizan tanto en el frontend como en el backend
 */

/**
 * Tipos de investigación soportados
 */
export enum ResearchType {
  EYE_TRACKING = 'eye-tracking',
  ATTENTION_PREDICTION = 'attention-prediction',
  COGNITIVE_ANALYSIS = 'cognitive-analysis',
  BEHAVIOURAL = 'behavioural'
}

/**
 * Técnicas de investigación disponibles
 */
export enum ResearchTechnique {
  BIOMETRIC = 'biometric',
  AIM_FRAMEWORK = 'aim-framework'
}

/**
 * Estados posibles de una investigación
 */
export enum ResearchStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

/**
 * Interfaz para los datos básicos de una investigación (Paso 1)
 */
export interface ResearchBasicData {
  /** Nombre de la investigación */
  name: string;

  /** Empresa o cliente para el que se realiza la investigación */
  enterprise: string;

  /** Tipo de investigación seleccionado en el Paso 2 */
  type?: ResearchType;

  /** Técnica de investigación seleccionada en el Paso 3 */
  technique?: string;

  /** Número objetivo de participantes (opcional) */
  targetParticipants?: number;

  /** Objetivos de la investigación (opcional) */
  objectives?: string[];

  /** Etiquetas para clasificar la investigación (opcional) */
  tags?: string[];

  /** Descripción detallada de la investigación (opcional) */
  description?: string;
}

/**
 * Interfaz para los datos de configuración específicos de AIM Framework
 */
export interface AIMFrameworkConfig {
  /** Configuración de la pantalla de bienvenida */
  welcomeScreen?: {
    /** Si la pantalla de bienvenida está habilitada */
    enabled: boolean;
    /** Título de la pantalla de bienvenida */
    title: string;
    /** Mensaje principal */
    message: string;
    /** Texto del botón de inicio */
    buttonText: string;
  };

  /** Configuración del Smart VOC */
  smartVOC?: {
    /** Si Smart VOC está habilitado */
    enabled: boolean;
    /** Preguntas configuradas */
    questions: Array<{
      /** ID único de la pregunta */
      id: string;
      /** Texto de la pregunta */
      text: string;
      /** Tipo de pregunta (CSAT, CES, NPS, etc.) */
      type: string;
    }>;
  };

  /** Configuración de tareas cognitivas */
  cognitiveTask?: {
    /** Si las tareas cognitivas están habilitadas */
    enabled: boolean;
    /** Tipo de tarea cognitiva */
    taskType: string;
    /** Duración de la tarea en segundos */
    duration: number;
  };
}

/**
 * Interfaz para los datos de configuración específicos de Biométrico
 */
export interface BiometricConfig {
  /** Configuración de seguimiento ocular */
  eyeTracking?: {
    /** Si el seguimiento ocular está habilitado */
    enabled: boolean;
    /** Si se requiere calibración */
    calibration: boolean;
    /** Duración de la sesión en segundos */
    duration: number;
  };

  /** Configuración de asociación implícita */
  implicitAssociation?: {
    /** Si la asociación implícita está habilitada */
    enabled: boolean;
    /** Categorías para la prueba */
    categories: string[];
  };

  /** Configuración de tareas cognitivas */
  cognitiveTask?: {
    /** Si las tareas cognitivas están habilitadas */
    enabled: boolean;
    /** Tipo de tarea cognitiva */
    taskType: string;
    /** Duración de la tarea en segundos */
    duration: number;
  };
}

/**
 * Interfaz para la investigación completa
 */
export interface Research {
  /** ID único de la investigación */
  id: string;

  /** Nombre de la investigación */
  name: string;

  /** Datos básicos de la investigación */
  basic: ResearchBasicData;

  /** Configuración específica según la técnica seleccionada */
  config: AIMFrameworkConfig | BiometricConfig;

  /** Estado actual de la investigación */
  status: ResearchStatus;

  /** Fecha y hora de creación en formato ISO */
  createdAt: string;

  /** Fecha y hora de última actualización en formato ISO */
  updatedAt: string;

  /** ID del usuario que creó la investigación */
  createdBy?: string;

  /** Porcentaje de progreso de la investigación (0-100) */
  progress?: number;
}

/**
 * Interfaz para la creación de una investigación (solicitud al backend)
 * Contiene los datos recopilados en los 3 pasos del formulario
 */
export interface CreateResearchRequest {
  /** Datos básicos recogidos en el Paso 1 y 2 */
  basic: ResearchBasicData;

  /** Estado inicial de la investigación (opcional, por defecto DRAFT) */
  status?: ResearchStatus;

  /** Información del usuario que crea la investigación */
  user?: {
    /** ID del usuario */
    id: string;
    /** Email del usuario */
    email: string;
  };

  /** Configuración técnica específica según el tipo seleccionado */
  config?: {
    /** Tipo de configuración (determina qué estructura se utiliza) */
    type: 'aim-framework' | 'biometric';
    /** Configuración específica, puede ser AIMFrameworkConfig o BiometricConfig */
    data: Partial<AIMFrameworkConfig | BiometricConfig>;
  };

  /** Metadatos adicionales para la creación */
  metadata?: {
    /** Plataforma desde la que se crea (web, mobile, etc.) */
    platform?: string;
    /** Versión de la aplicación */
    appVersion?: string;
    /** Otra información contextual */
    [key: string]: unknown;
  };
}

/**
 * Interfaz para la respuesta al crear una investigación exitosamente
 */
export interface CreateResearchResponse {
  /** ID único generado para la investigación */
  id: string;

  /** Nombre de la investigación */
  name: string;

  /** Empresa para la que se realiza */
  enterprise: string;

  /** Tipo de investigación */
  type: string;

  /** Técnica seleccionada */
  technique: string;

  /** Estado inicial */
  status: string;

  /** Fecha y hora de creación en formato ISO */
  createdAt: string;

  /** URL para acceder a la investigación (opcional) */
  accessUrl?: string;

  /** Información adicional específica según la técnica */
  additionalInfo?: {
    /** Siguiente paso recomendado */
    nextStep?: string;
    /** Mensaje adicional para el usuario */
    message?: string;
  };
}

/**
 * Interfaz para errores en la creación de investigaciones
 */
export interface CreateResearchError {
  /** Código de error */
  code: string;

  /** Mensaje de error */
  message: string;

  /** Errores específicos por campo */
  fieldErrors?: {
    [fieldName: string]: string;
  };

  /** Información adicional para depuración */
  details?: Record<string, unknown>;
}

/**
 * Funciones de utilidad para trabajar con investigaciones
 */

/**
 * Genera un ID de investigación único
 * @returns Un ID único para la investigación
 */
export function generateResearchId(): string {
  return `research-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}



/**
 * Verifica si una investigación es de tipo AIM Framework
 * @param research La investigación a verificar
 * @returns true si la investigación utiliza la técnica AIM Framework
 */
export function isAIMFrameworkResearch(research: Research | { technique?: string } | { basic?: { technique?: string } }): boolean {
  // Si es el tipo completo Research
  if ('basic' in research && research.basic && 'technique' in research.basic) {
    return research.basic.technique === ResearchTechnique.AIM_FRAMEWORK;
  }

  // Si es el tipo simplificado con technique directamente
  if ('technique' in research && research.technique) {
    return research.technique === ResearchTechnique.AIM_FRAMEWORK;
  }

  // Si no hay técnica, no es AIM Framework
  return false;
}

/**
 * Verifica si una configuración es de tipo AIM Framework
 * @param config La configuración a verificar
 * @returns true si la configuración es para AIM Framework
 */
export function isAIMFrameworkConfig(config: AIMFrameworkConfig | BiometricConfig): config is AIMFrameworkConfig {
  return 'smartVOC' in config || 'welcomeScreen' in config;
}
