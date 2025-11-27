'use client';

import { useOptimizedCognitiveResults } from '@/hooks/useOptimizedCognitiveResults';
import { LinearScaleResults } from './components/LinearScaleResults';
import { RankingResults } from './components/RankingResults';
import { QuestionContainer } from './components/QuestionContainer';

interface OptimizedCognitiveResultsProps {
  researchId: string;
  configData?: any;
}

/**
 * Componente optimizado que usa la nueva estructura de datos agrupada
 * Demuestra la reducción significativa de complejidad comparado con el hook original
 */
export function OptimizedCognitiveResults({ researchId, configData }: OptimizedCognitiveResultsProps) {
  const {
    data,
    isLoading,
    error,
    processLinearScaleData,
    processRankingData,
    processChoiceData,
    processSentimentData
  } = useOptimizedCognitiveResults(researchId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Cargando resultados optimizados...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500">Error al cargar resultados: {error.message}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">No hay datos disponibles</div>
      </div>
    );
  }

  // Procesar datos específicos
  const linearScaleData = processLinearScaleData('cognitive_linear_scale', configData);
  const rankingData = processRankingData('cognitive_ranking', configData);
  const choiceData = processChoiceData('cognitive_single_choice', configData);
  const sentimentData = processSentimentData('cognitive_short_text');

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          🚀 Resultados Optimizados
        </h2>
        <p className="text-blue-700 text-sm">
          Usando nueva estructura de datos agrupada por questionKey
        </p>
        <div className="mt-2 text-xs text-blue-600">
          <strong>Datos disponibles:</strong> {Object.keys(data).length} tipos de pregunta
        </div>
      </div>

      {/* Linear Scale Results */}
      {linearScaleData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-md font-semibold text-gray-900 mb-3">
            📊 Linear Scale (Optimizado)
          </h3>
          <LinearScaleResults data={linearScaleData} />
        </div>
      )}

      {/* Ranking Results */}
      {rankingData && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-md font-semibold text-gray-900 mb-3">
            🏆 Ranking (Optimizado)
          </h3>
          <RankingResults data={rankingData} />
        </div>
      )}

      {/* Debug Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-md font-semibold text-gray-900 mb-2">
          🔍 Información de Debug
        </h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div><strong>Linear Scale:</strong> {linearScaleData ? '✅ Procesado' : '❌ No disponible'}</div>
          <div><strong>Ranking:</strong> {rankingData ? '✅ Procesado' : '❌ No disponible'}</div>
          <div><strong>Choice:</strong> {choiceData ? '✅ Procesado' : '❌ No disponible'}</div>
          <div><strong>Sentiment:</strong> {sentimentData ? '✅ Procesado' : '❌ No disponible'}</div>
        </div>
      </div>
    </div>
  );
} 