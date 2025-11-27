'use client';

export interface LinearScaleData {
  question: string;
  description?: string;
  scaleRange: { start: number; end: number };
  responses: { value: number; count: number }[];
  average: number;
  totalResponses: number;
  distribution: Record<number, number>;
  responseTime?: string;
}

interface LinearScaleResultsProps {
  data: LinearScaleData;
}

/**
 * Componente para mostrar resultados de preguntas de escala lineal
 * Implementa la visualización horizontal con barras de colores como en la imagen de referencia
 */
export function LinearScaleResults({ data }: LinearScaleResultsProps) {

  // Si hay values pero no responses, construir responses desde values
  const values = (data as any)?.values;
  if (values && Array.isArray(values) && values.length > 0 && (!data.responses || data.responses.length === 0)) {
    // Construir distribution desde los valores
    const distribution: Record<number, number> = {};
    values.forEach((value: number) => {
      distribution[value] = (distribution[value] || 0) + 1;
    });

    // Construir responses desde distribution
    const responses = Object.entries(distribution).map(([value, count]) => ({
      value: parseInt(value),
      count
    }));

    // Construir scaleRange desde los datos si no existe
    const scaleRange = data.scaleRange || { start: Math.min(...values), end: Math.max(...values) };
    
    // Actualizar data con responses construidas
    (data as any).responses = responses;
    (data as any).scaleRange = scaleRange;
  }

  if (!data || (!data.responses || data.responses.length === 0)) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No hay datos de escala lineal disponibles.</p>
        <p className="text-xs mt-2">data: {JSON.stringify(data)}</p>
      </div>
    );
  }

  const { question, description, scaleRange, responses, average, totalResponses, distribution, responseTime } = data;

  // Generar todas las opciones de la escala (desde startValue hasta endValue)
  const optionsData = Array.from({ length: scaleRange.end - scaleRange.start + 1 }, (_, index) => {
    const optionNumber = scaleRange.start + index;
    const count = distribution[optionNumber] || 0;
    const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;

    return {
      optionNumber,
      count,
      percentage
    };
  });

  /**
   * Determina el color de la barra basado en el valor y porcentaje
   * - Valores bajos con alto porcentaje: Rojo (negativo)
   * - Valores bajos con bajo porcentaje: Gris (neutral)
   * - Valores altos: Verde (positivo)
   */
  const getBarColor = (optionNumber: number, percentage: number) => {
    const midPoint = (scaleRange.start + scaleRange.end) / 2;

    // Valores bajos (1-3 en escala 1-5, o 1-5 en escala 1-10)
    if (optionNumber <= midPoint) {
      return percentage > 25 ? 'bg-red-500' : 'bg-gray-400';
    }
    // Valores altos (4-5 en escala 1-5, o 6-10 en escala 1-10)
    else {
      return 'bg-green-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="space-y-4">
        {optionsData.map((option) => (
          <div key={option.optionNumber} className="flex items-center space-x-4">
            <div className="w-16 text-sm font-medium text-gray-700">
              {option.optionNumber}
            </div>
            <div className="flex-1">
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-6">
                  <div
                    className={`h-6 rounded-full transition-all duration-300 ${getBarColor(option.optionNumber, option.percentage)}`}
                    style={{
                      width: `${option.percentage}%`,
                      minWidth: option.percentage > 0 ? '16px' : '0px'
                    }}
                  ></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-end pr-2">
                  <span className="text-xs font-semibold text-white drop-shadow-sm">
                    {option.percentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comentado: Footer con información adicional */}
      {/* <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">Question</span>
        </div>
      </div> */}
    </div>
  );
}
