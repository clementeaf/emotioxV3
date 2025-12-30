import { Target, ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';
import { useMemo } from 'react';

interface EmotionalState {
  name: string;
  value: number;
  isPositive: boolean;
}

interface Cluster {
  name: string;
  value: number;
  trend: 'up' | 'down';
}

interface NEVQuestionCardProps {
  questionNumber: string;
  title: string;
  questionText: string;
  instructionsText?: string;
  score: number;
  responses: number;
  responseTime?: string;
  positivePercentage: number;
  negativePercentage: number;
  emotionalStates: EmotionalState[];
  longTermClusters: Cluster[];
  shortTermClusters: Cluster[];
  badges?: Array<{ label: string; color: string }>;
  className?: string;
}

export const NEVQuestionCard = ({
  questionNumber,
  title,
  questionText,
  instructionsText,
  score,
  responses,
  responseTime = '28s',
  positivePercentage,
  negativePercentage,
  emotionalStates,
  longTermClusters,
  shortTermClusters,
  badges = [
    { label: 'Linear Scale question', color: 'text-green-600 bg-green-50' },
    { label: 'Conditionality disabled', color: 'text-blue-600 bg-blue-50' },
    { label: 'Required', color: 'text-red-600 bg-red-50' }
  ],
  className
}: NEVQuestionCardProps) => {
  // Calcular ancho mínimo necesario para evitar superposición de etiquetas
  const minChartWidth = useMemo(() => {
    const minItemWidth = 28; // 24px mínimo + 4px gap
    const calculatedWidth = emotionalStates.length * minItemWidth;
    return Math.max(calculatedWidth, 400); // Mínimo 400px para gráficos pequeños
  }, [emotionalStates.length]);

  return (
    <Card className={cn('p-6 pb-24', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-semibold">{questionNumber}- Question: {title}</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {badges.map((badge, index) => (
              <span key={index} className={cn('px-2 py-1 text-xs font-medium rounded', badge.color)}>
                {badge.label}
              </span>
            ))}
          </div>
          {instructionsText && (
            <p className="text-gray-500 text-sm">{instructionsText}</p>
          )}
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Responses</span>
            <span className="text-2xl font-semibold">{responses.toLocaleString()}</span>
            <span className="text-sm text-gray-500">{responseTime}</span>
          </div>
          <div className="flex items-center mt-4">
            <Target className="w-12 h-12 text-blue-600" />
            <span className="text-4xl font-bold text-blue-600 ml-2">{score}</span>
          </div>
        </div>
      </div>

      {/* Barras de emociones positivas/negativas */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span>Positive Emotions</span>
          <span className="font-medium">{positivePercentage}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full">
          <div
            className="h-full bg-[#4ADE80] rounded-full"
            style={{ width: `${positivePercentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between mb-2 mt-4">
          <span>Negative Emotions</span>
          <span className="font-medium">{negativePercentage}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full">
          <div
            className="h-full bg-[#F87171] rounded-full"
            style={{ width: `${negativePercentage}%` }}
          />
        </div>
      </div>

      {/* Question text */}
      <div className="flex items-start gap-3 pt-4 border-t border-gray-100 mb-6">
        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
          <Target className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 mb-1">{title}'s question</div>
          <p className="text-sm text-gray-500">{questionText}</p>
        </div>
      </div>

      {/* Contenido principal - Layout horizontal: gráfico a la izquierda, clusters a la derecha */}
      <div className="flex gap-8 items-start">
        {/* Gráfico de estados emocionales */}
        <div className="flex-1 min-w-0 overflow-visible">
          <h3 className="text-xl font-light text-gray-500 mb-2">Emotional states</h3>
          <p className="text-2xl font-bold mb-12">{positivePercentage.toFixed(2)}% Positive</p>

          {/* Gráfico de barras */}
          <div className="overflow-x-auto" style={{ width: '100%' }}>
            <div className="flex gap-4" style={{ minWidth: `${minChartWidth}px` }}>
              {/* Eje Y con valores */}
              <div className="flex flex-col justify-between h-[300px] w-8 flex-shrink-0">
                {[100, 50, 0].map((value) => (
                  <div key={value} className="text-sm text-gray-500">
                    {value}
                  </div>
                ))}
              </div>

              {/* Área del gráfico */}
              <div className="flex-1 flex flex-col">
                {/* Contenedor de barras con líneas de cuadrícula */}
                <div
                  className="flex gap-1 items-end h-[300px] border-b border-gray-200 border-t border-gray-200"
                  style={{ backgroundImage: 'linear-gradient(to bottom, rgba(229, 231, 235, 0.5) 0px, rgba(229, 231, 235, 0.5) 1px, transparent 1px, transparent 149px, rgba(229, 231, 235, 0.5) 149px, rgba(229, 231, 235, 0.5) 150px, transparent 150px)' }}
                >
                  {emotionalStates.map((state) => (
                    <div key={state.name} className="flex-1 flex flex-col items-center justify-end" style={{ minWidth: '24px' }}>
                      {/* Porcentaje arriba de la barra */}
                      <div className="text-xs font-medium mb-1">
                        {state.value}%
                      </div>

                      {/* La barra en sí */}
                      <div
                        className={cn(
                          'w-4 rounded-full',
                          state.isPositive ? 'bg-[#4ADE80]' : 'bg-[#F87171]'
                        )}
                        style={{
                          height: `${(state.value / 100) * 280}px`,
                          minHeight: state.value > 0 ? '4px' : '0'
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Nombres debajo del gráfico - Formato vertical */}
                <div className="h-[100px] flex gap-1 mt-2">
                  {emotionalStates.map((state) => (
                    <div key={`label-${state.name}`} className="flex-1 flex justify-center" style={{ minWidth: '24px' }}>
                      <div className="h-full flex flex-col items-center justify-start">
                        <span
                          className="text-[10px] text-gray-600 whitespace-nowrap"
                          style={{
                            writingMode: 'vertical-lr',
                            transform: 'rotate(180deg)',
                            textOrientation: 'mixed',
                            lineHeight: '1.1',
                            letterSpacing: '0.5px'
                          }}
                          title={state.name}
                        >
                          {state.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clusters en columna - Ancho fijo */}
        <div className="w-[280px] flex-shrink-0 space-y-4">
          <Card className="p-4">
            <h3 className="text-base font-semibold mb-3">Clusters that Drivers Long-Term Value</h3>
            {longTermClusters.length > 0 ? (
              <div className="space-y-2.5">
                {longTermClusters.map((cluster) => (
                  <div key={cluster.name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{cluster.name}</span>
                    <div className="flex items-center gap-1">
                      {cluster.trend === 'up' ? (
                        <ArrowUpIcon className="h-4 w-4 text-[#4ADE80]" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 text-[#F87171]" />
                      )}
                      <span className={cn(
                        'text-sm font-medium',
                        cluster.trend === 'up' ? 'text-[#4ADE80]' : 'text-[#F87171]'
                      )}>
                        {cluster.value.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm">No data available</p>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="text-base font-semibold mb-3">Clusters that Drives Short-Term Value</h3>
            {shortTermClusters.length > 0 ? (
              <div className="space-y-2.5">
                {shortTermClusters.map((cluster) => (
                  <div key={cluster.name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{cluster.name}</span>
                    <div className="flex items-center gap-1">
                      {cluster.trend === 'up' ? (
                        <ArrowUpIcon className="h-4 w-4 text-[#4ADE80]" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 text-[#F87171]" />
                      )}
                      <span className={cn(
                        'text-sm font-medium',
                        cluster.trend === 'up' ? 'text-[#4ADE80]' : 'text-[#F87171]'
                      )}>
                        {cluster.value.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm">No data available</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Card>
  );
};
