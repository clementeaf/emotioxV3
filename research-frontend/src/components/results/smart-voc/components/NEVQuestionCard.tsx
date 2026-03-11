import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
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
  emotionalStates: EmotionalState[];
  longTermClusters: Cluster[];
  shortTermClusters: Cluster[];
  badges?: Array<{ label: string; color: string }>;
  className?: string;
}

export const NEVQuestionCard = ({
  questionNumber,
  title,
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
            {badges.map((badge) => (
              <span key={badge.label} className={cn('px-2 py-1 text-xs font-medium rounded', badge.color)}>
                {badge.label}
              </span>
            ))}
          </div>
          {/* Gráfico de barras de emociones */}
          <div className="flex items-end gap-1" style={{ minWidth: minChartWidth }}>
            {emotionalStates.map((state) => (
              <div key={state.name} className="flex flex-col items-center justify-end" style={{ minWidth: '24px' }}>
                <div
                  className={cn(
                    'w-4 rounded-full',
                    state.isPositive ? 'bg-[#4ADE80]' : 'bg-[#F87171]'
                  )}
                  style={{
                    height: `${Math.min(state.value, 50) * 2.8}px`, // Cap at 50% (maxBarPercent)
                    minHeight: state.value > 0 ? '4px' : '0'
                  }}
                  title={`${state.name}: ${state.value.toFixed(2)}%`}
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
        {/* Fin del gráfico de emociones */}
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
                      <div className="relative group">
                        {cluster.trend === 'up' ? (
                          <ArrowUpIcon className="h-4 w-4 text-[#4ADE80]" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 text-[#F87171]" />
                        )}
                        <div className="absolute left-6 top-0 z-10 hidden group-hover:block bg-white border border-gray-300 rounded shadow-lg p-2 text-xs text-gray-700 w-56">
                          {cluster.trend === 'up'
                            ? `Este cluster ha aumentado en el último periodo.`
                            : `Este cluster ha disminuido en el último periodo.`}
                        </div>
                      </div>
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
                      <div className="relative group">
                        {cluster.trend === 'up' ? (
                          <ArrowUpIcon className="h-4 w-4 text-[#4ADE80]" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 text-[#F87171]" />
                        )}
                        <div className="absolute left-6 top-0 z-10 hidden group-hover:block bg-white border border-gray-300 rounded shadow-lg p-2 text-xs text-gray-700 w-56">
                          {cluster.trend === 'up'
                            ? `Este cluster ha aumentado en el último periodo.`
                            : `Este cluster ha disminuido en el último periodo.`}
                        </div>
                      </div>
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
    </Card>
  );
}
