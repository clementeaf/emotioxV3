import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

interface RankingSegment {
  position: number;
  percentage: number;
  color: string;
}

interface RankingOption {
  id: string;
  label: string;
  mean: number;
  segments: RankingSegment[];
}

interface RankingQuestionCardProps {
  questionNumber: string;
  questionText: string;
  questionType?: string;
  conditionalityDisabled?: boolean;
  required?: boolean;
  options: RankingOption[];
  totalResponses?: number;
  responseTime?: string;
  className?: string;
}

export const RankingQuestionCard = ({
  questionNumber,
  questionText,
  questionType = 'Ranking question',
  conditionalityDisabled = true,
  required = false,
  options,
  totalResponses,
  responseTime = '70s',
  className
}: RankingQuestionCardProps) => {
  const maxPosition = Math.max(...options.flatMap(opt => opt.segments.map(s => s.position)));

  return (
    <Card className={cn('p-6 pb-24', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{questionNumber}- {questionText}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {/* Ranking Visualization */}
      <div className="space-y-1">
        {/* Header with position numbers */}
        <div className="flex items-center gap-3 mb-2 pl-20">
          <div className="flex-1 flex justify-between items-center px-2 text-xs text-gray-500 font-medium">
            {Array.from({ length: maxPosition }, (_, i) => (
              <span key={i + 1}>{i + 1}</span>
            ))}
          </div>
          <div className="w-20 text-center text-xs text-gray-500 font-medium">Mean</div>
          <div className="w-16 text-center text-xs text-gray-500 font-medium">Secs</div>
          <div className="w-8"></div>
        </div>

        {/* Options with segmented bars */}
        {options.map((option) => (
          <div key={option.id} className="flex items-center gap-3">
            {/* Option Label */}
            <div className="w-20 text-sm font-medium text-gray-700">
              {option.label}
            </div>

            {/* Segmented Bar */}
            <div className="flex-1 flex rounded-full overflow-hidden h-7 bg-gray-200">
              {option.segments.map((segment, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-center transition-all duration-300"
                  style={{
                    width: `${segment.percentage}%`,
                    backgroundColor: segment.color,
                    minWidth: segment.percentage > 0 ? '8px' : '0'
                  }}
                >
                  {segment.percentage > 5 && (
                    <span className="text-xs font-semibold text-white drop-shadow-sm">
                      {segment.position}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Mean Value */}
            <div className="w-20 text-center">
              <span className="text-sm font-semibold text-gray-900">{option.mean.toFixed(1)}</span>
            </div>

            {/* Response Time */}
            <div className="w-16 text-center">
              <span className="text-sm text-gray-500">{responseTime}</span>
            </div>

            {/* Filter Icon */}
            <div className="w-8 flex justify-center">
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Responses Summary */}
      {totalResponses && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-700 mb-1">Responses</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{totalResponses.toLocaleString()}</span>
                <span className="text-sm text-gray-500">26s</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
