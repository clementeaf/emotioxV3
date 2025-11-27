import React from 'react';
import type { Question } from '../types';

import { ChoiceQuestion } from './questions/ChoiceQuestion';
import { FileUploadQuestion } from './questions/FileUploadQuestionOriginal';
import { ScaleQuestion } from './questions/ScaleQuestion';
import { TextQuestion } from './questions/TextQuestion';

type QuestionCardProps = {
  question: Question;
  onQuestionChange: (questionId: string, updates: Partial<Question>) => void;
  onAddChoice: (questionId: string) => void;
  onRemoveChoice: (questionId: string, choiceId: string) => void;
  onFileUpload: (questionId: string, files: FileList) => void;
  onFileDelete: (questionId: string, fileId: string) => void;
  disabled?: boolean;
  validationErrors?: { [key: string]: string } | null;
  isUploading?: boolean;
  uploadProgress?: number;
};

/**
 * Componente para mostrar una tarjeta de pregunta con su configuración específica según el tipo
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onQuestionChange,
  onAddChoice,
  onRemoveChoice,
  onFileUpload,
  onFileDelete,
  disabled = false,
  validationErrors = {},
  isUploading,
  uploadProgress
}) => {
  const renderQuestionInput = () => {
    const baseProps = {
      disabled,
      validationErrors
    };

    // Normalizar type para los componentes hijos
    let normalizedType = typeof question.type === 'string' && question.type.startsWith('cognitive_')
      ? question.type.replace('cognitive_', '')
      : question.type;
    
    // Normalizar file_upload a navigation_flow para compatibilidad
    if (normalizedType === 'file_upload') {
      normalizedType = 'navigation_flow';
    }
    
    const questionForChild = { ...question, type: normalizedType };

    switch (normalizedType) {
      case 'short_text':
      case 'long_text':
        return (
          <TextQuestion
            question={questionForChild}
            onQuestionChange={(updates) => onQuestionChange(question.id, updates)}
            {...baseProps}
          />
        );

      case 'single_choice':
      case 'multiple_choice':
      case 'ranking':
        return (
          <ChoiceQuestion
            question={questionForChild}
            onQuestionChange={(updates) => onQuestionChange(question.id, updates)}
            onAddChoice={() => onAddChoice && onAddChoice(question.id)}
            onRemoveChoice={(choiceId) => onRemoveChoice && onRemoveChoice(question.id, choiceId)}
            {...baseProps}
          />
        );

      case 'linear_scale':
        return (
          <ScaleQuestion
            question={questionForChild}
            onQuestionChange={(updates) => onQuestionChange(question.id, updates)}
            {...baseProps}
          />
        );

      case 'navigation_flow':
      case 'preference_test':
      case 'file_upload':
        return (
          <FileUploadQuestion
            question={questionForChild}
            onQuestionChange={(updates) => onQuestionChange(question.id, updates)}
            onFileUpload={(files) => onFileUpload && onFileUpload(question.id, files)}
            onFileDelete={(fileId) => onFileDelete && onFileDelete(question.id, fileId)}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            {...baseProps}
          />
        );

      default:
        return <p className="text-red-500">Tipo de pregunta no soportado: {question.type}</p>;
    }
  };

  const getQuestionTypeLabel = () => {
    // Normalizar el tipo para el label también
    const normalizedType = typeof question.type === 'string' && question.type.startsWith('cognitive_')
      ? question.type.replace('cognitive_', '')
      : question.type;

    switch (normalizedType) {
      case 'short_text': return 'Texto Corto';
      case 'long_text': return 'Texto Largo';
      case 'single_choice': return 'Opción Única';
      case 'multiple_choice': return 'Opción Múltiple';
      case 'linear_scale': return 'Escala Lineal';
      case 'ranking': return 'Ranking';
      case 'navigation_flow': return 'Flujo de Navegación';
      case 'preference_test': return 'Prueba de Preferencia';
      case 'file_upload': return 'Flujo de Navegación';
      default: return 'Tipo Desconocido';
    }
  };

  return (
    <div className="mb-6 p-6 bg-white rounded-lg shadow-sm border border-gray-100" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      <div className="mb-4 pb-3 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center">
          <span className="font-medium text-gray-800">{question.id}</span>
          <span className="ml-2 text-sm text-gray-500">({getQuestionTypeLabel()})</span>
        </div>
        {question.required && (
          <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            Obligatorio
          </div>
        )}
      </div>
      {question.type === 'preference_test' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-300 text-blue-800 rounded">
          <strong>Información:</strong> Para usar esta pregunta en un test, necesitarás subir <b>al menos 2 archivos válidos</b> (imágenes). La pregunta se puede guardar sin archivos.
        </div>
      )}
      {question.type === 'navigation_flow' && (!question.files || question.files.length === 0) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-300 text-blue-800 rounded">
          <strong>Información:</strong> Para usar esta pregunta en un test, necesitarás subir <b>al menos un archivo</b> (imagen). La pregunta se puede guardar sin archivos.
        </div>
      )}
      {renderQuestionInput()}
    </div>
  );
};
