'use client';

interface QuestionInfoProps {
  questionId: string;
  questionText: string; // Agregar el título real de la pregunta
  questionType: string;
  conditionalityDisabled: boolean;
  required: boolean;
  hasNewData?: boolean;
}

export function QuestionInfo({
  questionId,
  questionText,
  questionType,
  conditionalityDisabled,
  required,
  hasNewData = false
}: QuestionInfoProps) {
  // Función para obtener el tipo de pregunta correcto basado en questionType y questionId
  const getQuestionTypeLabel = () => {
    switch (questionType) {
      case 'cognitive_short_text':
      case 'short_text':
        return 'Short Text question';
      case 'cognitive_long_text':
      case 'long_text':
        return 'Long Text question';
      case 'cognitive_single_choice':
      case 'single_choice':
        return 'Single Choice question';
      case 'cognitive_multiple_choice':
      case 'multiple_choice':
        return 'Multiple Choice question';
      case 'cognitive_linear_scale':
      case 'linear_scale':
        return 'Linear Scale question';
      case 'cognitive_ranking':
      case 'ranking':
        return 'Ranking question';
      case 'cognitive_navigation_flow':
      case 'navigation_flow':
        return 'Navigation Flow question';
      case 'cognitive_preference_test':
      case 'preference_test':
        return 'Preference Test question';
      default:
        return 'Question';
    }
  };

  return (
    <div className="p-5 border-b border-neutral-200">
      <div className="flex items-center flex-wrap gap-4">
        <span className="font-medium text-neutral-800 mr-2">
          {questionText}
        </span>
        <div className="flex items-center gap-2 ml-2">
          {/* Tag del tipo de pregunta */}
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm font-medium">
            {getQuestionTypeLabel()}
          </span>

          {/* Tag de condición */}
          {conditionalityDisabled && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
              Conditionality disabled
            </span>
          )}

          {/* Tag de requerido */}
          {required && (
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium">
              Required
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
