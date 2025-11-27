// import { QuestionTypeInfo } from '../types'; // <<< Eliminar importación

// <<< Definir el tipo directamente aquí >>>
interface QuestionTypeInfo {
  id: string;
  label: string;
  description: string;
}

/**
 * Constantes para el componente CognitiveTask
 */

// Claves de consulta para React Query
export const QUERY_KEYS = {
  COGNITIVE_TASK: 'cognitiveTask'
};

// Mensajes de error
export const ERROR_MESSAGES = {
  FETCH_ERROR: 'No se pudo cargar la configuración de tareas cognitivas',
  SAVE_ERROR: 'Error al guardar la configuración de tareas cognitivas',
  PREVIEW_ERROR: 'Error al generar la vista previa',
  AUTH_ERROR: 'Error de autenticación. Por favor, inicie sesión nuevamente',
  VALIDATION_ERRORS: {
    QUESTION_TITLE_REQUIRED: 'El título de la pregunta es obligatorio',
    SCALE_START_REQUIRED: 'El valor inicial de la escala es obligatorio',
    SCALE_END_REQUIRED: 'El valor final de la escala es obligatorio',
    CHOICES_REQUIRED: 'Debe agregar al menos una opción',
    FILES_REQUIRED: 'Debe subir al menos un archivo',
    CHOICE_TEXT_REQUIRED: 'El texto de la opción es obligatorio',
    RESEARCH_ID_REQUIRED: 'El ID de investigación es obligatorio',
    NO_QUESTIONS: 'Debe agregar al menos una pregunta',
  }
};

// Mensajes de éxito
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: 'CognitiveTask guardado correctamente.',
  PREVIEW_COMING_SOON: '¡Vista previa disponible próximamente!',
  UPDATED: 'CognitiveTask guardado correctamente.',
  CREATED: 'CognitiveTask guardado correctamente.'
};

// Textos para la interfaz de usuario
export const UI_TEXTS = {
  TITLE: 'Tareas Cognitivas',
  DESCRIPTION: 'Configure tareas cognitivas y preguntas para medir procesos de decisión y comportamiento',
  QUESTION_CARD: {
    REQUIRED_LABEL: 'Obligatorio',
    SHOW_CONDITIONALLY_LABEL: 'Mostrar condicionalmente',
    DEVICE_FRAME_LABEL: 'Marco de dispositivo',
    NO_FRAME_LABEL: 'Sin marco',
    ADD_QUESTION: 'Agregar pregunta',
    QUESTION_TITLE_PLACEHOLDER: 'Agregar pregunta',
  },
  TEXT_QUESTION: {
    QUESTION_TEXT_LABEL: 'Título de la pregunta',
    QUESTION_TEXT_PLACEHOLDER: 'Introduce el título de la pregunta',
    DESCRIPTION_LABEL: 'Descripción',
    DESCRIPTION_PLACEHOLDER: 'Introduce una descripción opcional',
    PLACEHOLDER_LABEL: 'Texto de marcador de posición',
    PLACEHOLDER_INPUT: 'Ej: Escribe tu respuesta aquí',
    PLACEHOLDER_TEXTAREA: 'Ej: Escribe tu respuesta detallada aquí',
  },
  CHOICE_QUESTION: {
    QUESTION_TITLE_LABEL: 'Título de la pregunta',
    QUESTION_TITLE_PLACEHOLDER: 'Introduce el título de la pregunta',
    DESCRIPTION_LABEL: 'Descripción',
    DESCRIPTION_PLACEHOLDER: 'Introduce una descripción opcional',
    OPTIONS_LABEL: 'Opciones',
    ADD_OPTION: 'Añadir opción',
    OPTION_PLACEHOLDER: 'Opción'
  },
  QUESTION_TYPES: {
    SHORT_TEXT: 'Texto Corto',
    LONG_TEXT: 'Texto Largo',
    SINGLE_CHOICE: 'Opción Única',
    MULTIPLE_CHOICE: 'Opción Múltiple',
    LINEAR_SCALE: 'Escala Lineal',
    RANKING: 'Ranking',
    NAVIGATION_FLOW: 'Flujo de Navegación',
    PREFERENCE_TEST: 'Prueba de Preferencia',
  },
  SETTINGS: {
    RANDOMIZE_LABEL: 'Aleatorizar preguntas',
    RANDOMIZE_DESCRIPTION: 'Las preguntas se mostrarán en orden aleatorio para cada participante',
  },
  ADD_QUESTION_MODAL: {
    TITLE: 'Agregar nueva pregunta',
    DESCRIPTION: 'Seleccione el tipo de pregunta que desea agregar',
    CLOSE_BUTTON: 'Cancelar',
  },
  CHOICES: {
    ADD_CHOICE: 'Agregar otra opción',
    ADD_CHOICE_PLACEHOLDER: 'Agregar opción',
    QUALIFY_LABEL: 'Calificar',
    DISQUALIFY_LABEL: 'Descalificar',
    DELETE_BUTTON: 'Eliminar',
  },
  SCALE: {
    START_VALUE_LABEL: 'Valor inicial',
    END_VALUE_LABEL: 'Valor final',
  },
  FILE_UPLOAD: {
    UPLOAD_BUTTON: 'Subir archivos',
    DRAG_DROP_TEXT: 'Arrastre y suelte archivos aquí o haga clic para seleccionar',
    FILE_TYPE_TEXT: 'Soporta: JPG, PNG, GIF (Máx. 5MB)',
  },
  FOOTER: {
    SAVING_TEXT: 'Guardando...',
    UPDATE_EXISTING_TEXT: 'Se actualizará la configuración existente',
    CREATE_NEW_TEXT: 'Se creará una nueva configuración',
    PREVIEW_BUTTON: 'Vista previa',
    SAVE_BUTTON: 'Guardar cambios',
    SAVING_BUTTON: 'Guardando...',
    ADD_QUESTION_BUTTON: 'Agregar pregunta',
  },
  MODAL: {
    ERROR_TITLE: 'Error',
    INFO_TITLE: 'Información',
    SUCCESS_TITLE: 'Éxito',
    CLOSE_BUTTON: 'Cerrar',
  },
  REQUIRED_FIELD: '*',
};

