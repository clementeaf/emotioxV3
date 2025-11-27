'use client';


// Interfaz para las opciones/respuestas
export interface ChoiceOption {
  id: string;
  text: string;
  count: number;
  percentage: number;
  color?: string; // Color opcional para la barra
}

// Interfaz para la pregunta completa
export interface ChoiceQuestionData {
  question: string;
  description?: string;
  instructions?: string;
  options: ChoiceOption[];
  totalResponses: number;
  responseDuration?: string;
}

interface ChoiceResultsProps {
  data: ChoiceQuestionData;
  imageSrc?: string;
}

export function ChoiceResults({ data, imageSrc }: ChoiceResultsProps) {
  if (!data || !data.options || !Array.isArray(data.options)) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No hay datos de selección disponibles.</p>
        <p className="text-xs mt-2">data: {JSON.stringify(data)}</p>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-0">
      {/* Panel izquierdo: Opciones y porcentajes */}
      <div className="p-6 border-r border-neutral-200">
        <div className="space-y-6">
          {data.options.map((option) => (
            <div key={option.id} className="flex flex-col">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-neutral-900">{option.text}</span>
                <span className="text-sm font-medium text-neutral-900">
                  {option.percentage}% ({option.count} respuestas)
                </span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${option.color ? '' : 'bg-blue-600'}`}
                  style={{
                    width: `${option.percentage}%`,
                    backgroundColor: option.color || undefined
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Comentado: Card de información de la pregunta */}
        {/* <div className="mt-12">
          <div className="flex items-center">
            <div className="p-4 bg-white rounded-lg border border-neutral-200 w-full">
              <div className="flex items-start">
                <div className="rounded-full bg-blue-100 p-2 mr-4">
                  <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Question</h3>
                  <p className="text-neutral-600 mt-1">{data.question}</p>
                  {data.description && (
                    <p className="text-neutral-500 text-sm mt-2">{data.description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div> */}
      </div>

      {/* Panel derecho: Estadísticas e imagen opcional */}
      <div className="p-6">
        <div>
          <h3 className="text-lg font-medium text-neutral-700">Responses</h3>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-neutral-900 mr-2">{data.totalResponses.toLocaleString()}</span>
            {data.responseDuration && (
              <span className="text-sm text-neutral-500">{data.responseDuration}</span>
            )}
          </div>
          
          {/* Descripción e instrucciones */}
          {(data.description || data.instructions) && (
            <div className="mt-4 space-y-2">
              {data.description && (
                <div>
                  <p className="text-sm font-medium text-neutral-600">Descripción:</p>
                  <p className="text-sm text-neutral-500 mt-1">{data.description}</p>
                </div>
              )}
              {data.instructions && (
                <div>
                  <p className="text-sm font-medium text-neutral-600">Instrucciones:</p>
                  <p className="text-sm text-neutral-500 mt-1">{data.instructions}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {imageSrc && (
          <div className="mt-6">
            <div className="relative">
              <img
                src={imageSrc}
                alt="Question visualization"
                className="w-full rounded-md object-cover h-[200px]"
              />
              <button className="absolute bottom-0 w-full bg-neutral-100 py-2 flex items-center justify-center gap-2 text-neutral-600 hover:text-neutral-800 text-sm">
                Expand image
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6"></path>
                  <path d="M10 14L21 3"></path>
                  <path d="M9 21H3v-6"></path>
                  <path d="M3 9l6 6"></path>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
