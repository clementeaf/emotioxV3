import { QuestionType } from 'shared/interfaces/question-types.enum';
import { SmartVOCQuestion } from '@/api/domains/smart-voc';

/**
 * Plantillas disponibles para crear nuevas preguntas
 */
export const QUESTION_TEMPLATES: Partial<Record<QuestionType, Omit<SmartVOCQuestion, 'id'>>> = {
  [QuestionType.SMARTVOC_CSAT]: {
    type: QuestionType.SMARTVOC_CSAT,
    title: 'CSAT',
    description: 'Mide satisfacción general',
    instructions: '',
    showConditionally: false,
    required: true,
    config: {
      type: 'stars'
    }
  },
  [QuestionType.SMARTVOC_CES]: {
    type: QuestionType.SMARTVOC_CES,
    title: 'CES',
    description: 'Mide facilidad de uso',
    instructions: '',
    showConditionally: false,
    required: false,
    config: {
      type: 'scale',
      scaleRange: { start: 1, end: 5 }
    }
  },
  [QuestionType.SMARTVOC_CV]: {
    type: QuestionType.SMARTVOC_CV,
    title: 'CV',
    description: 'Captura valor percibido',
    instructions: '',
    showConditionally: false,
    required: false,
    config: {
      type: 'scale',
      scaleRange: { start: 1, end: 7 },
      startLabel: '',
      endLabel: ''
    }
  },
  [QuestionType.SMARTVOC_NPS]: {
    type: QuestionType.SMARTVOC_NPS,
    title: 'NPS',
    description: 'Evalúa lealtad y recomendación',
    instructions: '',
    showConditionally: false,
    required: false,
    config: {
      type: 'scale',
      scaleRange: { start: 0, end: 10 },
      startLabel: '',
      endLabel: ''
    }
  },
  [QuestionType.SMARTVOC_NEV]: {
    type: QuestionType.SMARTVOC_NEV,
    title: 'NEV',
    description: 'Analiza valor emocional',
    instructions: '',
    showConditionally: false,
    required: true,
    config: {
      type: 'emojis'
    }
  },
  [QuestionType.SMARTVOC_VOC]: {
    type: QuestionType.SMARTVOC_VOC,
    title: 'VOC',
    description: 'Recolecta comentarios abiertos',
    instructions: '',
    showConditionally: false,
    required: false,
    config: {
      type: 'text',
      maxLength: 500
    }
  },
};

/**
 * Crea una pregunta desde una plantilla
 */
export const createQuestionFromTemplate = (type: QuestionType, instructions?: string): SmartVOCQuestion => {
  const template = QUESTION_TEMPLATES[type];
  if (!template) {
    throw new Error(`Template not found for type: ${type}`);
  }
  
  // Generar ID único basado en tipo y timestamp para permitir duplicados del mismo tipo
  const typePrefix = type.replace('smartvoc_', '').toLowerCase();
  const uniqueId = `${typePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  return {
    ...template,
    id: uniqueId,
    instructions: instructions || template.instructions
  };
};

/**
 * Obtiene los tipos de preguntas disponibles que no han sido creados aún
 */
export const getAvailableQuestionTypes = (existingTypes: QuestionType[]): QuestionType[] => {
  const allTypes = Object.keys(QUESTION_TEMPLATES) as QuestionType[];
  return allTypes.filter(type => !existingTypes.includes(type));
};