// Definición estándar de tipos de preguntas
export const QUESTION_TYPES: QuestionTypeInfo[] = [
  { id: 'short_text', label: UI_TEXTS.QUESTION_TYPES.SHORT_TEXT, description: 'Respuestas cortas de texto' },
  { id: 'long_text', label: UI_TEXTS.QUESTION_TYPES.LONG_TEXT, description: 'Respuestas largas de texto' },
  { id: 'single_choice', label: UI_TEXTS.QUESTION_TYPES.SINGLE_CHOICE, description: 'Seleccionar una opción' },
  { id: 'multiple_choice', label: UI_TEXTS.QUESTION_TYPES.MULTIPLE_CHOICE, description: 'Seleccionar múltiples opciones' },
  { id: 'linear_scale', label: UI_TEXTS.QUESTION_TYPES.LINEAR_SCALE, description: 'Escala numérica' },
  { id: 'ranking', label: UI_TEXTS.QUESTION_TYPES.RANKING, description: 'Ordenar opciones por preferencia' },
  { id: 'navigation_flow', label: UI_TEXTS.QUESTION_TYPES.NAVIGATION_FLOW, description: 'Prueba de flujo de navegación' },
  { id: 'preference_test', label: UI_TEXTS.QUESTION_TYPES.PREFERENCE_TEST, description: 'Prueba A/B de preferencia' },
];

// Plantillas para nuevas preguntas de cada tipo
export const QUESTION_TEMPLATES = {
  short_text: {
    type: 'short_text' as const,
    title: '',
    description: '',
    answerPlaceholder: 'Short text answer',
    required: true,
    showConditionally: false,
    deviceFrame: false,
  },
  long_text: {
    type: 'long_text' as const,
    title: '',
    description: '',
    answerPlaceholder: 'Long text answer',
    required: true,
    showConditionally: false,
    deviceFrame: false,
  },
  single_choice: {
    type: 'single_choice' as const,
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false,
    choices: [
      { id: '1', text: '', isQualify: false, isDisqualify: false },
      { id: '2', text: '', isQualify: false, isDisqualify: false },
      { id: '3', text: '', isQualify: false, isDisqualify: false },
    ],
  },
  multiple_choice: {
    type: 'multiple_choice' as const,
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false,
    choices: [
      { id: '1', text: '', isQualify: false, isDisqualify: false },
      { id: '2', text: '', isQualify: false, isDisqualify: false },
      { id: '3', text: '', isQualify: false, isDisqualify: false },
    ],
  },
  linear_scale: {
    type: 'linear_scale' as const,
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false,
    scaleConfig: {
      startValue: 1,
      endValue: 5,
    },
  },
  ranking: {
    type: 'ranking' as const,
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false,
    choices: [
      { id: '1', text: '', isQualify: false, isDisqualify: false },
      { id: '2', text: '', isQualify: false, isDisqualify: false },
      { id: '3', text: '', isQualify: false, isDisqualify: false },
    ],
  },
  navigation_flow: {
    type: 'navigation_flow' as const,
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false,
    files: [],
  },
  preference_test: {
    type: 'preference_test' as const,
    title: '',
    required: true,
    showConditionally: false,
    deviceFrame: false,
    files: [],
  },
};