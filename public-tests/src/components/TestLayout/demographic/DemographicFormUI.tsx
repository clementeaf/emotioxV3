import React from 'react';
import { ModernSelect, SelectOption } from '../../common/ModernSelect';

interface DemographicQuestion {
  key: string;
  enabled: boolean;
  required: boolean;
  options: string[];
  disqualifyingOptions?: string[];
}

interface DemographicFormUIProps {
  questions: DemographicQuestion[];
  formValues: Record<string, string>;
  hasLoadedData: boolean;
  isLoading: boolean;
  onInputChange: (key: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const DEMOGRAPHIC_LABELS: Record<string, string> = {
  age: 'Edad',
  gender: 'Género',
  country: 'País',
  education: 'Nivel de educación',
  income: 'Ingresos',
  employmentStatus: 'Situación laboral',
  hours: 'Horas de trabajo',
  proficiency: 'Nivel de competencia'
};

export const DemographicFormUI: React.FC<DemographicFormUIProps> = ({
  questions,
  formValues,
  hasLoadedData,
  isLoading,
  onInputChange,
  onSubmit
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Guardando...</span>
      </div>
    );
  }

  const hasConfiguredQuestions = questions.length > 0;

  return (
    <div className='flex flex-col items-center justify-center h-full gap-10'>
      <div className='mb-2 text-center'>
        <h3 className='text-lg font-semibold mb-2'>Preguntas Demográficas</h3>
        <p className='text-sm text-gray-600'>
          {hasLoadedData ? 'Tus respuestas han sido cargadas' : 'Completa la información solicitada'}
        </p>
      </div>

      {!hasConfiguredQuestions ? (
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Investigación en configuración</h3>
          <p className="text-gray-600 mb-4">
            Por favor consultar con el investigador cuando esté habilitado para responder.
          </p>
          <div className="text-sm text-gray-500">
            <p>Estado: Configuración pendiente</p>
            <p>ID de Investigación: N/A</p>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="w-full max-w-lg mx-auto flex flex-col gap-6">
          {questions.map(q => {
            // Convertir opciones al formato ModernSelect
            const selectOptions: SelectOption[] = q.options.map((opt: string) => ({
              value: opt,
              label: opt,
              className: q.disqualifyingOptions?.includes(opt) ? 'text-red-500' : undefined
            }));

            return (
              <ModernSelect
                key={q.key}
                options={selectOptions}
                value={formValues[q.key] || ''}
                onChange={(value) => onInputChange(q.key, value)}
                label={DEMOGRAPHIC_LABELS[q.key] || q.key.charAt(0).toUpperCase() + q.key.slice(1)}
                required={q.required}
                placeholder="Selecciona una opción"
                size="md"
              />
            );
          })}
        </form>
      )}
    </div>
  );
};
