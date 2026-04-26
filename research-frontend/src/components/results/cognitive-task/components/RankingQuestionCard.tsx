import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Badge';
import { cn } from '../../../../lib/utils';

interface RankingOption {
  id: string;
  label: string;
  mean: number;
  /** Distribution: how many times this option was placed at each position (index 0 = position 1) */
  distribution: number[];
}

interface RankingQuestionCardProps {
  questionNumber: string;
  questionText: string;
  questionType?: string;
  conditionalityDisabled?: boolean;
  required?: boolean;
  options: RankingOption[];
  totalResponses?: number;
  className?: string;
}

export const RankingQuestionCard = ({
  questionNumber,
  questionText,
  questionType = 'Ranking question',
  conditionalityDisabled = true,
  required = false,
  options,
  totalResponses = 0,
  className
}: RankingQuestionCardProps) => {
  const positionCount = options.length > 0
    ? Math.max(...options.map(o => o.distribution.length))
    : 0;
  const maxCount = Math.max(1, ...options.flatMap(o => o.distribution));
  const hasResponses = totalResponses > 0;

  return (
    <Card className={cn('p-6 pb-8', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-lg font-semibold">{questionNumber}- {questionText}</h3>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Badge variant="green" shape="square" className="px-2 py-1">{questionType}</Badge>
        {conditionalityDisabled && (
          <Badge variant="blue" shape="square" className="px-2 py-1">Conditionality disabled</Badge>
        )}
        {required && (
          <Badge variant="red" shape="square" className="px-2 py-1">Required</Badge>
        )}
        {hasResponses && (
          <span className="text-xs text-gray-500 ml-2">{totalResponses} responses</span>
        )}
      </div>

      {/* Column headers */}
      <div className="flex items-end gap-3 mb-1 px-3" style={{ marginLeft: 3 }}>
        <div className="w-36 shrink-0" />
        <div className="flex-1 flex">
          {Array.from({ length: positionCount }, (_, i) => (
            <div key={i} className="flex-1 text-center text-xs font-medium text-gray-500 cursor-help" title={`Position ${i + 1} — bar height shows how many participants ranked this option here`}>
              {i + 1}
            </div>
          ))}
        </div>
        <div className="w-14 text-center text-xs font-medium text-gray-500 cursor-help" title="Average position across all participants (lower = more preferred)">Mean</div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3 bg-white" style={{ borderLeft: '3px solid #a3e635' }}>
            {/* Option label */}
            <div className="w-36 shrink-0 text-sm font-medium text-gray-700" title={option.label}>
              {option.label}
            </div>

            {/* Distribution histogram */}
            <div className="flex-1 flex items-end gap-px" style={{ height: 48 }}>
              {option.distribution.map((count, posIdx) => {
                const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={posIdx} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div
                      className="w-full rounded-t-sm"
                      style={{
                        height: `${barHeight}%`,
                        minHeight: count > 0 ? 3 : 0,
                        backgroundColor: '#93a3c8',
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Mean */}
            <div className="w-14 text-center">
              <span className="text-sm font-bold text-gray-900">
                {hasResponses && option.mean > 0
                  ? option.mean.toFixed(1).replace('.', ',')
                  : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {!hasResponses && (
        <p className="text-sm text-gray-400 text-center mt-4">No responses yet</p>
      )}
    </Card>
  );
};
