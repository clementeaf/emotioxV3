/**
 * Utilidades para SmartVOC
 */

/**
 * Obtiene un valor anidado de un objeto usando notación de punto
 */
export const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Crea un manejador de cambios para campos anidados
 * Maneja correctamente campos anidados como 'config.scaleRange'
 */
export const createFieldChangeHandler = (
  questionId: string,
  fieldPath: string,
  onUpdateQuestion: (id: string, updates: any) => void
) => {
  return (value: unknown) => {
    // Si el campo es anidado (tiene puntos), crear la estructura anidada
    if (fieldPath.includes('.')) {
      const parts = fieldPath.split('.');
      const updates: Record<string, unknown> = {};
      let current = updates;
      
      // Crear la estructura anidada hasta el penúltimo nivel
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = {};
        current = current[parts[i]] as Record<string, unknown>;
      }
      
      // Asignar el valor al último nivel
      current[parts[parts.length - 1]] = value;
      
      onUpdateQuestion(questionId, updates);
    } else {
      // Campo simple, actualizar directamente
      const updates = { [fieldPath]: value };
      onUpdateQuestion(questionId, updates);
    }
  };
};

/**
 * Valida que un campo requerido no esté vacío
 */
export const validateRequiredField = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (typeof value === 'number') {
    return !isNaN(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value != null && value !== undefined;
};

/**
 * Genera un questionKey único para una pregunta de SmartVOC
 * Formato: {type} (ej: "smartvoc_csat")
 * @param question - Pregunta a la que se le generará el questionKey
 * @returns questionKey generado (solo el tipo, sin formato module:type:id)
 */
export const generateSmartVOCQuestionKey = (question: { questionKey?: string; type?: string; id?: string }): string => {
  // Si questionKey existe, validarlo
  if (question.questionKey) {
    // Si tiene formato "smartvoc:type:id", extraer solo el type
    if (question.questionKey.includes(':')) {
      const parts = question.questionKey.split(':');
      if (parts.length === 3 && parts[0] === 'smartvoc') {
        // El type puede estar en parts[1] o parts[2] puede ser el id con el type
        // Normalmente el type está en parts[1], pero si tiene smartvoc_ prefijo, usarlo
        const typePart = parts[1];
        if (typePart.startsWith('smartvoc_')) {
          return typePart; // Retornar el type con prefijo
        }
        // Si no tiene prefijo, agregarlo
        return `smartvoc_${typePart}`;
      }
    }
    // Si el questionKey es simplemente el type (ej: "smartvoc_csat"), retornarlo
    if (question.questionKey.startsWith('smartvoc_')) {
      return question.questionKey;
    }
  }
  
  // Si no hay questionKey, usar el type directamente
  // El type siempre debe tener el prefijo smartvoc_
  if (question.type) {
    if (question.type.startsWith('smartvoc_')) {
      return question.type;
    }
    return `smartvoc_${question.type}`;
  }
  
  return 'smartvoc_unknown';
};

/**
 * Asegura que todas las preguntas de SmartVOC tengan questionKey
 * @param questions - Array de preguntas (puede ser undefined o null)
 * @returns Array de preguntas con questionKey generado si no existe, o array vacío si questions es undefined/null
 */
export const ensureSmartVOCQuestionKeys = <T extends { questionKey?: string; type?: string; id?: string }>(
  questions: T[] | undefined | null
): T[] => {
  if (!questions || !Array.isArray(questions)) {
    return [];
  }
  
  return questions.map(question => ({
    ...question,
    questionKey: generateSmartVOCQuestionKey(question)
  }));
};
