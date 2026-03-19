import { Card } from '../../../ui/Card';
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
  className
}: RankingQuestionCardProps) => {
  const positionCount = options.length > 0
    ? Math.max(...options.map(o => o.distribution.length))
    : 0;
  const maxCount = Math.max(1, ...options.flatMap(o => o.distribution));

  return (
    <Card className={cn('p-6 pb-8', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-lg font-semibold">{questionNumber}- {questionText}</h3>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="px-2 py-1 text-xs font-medium rounded text-green-600 bg-green-50">
          {questionType}
        </span>
        {conditionalityDisabled && (
          <span className="px-2 py-1 text-xs font-medium rounded text-blue-600 bg-blue-50">
            Conditionality disabled
          </span>
        )}
        {required && (
          <span className="px-2 py-1 text-xs font-medium rounded text-red-600 bg-red-50">
            Required
          </span>
        )}
        <button className="text-gray-400 hover:text-gray-600 ml-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Column headers — same padding/border offsets as rows */}
      <div className="flex items-end gap-3 mb-1 px-3" style={{ marginLeft: 3 }}>
        <div className="w-28 shrink-0" />
        <div className="flex-1 flex">
          {Array.from({ length: positionCount }, (_, i) => (
            <div key={i} className="flex-1 text-center text-xs font-medium text-gray-500">
              {i + 1}
            </div>
          ))}
        </div>
        <div className="w-14 text-center text-xs font-medium text-gray-500">Mean</div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3 bg-white" style={{ borderLeft: '3px solid #a3e635' }}>
            {/* Option label */}
            <div className="w-28 shrink-0 text-sm font-medium text-gray-700 truncate" title={option.label}>
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
                    <span className="text-[10px] text-gray-400 mt-0.5">{posIdx + 1}</span>
                  </div>
                );
              })}
            </div>

            {/* Mean */}
            <div className="w-14 text-center">
              <span className="text-sm font-bold text-gray-900">{option.mean.toFixed(1).replace('.', ',')}</span>
            </div>
          </div>
        ))}
      </div>

    </Card>
  );
};
