import { useState } from 'react';
import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';
import { HeatmapRenderer } from './HeatmapRenderer';

interface AOI {
  id: string;
  label: string;
  percentage: number;
  thumbnail?: string;
}

interface NavigationStep {
  stepNumber: number;
  title: string;
  description?: string;
  duration: string;
  completionRate: number;
  participantCount: number;
  aois?: AOI[];
  hasHeatmap?: boolean;
  heatmapData?: Array<{ x: number; y: number; value?: number; isCorrect?: boolean; timestamp?: number }>;
  imageUrl?: string;
  hitZones?: Array<{ x: number; y: number; width: number; height: number }>;
}

interface NavigationTestCardProps {
  questionNumber: string;
  questionText: string;
  questionType?: string;
  conditionalityDisabled?: boolean;
  required?: boolean;
  steps: NavigationStep[];
  className?: string;
}

export const NavigationTestCard = ({
  questionNumber,
  questionText,
  questionType = 'Navigation Test',
  conditionalityDisabled = true,
  required = false,
  steps,
  className
}: NavigationTestCardProps) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));
  const [activeTab, setActiveTab] = useState('navigation');

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

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => {
          const isExpanded = expandedSteps.has(step.stepNumber);

          return (
            <div key={step.stepNumber} className="border rounded-lg overflow-hidden">
              {/* Step Header - Always Visible */}
              <div className="p-4 bg-white flex items-center gap-4">
                {/* Step thumbnail */}
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-700">Step {step.stepNumber}</span>
                </div>

                {/* Progress info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-700">Step {step.stepNumber}</span>
                    {/* Progress bar */}
                    <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${step.completionRate}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{step.duration}</span>
                    <span className="text-xs font-semibold text-blue-600">{step.completionRate}%</span>
                    <span className="text-xs text-gray-500">{step.participantCount}</span>
                  </div>
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
                <div className="border-t bg-gray-50">
                  {/* Step Title */}
                  <div className="p-4 border-b bg-white">
                    <h4 className="font-semibold text-base mb-1">{step.title}</h4>
                    {step.description && (
                      <p className="text-sm text-gray-600">{step.description}</p>
                    )}
                  </div>

                  {/* Update Banner */}
                  <div className="p-3 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
                    <span className="text-sm text-purple-900">
                      New data was obtained. Please update graph
                    </span>
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                      Update
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="border-b bg-white">
                    <div className="flex gap-1 px-4">
                      {['Heat click map', 'Click map', 'Quantity mapper', 'Scan Path', 'Image', 'Navigation'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab.toLowerCase().replace(/\s+/g, '-'))}
                          className={cn(
                            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                            activeTab === tab.toLowerCase().replace(/\s+/g, '-')
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-600 hover:text-gray-900'
                          )}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-4">
                    {/* Heatmap/Image Placeholder */}
                    {step.imageUrl && (
                      <div className="mb-4 rounded-lg overflow-hidden border bg-gray-100 relative">
                        <HeatmapRenderer
                          imageUrl={step.imageUrl}
                          data={step.heatmapData || []}
                          className="w-full"
                        />
                        {/* Overlay hitZones on top of heatmap */}
                        {step.hitZones && step.hitZones.length > 0 && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {step.hitZones.map((hz, idx) => (
                              <rect
                                key={idx}
                                x={hz.x}
                                y={hz.y}
                                width={hz.width}
                                height={hz.height}
                                fill="rgba(59, 130, 246, 0.15)"
                                stroke="#3B82F6"
                                strokeWidth="0.5"
                                strokeDasharray="2,2"
                              />
                            ))}
                          </svg>
                        )}
                      </div>
                    )}

                    {!step.imageUrl && (
                      <div className="mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 h-64 flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">Heatmap (No Image Available)</span>
                      </div>
                    )}

                    {/* AOIs (Areas of Interest) */}
                    {step.aois && step.aois.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">Areas of Interest (AOI)</h5>
                        {step.aois.map((aoi, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-3 bg-white border rounded-lg">
                            {/* AOI Thumbnail */}
                            <div className={cn(
                              'w-16 h-16 rounded flex items-center justify-center flex-shrink-0',
                              idx === 0 ? 'bg-gray-100' :
                                idx === 1 ? 'bg-blue-900' :
                                  idx === 2 ? 'bg-gray-200' :
                                    'bg-gradient-to-br from-blue-200 to-purple-200'
                            )}>
                              {idx === 0 && (
                                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>

                            {/* AOI Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">{aoi.label}</span>
                                <span className="text-xs text-gray-500">#1</span>
                              </div>
                            </div>

                            {/* Percentage */}
                            <div className="text-right">
                              <span className="text-sm font-semibold text-blue-600">{aoi.percentage}%</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button className="text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button className="text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                                Remove AOI
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
