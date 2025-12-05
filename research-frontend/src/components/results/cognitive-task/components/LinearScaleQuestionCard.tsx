import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

interface LinearScaleOption {
  value: number;
  percentage: number;
  color: string;
}

interface LinearScaleQuestionCardProps {
  questionNumber: string;
  questionText: string;
  questionType?: string;
  conditionalityDisabled?: boolean;
  required?: boolean;
  options: LinearScaleOption[];
  totalResponses: number;
  className?: string;
}

export const LinearScaleQuestionCard = ({
  questionNumber,
  questionText,
  questionType = 'Linear Scale question',
  conditionalityDisabled = true,
  required = false,
  options,
  totalResponses,
  className
}: LinearScaleQuestionCardProps) => {
  return (
    <Card className={cn('p-6 pb-24', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{questionNumber}- {questionText}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 text-xs font-medium rounded text-blue-600 bg-blue-50">
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Scale Options with Colored Bars */}
        <div className="border rounded-lg p-6">
          <div className="space-y-4">
            {options.map((option) => (
              <div key={option.value} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium text-gray-700">
                  Option {String(option.value).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className="h-6 rounded-full transition-all duration-300"
                        style={{
                          width: `${option.percentage}%`,
                          backgroundColor: option.color,
                          minWidth: option.percentage > 0 ? '16px' : '0px'
                        }}
                      />
                    </div>
                    {option.percentage > 0 && (
                      <div className="absolute inset-0 flex items-center justify-end pr-2">
                        <span className="text-xs font-semibold text-white drop-shadow-sm">
                          {option.percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Question Card */}
          <div className="mt-8">
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
              <div className="rounded-full bg-blue-100 p-2 flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-base text-gray-900">Question</h4>
                <p className="text-gray-600 text-sm mt-1">This was the best app my eyes had see</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="border rounded-lg p-6">
          <div>
            <h3 className="text-base font-medium text-gray-700 mb-1">Responses</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{totalResponses.toLocaleString()}</span>
              <span className="text-sm text-gray-500">26s</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
