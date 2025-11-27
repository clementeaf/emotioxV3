/**
 * Utilidades para mapear tipos de preguntas a tipos de visualización
 */

export type QuestionViewType = 'sentiment' | 'choice' | 'ranking' | 'linear_scale' | 'preference' | 'image_selection' | 'navigation_flow';

/**
 * Mapea un tipo de pregunta cognitiva a su tipo de visualización correspondiente
 * @param questionType - Tipo de pregunta (ej: 'cognitive_short_text', 'cognitive_multiple_choice')
 * @returns Tipo de visualización para renderizar los resultados
 */
export function getViewType(questionType: string): QuestionViewType {
  const normalizedType = questionType.replace(/^cognitive_/, '').toLowerCase();
  
  switch (normalizedType) {
    case 'short_text':
    case 'long_text':
      return 'sentiment';
    case 'single_choice':
    case 'multiple_choice':
      return 'choice';
    case 'ranking':
      return 'ranking';
    case 'linear_scale':
      return 'linear_scale';
    case 'preference_test':
      return 'preference';
    case 'image_selection':
      return 'image_selection';
    case 'navigation_flow':
      return 'navigation_flow';
    default:
      // Fallback: buscar por palabras clave en el tipo
      const lowerType = questionType.toLowerCase();
      if (lowerType.includes('short_text') || lowerType.includes('long_text')) {
        return 'sentiment';
      }
      if (lowerType.includes('choice')) {
        return 'choice';
      }
      if (lowerType.includes('linear_scale')) {
        return 'linear_scale';
      }
      if (lowerType.includes('ranking')) {
        return 'ranking';
      }
      if (lowerType.includes('navigation_flow')) {
        return 'navigation_flow';
      }
      if (lowerType.includes('preference')) {
        return 'preference';
      }
      if (lowerType.includes('image_selection')) {
        return 'image_selection';
      }
      return 'sentiment';
  }
}

/**
 * Mapea un tipo de pregunta cognitiva a su tipo de pregunta interno
 * @param questionType - Tipo de pregunta (ej: 'cognitive_short_text')
 * @returns Tipo de pregunta interno (puede ser el mismo o un tipo simplificado)
 */
export function getQuestionType(questionType: string): string {
  switch (questionType) {
    case 'cognitive_short_text':
      return 'cognitive_short_text';
    case 'cognitive_long_text':
      return 'cognitive_long_text';
    case 'cognitive_single_choice':
      return 'cognitive_single_choice';
    case 'cognitive_multiple_choice':
      return 'cognitive_multiple_choice';
    case 'cognitive_ranking':
      return 'cognitive_ranking';
    case 'cognitive_linear_scale':
      return 'cognitive_linear_scale';
    case 'cognitive_preference_test':
      return 'cognitive_preference_test';
    case 'cognitive_image_selection':
      return 'cognitive_image_selection';
    case 'cognitive_navigation_flow':
      return 'cognitive_navigation_flow';
    default:
      return questionType;
  }
}

/**
 * Mapea un tipo de pregunta cognitiva a un tipo de pregunta simplificado para visualización
 * @param questionType - Tipo de pregunta (ej: 'cognitive_short_text')
 * @returns Tipo simplificado ('short_text', 'long_text', 'multiple_choice', 'rating', 'preference_test')
 */
export function getSimplifiedQuestionType(questionType: string): 'short_text' | 'long_text' | 'multiple_choice' | 'rating' | 'preference_test' {
  switch (questionType) {
    case 'cognitive_short_text':
      return 'short_text';
    case 'cognitive_long_text':
      return 'long_text';
    case 'cognitive_single_choice':
    case 'cognitive_multiple_choice':
      return 'multiple_choice';
    case 'cognitive_ranking':
    case 'cognitive_linear_scale':
      return 'rating';
    case 'cognitive_preference_test':
      return 'preference_test';
    case 'cognitive_image_selection':
    case 'cognitive_navigation_flow':
      return 'rating';
    default:
      return 'short_text';
  }
}

