import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

interface ChoiceOption {
  id: string;
  text: string;
  percentage: number;
  color?: string;
}

interface ChoiceQuestionCardProps {
  questionNumber: string;
  questionText: string;
  questionType: 'Single Choice question' | 'Multiple Choice question';
  conditionalityDisabled?: boolean;
  required?: boolean;
  options: ChoiceOption[];
  totalResponses: number;
  className?: string;
}

export const ChoiceQuestionCard = ({
  questionNumber,
  questionText,
  questionType,
  conditionalityDisabled = true,
  required = false,
  options,
  totalResponses,
  className
}: ChoiceQuestionCardProps) => {
  return (
    <Card className={cn('p-6 pb-24', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{questionNumber}- {questionText}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded',
              questionType === 'Single Choice question' 
                ? 'text-green-600 bg-green-50' 
                : 'text-purple-600 bg-purple-50'
            )}>
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
        {/* Left: Options with Progress Bars */}
        <div className="border rounded-lg p-6">
          <div className="space-y-6">
            {options.map((option) => (
              <div key={option.id} className="flex flex-col">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{option.text}</span>
                  <span className="text-sm font-medium text-gray-900">{option.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={cn('h-2.5 rounded-full', option.color ? '' : 'bg-blue-600')}
                    style={{
                      width: `${option.percentage}%`,
                      backgroundColor: option.color || undefined
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right: Stats */}
        <div className="border rounded-lg p-6">
          <div>
            <h3 className="text-base font-medium text-gray-700 mb-1">Responses</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{totalResponses.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
