/**
 * Cognitive Task Interfaces
 * Define la estructura de datos para las tareas cognitivas y cuestionarios
 */

// Constantes de validación para tareas cognitivas
export const COGNITIVE_TASK_VALIDATION = {
  title: {
    minLength: 1,
    maxLength: 255
  },
  choices: {
    min: 1,
    max: 20
  },
  scaleConfig: {
    minValue: 1,
    maxValue: 10
  },
  files: {
    maxSize: 5242880, // 5MB
    maxDimensions: 16000, // 16000x16000 píxeles
    validTypes: ['image/jpeg', 'image/png', 'image/gif']
  }
};

// Tipos de preguntas soportados
export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multiple_choice'
  | 'linear_scale'
  | 'ranking'
  | 'navigation_flow'
  | 'preference_test';

// Opciones para preguntas de selección
export interface Choice {
  id: string;
  text: string;
  isQualify?: boolean;
  isDisqualify?: boolean;
}

// Configuración de escala lineal
export interface ScaleConfig {
  startValue: number;
  endValue: number;
  startLabel?: string;
  endLabel?: string;
}

// Archivo subido
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  time?: number; // Tiempo en segundos para pruebas de navegación
  hitZones?: HitZone[]; // Zonas interactivas para análisis
  s3Key?: string; // Clave del objeto en S3
  error?: boolean; // Indica si hubo un error al cargar
  errorMessage?: string; // Mensaje de error durante la carga
}

// Interfaz extendida para archivos en el estado del formulario
export interface FileInfo extends UploadedFile {
  status?: 'uploading' | 'uploaded' | 'pending-delete' | 'error';
  progress?: number;
  isLoading?: boolean;
  questionId?: string;
}

// Zonas interactivas (hitZones) para archivos
export interface HitZone {
  id: string;
  name: string;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fileId: string;
}

// Estructura de una pregunta
export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  showConditionally: boolean;
  deviceFrame: boolean;
  choices?: Choice[];
  scaleConfig?: ScaleConfig;
  files?: UploadedFile[];
  // Condiciones para mostrar esta pregunta (si showConditionally = true)
  conditions?: {
    questionId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
    value: string | number | boolean;
  }[];
  key?: string;
  moduleResponseId?: string;
  [key: string]: unknown;
}

// Datos completos del formulario de tareas cognitivas
export interface CognitiveTaskFormData {
  researchId: string;
  questions: Question[];
  randomizeQuestions: boolean;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    lastModifiedBy?: string;
    version?: string;
    lastUpdated?: string;
  };
  id?: string;
  title?: string;
  description?: string;
}

// Modelo de tareas cognitivas para almacenamiento en BD (extiende los datos del formulario con ID)
export interface CognitiveTaskModel extends CognitiveTaskFormData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Respuesta del servidor al guardar la configuración de tareas cognitivas
export interface CognitiveTaskFormResponse {
  data?: CognitiveTaskFormData;
  id?: string;
  success?: boolean;
  error?: string;
}

// Resultado de una tarea cognitiva completada por un participante
export interface CognitiveTaskResult {
  id: string;
  researchId: string;
  cognitiveTaskId: string;
  participantId: string;
  answers: {
    questionId: string;
    questionType: QuestionType;
    answer: string | string[] | number | boolean;
    timeToAnswer?: number; // Tiempo en milisegundos que tomó responder
  }[];
  metadata: {
    startTime: string;
    endTime: string;
    totalTime: number; // Tiempo total en milisegundos
    browserInfo?: {
      userAgent: string;
      language: string;
      platform: string;
    };
    deviceInfo?: {
      type: 'desktop' | 'tablet' | 'mobile';
      screenWidth: number;
      screenHeight: number;
    };
  };
  createdAt: string;
}

// Metadatos de tipos de preguntas para UI
export interface QuestionTypeInfo {
  id: QuestionType;
  label: string;
  description: string;
}

// Valores por defecto para una nueva configuración de tareas cognitivas
export const DEFAULT_COGNITIVE_TASK: CognitiveTaskFormData = {
  researchId: '',
  questions: [],
  randomizeQuestions: false
};

// Información de los tipos de preguntas para la UI
export const QUESTION_TYPES_INFO: QuestionTypeInfo[] = [
  { id: 'short_text', label: 'Texto Corto', description: 'Respuestas cortas de texto' },
  { id: 'long_text', label: 'Texto Largo', description: 'Respuestas largas de texto' },
  { id: 'single_choice', label: 'Opción Única', description: 'Seleccionar una opción' },
  { id: 'multiple_choice', label: 'Opción Múltiple', description: 'Seleccionar múltiples opciones' },
  { id: 'linear_scale', label: 'Escala Lineal', description: 'Escala numérica' },
  { id: 'ranking', label: 'Ranking', description: 'Ordenar opciones por preferencia' },
  { id: 'navigation_flow', label: 'Flujo de Navegación', description: 'Prueba de flujo de navegación' },
  { id: 'preference_test', label: 'Prueba de Preferencia', description: 'Prueba A/B de preferencia' }
];

// Plantillas para nuevas preguntas de cada tipo
export const QUESTION_TEMPLATES: Record<QuestionType, Partial<Question>> = {
  short_text: {
    type: 'short_text',
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false
  },
  long_text: {
    type: 'long_text',
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false
  },
  single_choice: {
    type: 'single_choice',
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false,
    choices: [
      { id: '1', text: '', isQualify: false, isDisqualify: false },
      { id: '2', text: '', isQualify: false, isDisqualify: false },
      { id: '3', text: '', isQualify: false, isDisqualify: false }
    ]
  },
  multiple_choice: {
    type: 'multiple_choice',
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false,
    choices: [
      { id: '1', text: '', isQualify: false, isDisqualify: false },
      { id: '2', text: '', isQualify: false, isDisqualify: false },
      { id: '3', text: '', isQualify: false, isDisqualify: false }
    ]
  },
  linear_scale: {
    type: 'linear_scale',
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false,
    scaleConfig: {
      startValue: 1,
      endValue: 5
    }
  },
  ranking: {
    type: 'ranking',
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false,
    choices: [
      { id: '1', text: '', isQualify: false, isDisqualify: false },
      { id: '2', text: '', isQualify: false, isDisqualify: false },
      { id: '3', text: '', isQualify: false, isDisqualify: false }
    ]
  },
  navigation_flow: {
    type: 'navigation_flow',
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false,
    files: []
  },
  preference_test: {
    type: 'preference_test',
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false,
    files: []
  }
};
