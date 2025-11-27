import { Info } from 'lucide-react';
import React, { useState } from 'react';
import type { UICognitiveQuestion } from '../types';

import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { FormCard } from '@/components/common/FormCard';

import type { ValidationErrors } from '../types';

import { ChoiceQuestion } from './questions/ChoiceQuestion';
import { FileUploadQuestion } from './questions/FileUploadQuestionOriginal';
import { ScaleQuestion } from './questions/ScaleQuestion';
import { TextQuestion } from './questions/TextQuestion';

// Componente Tooltip personalizado
interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

const Tooltip = ({ content, children }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-50 p-2 text-sm bg-white text-gray-800 rounded-md shadow-lg max-w-xs top-0 left-full ml-2">
          {content}
          <div className="absolute top-2 -left-1 w-2 h-2 rotate-45 bg-white"></div>
        </div>
      )}
    </div>
  );
};

// Definición de props explícita para evitar problemas de tipos
type Props = {
  questions: UICognitiveQuestion[];
  randomizeQuestions: boolean;
  onQuestionChange: (questionId: string, updates: Partial<UICognitiveQuestion>) => void;
  onAddChoice: (questionId: string) => void;
  onRemoveChoice: (questionId: string, choiceId: string) => void;
  onFileUpload: (questionId: string, files: FileList) => void;
  onFileDelete: (questionId: string, fileId: string) => void;
  setRandomizeQuestions: (checked: boolean) => void;
  onAddQuestion: (type: UICognitiveQuestion['type']) => void;
  disabled?: boolean;
  isUploading?: boolean;
  uploadProgress?: number;
  FileItemComponent?: React.ComponentType<any>;
  FileUploaderComponent?: React.ComponentType<any>;
  validationErrors: ValidationErrors | null;
};

export const CognitiveTaskFields: React.FC<Props> = ({
  questions,
  randomizeQuestions,
  onQuestionChange,
  onAddChoice,
  onRemoveChoice,
  onFileUpload,
  onFileDelete,
  setRandomizeQuestions,
  onAddQuestion,
  disabled = false,
  isUploading,
  uploadProgress,
  validationErrors,
}) => {
  // LOG INICIAL AL RECIBIR PROPS
  //   JSON.stringify(questions?.map(q => ({ id: q.id, type: q.type, title: q.title?.substring(0, 20) })) || [], null, 2)
  // );

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div>
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-600 rounded-lg">
              <p className="font-semibold">No hay preguntas configuradas</p>
              <p>Añade preguntas para configurar tu tarea cognitiva.</p>
            </div>
          ) : (
            questions.map((question, index) => {
              // Normalizar type para la UI (solo para el componente, no para el backend)
              const normalizedType = typeof question.type === 'string' && question.type.startsWith('cognitive_')
                ? question.type.replace('cognitive_', '')
                : question.type;
              const questionForUI: UICognitiveQuestion = { ...question, type: normalizedType };

              // Extraer errores de validación para esta pregunta
              const questionErrors: ValidationErrors = {};
              if (validationErrors) {
                Object.keys(validationErrors).forEach(key => {
                  if (key.startsWith(`${question.id}.`)) {
                    const fieldName = key.substring(question.id.length + 1);
                    questionErrors[fieldName] = validationErrors[key];
                  }
                });
              }

              // Función para obtener el label del tipo de pregunta
              const getQuestionTypeLabel = () => {
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

              // Renderizar el componente de pregunta según el tipo
              const renderQuestionInput = () => {
                const baseProps = {
                  disabled,
                  validationErrors: questionErrors
                };

                // Normalizar file_upload a navigation_flow para compatibilidad
                let finalType = normalizedType;
                if (finalType === 'file_upload') {
                  finalType = 'navigation_flow';
                }
                
                const questionForChild = { ...questionForUI, type: finalType };

                switch (finalType) {
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

              // Construir el título de la tarjeta
              const cardTitle = `Pregunta ${index + 1}: ${question.id} (${getQuestionTypeLabel()})`;

              return (
                <FormCard key={question.id} title={cardTitle}>
                  <div className="space-y-4">
                    {/* Badge de obligatorio */}
                    {question.required && (
                      <div className="flex justify-end">
                        <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Obligatorio
                        </div>
                      </div>
                    )}

                    {/* Información para tipos especiales */}
                    {question.type === 'preference_test' && (
                      <div className="p-3 bg-blue-50 border border-blue-300 text-blue-800 rounded text-sm">
                        <strong>Información:</strong> Para usar esta pregunta en un test, necesitarás subir <b>al menos 2 archivos válidos</b> (imágenes). La pregunta se puede guardar sin archivos.
                      </div>
                    )}
                    {question.type === 'navigation_flow' && (!question.files || question.files.length === 0) && (
                      <div className="p-3 bg-blue-50 border border-blue-300 text-blue-800 rounded text-sm">
                        <strong>Información:</strong> Para usar esta pregunta en un test, necesitarás subir <b>al menos un archivo</b> (imagen). La pregunta se puede guardar sin archivos.
                      </div>
                    )}

                    {/* Renderizar el componente de pregunta */}
                    {renderQuestionInput()}
                  </div>
                </FormCard>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
