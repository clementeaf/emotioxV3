import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

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
  const MAX_BAR_PCT = 50;

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">{questionNumber}- Question: {title}</h2>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span key={badge.label} className={cn('px-2 py-1 text-xs font-medium rounded', badge.color)}>
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      {/* Bars chart */}
      <div className="overflow-x-auto mb-6">
        <div className="flex items-end gap-1" style={{ minWidth: Math.max(emotionalStates.length * 32, 400) }}>
          {emotionalStates.map((state) => {
            const barHeight = Math.min(state.value, MAX_BAR_PCT) * 2.8;
            return (
              <div key={state.name} className="flex flex-col items-center flex-1" style={{ minWidth: 28 }}>
                {/* % label */}
                <span className="text-[9px] font-medium text-gray-500 mb-0.5 leading-none">
                  {state.value > 0 ? `${state.value}%` : ''}
                </span>
                {/* Bar */}
                <div
                  className={cn(
                    'w-4 rounded-full',
                    state.isPositive ? 'bg-[#4ADE80]' : 'bg-[#F87171]'
                  )}
                  style={{
                    height: `${barHeight}px`,
                    minHeight: state.value > 0 ? '4px' : '0'
                  }}
                  title={`${state.name}: ${state.value}%`}
                />
              </div>
            );
          })}
        </div>

        {/* Emotion names vertical */}
        <div className="h-[90px] flex gap-1 mt-1">
          {emotionalStates.map((state) => (
            <div key={`label-${state.name}`} className="flex-1 flex justify-center" style={{ minWidth: 28 }}>
              <span
                className="text-[10px] text-gray-600 whitespace-nowrap"
                style={{
                  writingMode: 'vertical-lr',
                  transform: 'rotate(180deg)',
                  textOrientation: 'mixed',
                  lineHeight: '1.1',
                  letterSpacing: '0.5px'
                }}
              >
                {state.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Clusters side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Clusters that Drive Long-Term Value</h3>
          {longTermClusters.length > 0 ? (
            <div className="space-y-2">
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
                          ? 'Este cluster ha aumentado en el último periodo.'
                          : 'Este cluster ha disminuido en el último periodo.'}
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
            <p className="text-gray-400 text-sm text-center py-4">No data available</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Clusters that Drive Short-Term Value</h3>
          {shortTermClusters.length > 0 ? (
            <div className="space-y-2">
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
                          ? 'Este cluster ha aumentado en el último periodo.'
                          : 'Este cluster ha disminuido en el último periodo.'}
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
            <p className="text-gray-400 text-sm text-center py-4">No data available</p>
          )}
        </Card>
      </div>
    </Card>
  );
}
