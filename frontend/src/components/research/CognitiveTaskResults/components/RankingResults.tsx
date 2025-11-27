'use client';

// Interfaz para la distribución de votos en una escala
export interface RankingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  6: number;
}

// Interfaz para cada opción del ranking
export interface RankingOption {
  id: string;
  text: string;
  mean: number;
  distribution: RankingDistribution;
  responseTime: string;
}

// Interfaz para los datos completos del ranking
export interface RankingQuestionData {
  options: RankingOption[];
  question?: string;
}

interface RankingResultsProps {
  data: RankingQuestionData;
}

/**
 * Componente para mostrar resultados de preguntas de ranking
 * Implementa la visualización horizontal como en la imagen de referencia
 */
export function RankingResults({ data }: RankingResultsProps) {
  if (!data || (!data.options && !(data as any)?.responses)) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No hay datos de ranking disponibles.</p>
        <p className="text-xs mt-2">data: {JSON.stringify(data)}</p>
      </div>
    );
  }

  // Si no hay options pero hay responses, construir options desde responses
  if (!data.options && (data as any)?.responses) {
    // TODO: Procesar responses para construir options
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Procesando datos de ranking...</p>
        <p className="text-xs mt-2">Responses: {(data as any).responses.length}</p>
      </div>
    );
  }

  const sortedOptions = [...data.options].sort((a, b) => a.mean - b.mean);

  const getBarWidth = (mean: number) => {
    const maxRank = data.options.length;
    const rank = Math.round(mean);
    return `${((maxRank - rank + 1) / maxRank) * 100}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {sortedOptions.map((option) => (
        <div key={option.id} className="space-y-2">
          {/* Nombre de la opción */}
          <div className="font-medium text-gray-700">
            {option.text}
          </div>

          {/* Barra horizontal - ahora dinámica basada en el ranking */}
          <div className="w-full bg-gray-200 rounded-full h-6 shadow-inner">
            <div
              className="bg-blue-400 h-6 rounded-full transition-all duration-300 ease-out"
              style={{ width: getBarWidth(option.mean) }}
            ></div>
          </div>

          {/* Valores alineados a la derecha */}
          <div className="flex justify-end space-x-4 text-sm text-gray-600">
            <span>{option.mean.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace('.', ',')}</span>
            <span>{option.responseTime}</span>
          </div>
        </div>
      ))}
    </div >
  );
}
