import { useState } from 'react';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Badge';
import { cn } from '../../../../lib/utils';

interface PreferenceStep {
  stepNumber: number;
  title?: string;
  duration: string;
  completionRate: number;
  participantCount: number;
  selectionCount?: number;
  progressColor?: string;
  imageUrl?: string;
}

interface PreferenceTestCardProps {
  questionNumber: string;
  questionText: string;
  questionType?: string;
  conditionalityDisabled?: boolean;
  required?: boolean;
  steps: PreferenceStep[];
  className?: string;
}

export const PreferenceTestCard = ({
  questionNumber,
  questionText,
  questionType = 'Preference Test',
  conditionalityDisabled = true,
  required = false,
  steps,
  className
}: PreferenceTestCardProps) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedSteps(newExpanded);
  };

  return (
    <Card className={cn('p-6 pb-24', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">{questionNumber}- {questionText}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="green" shape="square" className="px-2 py-1">
              {questionType}
            </Badge>
            {conditionalityDisabled && (
              <Badge variant="blue" shape="square" className="px-2 py-1">
                Conditionality disabled
              </Badge>
            )}
            {required && (
              <Badge variant="red" shape="square" className="px-2 py-1">
                Required
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isExpanded = expandedSteps.has(step.stepNumber);
          const progressColor = step.progressColor || (step.stepNumber === 3 ? '#6366F1' : '#9333EA');
          
          return (
            <div key={step.stepNumber} className="border rounded-lg overflow-hidden bg-white">
              {/* Step Row */}
              <div className="p-4 flex items-center gap-4">
                {/* Step thumbnail */}
                <div className="w-16 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                  {step.imageUrl ? (
                    <img 
                      src={step.imageUrl} 
                      alt={step.title || `Step ${step.stepNumber}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-blue-700">Step {step.stepNumber}</span>
                  )}
                </div>

                {/* Progress info */}
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-14">Step {step.stepNumber}</span>
                  
                  {/* Progress bar */}
                  <div className="flex-1 max-w-sm bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all"
                      style={{ 
                        width: step.selectionCount && step.selectionCount > 0 ? `${Math.min(step.selectionCount * 3, 100)}%` : '10%',
                        backgroundColor: progressColor
                      }}
                    />
                  </div>
                  
                  <span className="text-xs text-gray-500 min-w-[3rem] text-right cursor-help" title="Average time participants spent on this test">⏱ {step.duration}</span>
                  <span className="text-xs font-semibold text-blue-600 min-w-[3rem] text-right cursor-help" title="Percentage of participants who made a selection">{step.completionRate}%</span>
                  <span className="text-xs text-gray-500 min-w-[2rem] text-right cursor-help" title="Total participants who attempted this test">👥 {step.participantCount}</span>
                  <span className="text-xs text-gray-500 min-w-[2rem] text-right cursor-help" title="Number of selections made">✓ {step.selectionCount || 0}</span>
                </div>

                {/* Show details button */}
                <button
                  onClick={() => toggleStep(step.stepNumber)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  {isExpanded ? 'Hide details' : 'Show details'}
                </button>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t bg-gray-50 p-6">
                  {step.imageUrl ? (
                    <div className="max-w-2xl mx-auto">
                      <img 
                        src={step.imageUrl} 
                        alt={step.title || `Step ${step.stepNumber}`}
                        className="w-full rounded-lg shadow-lg"
                      />
                      <div className="mt-4 text-center">
                        <p className="font-medium text-gray-700">{step.title || `Image ${step.stepNumber}`}</p>
                        <p className="text-sm text-gray-500 mt-1">Selected by {step.completionRate}% of participants</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p className="font-medium">Step {step.stepNumber} Details</p>
                      <p className="text-sm mt-2">No image available for this preference test option</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
