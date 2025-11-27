'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

interface NavigationTestResultsProps {
  className?: string;
  questionId?: string;
  questionType?: string;
  conditionalityDisabled?: boolean;
  required?: boolean;
}

interface Step {
  id: number;
  title: string;
  description: string;
  completionRate: number;
  completionTime: string;
  participants: number;
  areas?: AreaOfInterest[];
}

interface AreaOfInterest {
  id: string;
  name: string;
  percentage: number;
  viewTime: string;
  participants: string;
}

export function NavigationTestResults({
  className,
  questionId = '3.7.-Navigation Test',
  questionType = 'Navigation Test',
  conditionalityDisabled = true,
  required = true
}: NavigationTestResultsProps) {
  const [selectedStep, setSelectedStep] = useState<number | null>(1);
  const [selectedMapView, setSelectedMapView] = useState<'heat' | 'click' | 'opacity' | 'scanPath' | 'image' | 'prediction'>('heat');

  // Datos de ejemplo para los pasos
  const steps: Step[] = [
    {
      id: 1,
      title: 'Step 1',
      description: 'Step 1 and task description',
      completionRate: 100,
      completionTime: '15s',
      participants: 47,
      areas: [
        {
          id: '1',
          name: 'Area of Interest (AOI)',
          percentage: 14,
          viewTime: '6s',
          participants: '05'
        },
        {
          id: '2',
          name: 'Area of Interest (AOI)',
          percentage: 14,
          viewTime: '6s',
          participants: '05'
        },
        {
          id: '3',
          name: 'Area of Interest (AOI)',
          percentage: 14,
          viewTime: '6s',
          participants: '05'
        },
        {
          id: '4',
          name: 'Area of Interest (AOI)',
          percentage: 14,
          viewTime: '6s',
          participants: '05'
        }
      ]
    },
    {
      id: 2,
      title: 'Step 2',
      description: 'Step 2 and task description',
      completionRate: 100,
      completionTime: '55s',
      participants: 3
    },
    {
      id: 3,
      title: 'Step 3',
      description: 'Step 3 and task description',
      completionRate: 100,
      completionTime: '76s',
      participants: 0
    }
  ];

  const handleStepClick = (stepId: number) => {
    setSelectedStep(stepId);
  };

  const handleMapViewChange = (view: 'heat' | 'click' | 'opacity' | 'scanPath' | 'image' | 'prediction') => {
    setSelectedMapView(view);
  };

  const getStepProgress = (step: Step) => {
    // Crea una representación visual del progreso basado en el completion rate
    return (
      <div className="relative w-full h-4 bg-blue-100 rounded-full">
        <div
          className="absolute left-0 top-0 h-full bg-blue-600 rounded-full"
          style={{ width: `${step.completionRate}%` }}
        ></div>
      </div>
    );
  };

  const renderStepCards = () => {
    return steps.map((step) => (
      <div
        key={step.id}
        className={cn(
          'border border-gray-200 rounded-lg overflow-hidden mb-4 cursor-pointer hover:shadow-md transition-shadow',
          selectedStep === step.id && 'ring-2 ring-blue-500'
        )}
        onClick={() => handleStepClick(step.id)}
      >
        <div className="flex items-center p-4">
          <div className="w-16 h-16 mr-4 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
            <div className="text-gray-400 text-xs">Step {step.id}</div>
          </div>

          <div className="flex-grow">
            <div className="flex justify-between items-center mb-2">
              <div className="text-gray-500">Step</div>
              <div className="font-semibold text-lg">{step.id}</div>
            </div>

            {getStepProgress(step)}

            <div className="flex justify-between items-center mt-2">
              <div className="text-gray-700">{step.completionTime}</div>
              <div className="text-blue-600 font-semibold">{step.completionRate}%</div>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                <span>{step.participants}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  const renderStepDetail = () => {
    if (selectedStep === null) { return null; }

    const step = steps.find(s => s.id === selectedStep);
    if (!step) { return null; }

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-lg">{step.description}</h3>
        </div>

        <div className="p-2 border-b border-gray-200">
          <div className="flex space-x-1">
            <button
              className={cn(
                'px-3 py-1 rounded text-sm flex items-center',
                selectedMapView === 'heat' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              )}
              onClick={() => handleMapViewChange('heat')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              Heat click map
            </button>
            <button
              className={cn(
                'px-3 py-1 rounded text-sm flex items-center',
                selectedMapView === 'click' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              )}
              onClick={() => handleMapViewChange('click')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
              </svg>
              Click map
            </button>
            <button
              className={cn(
                'px-3 py-1 rounded text-sm flex items-center',
                selectedMapView === 'opacity' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              )}
              onClick={() => handleMapViewChange('opacity')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              Opacity map
            </button>
            <button
              className={cn(
                'px-3 py-1 rounded text-sm flex items-center',
                selectedMapView === 'scanPath' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              )}
              onClick={() => handleMapViewChange('scanPath')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
              </svg>
              Scan Path
            </button>
            <button
              className={cn(
                'px-3 py-1 rounded text-sm flex items-center',
                selectedMapView === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              )}
              onClick={() => handleMapViewChange('image')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              Image
            </button>
            <button
              className={cn(
                'px-3 py-1 rounded text-sm flex items-center',
                selectedMapView === 'prediction' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              )}
              onClick={() => handleMapViewChange('prediction')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Prediction
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            {/* Simulación de mapa de calor usando un div con gradiente */}
            <div className="w-full h-80 rounded-lg bg-blue-50 flex items-center justify-center overflow-hidden">
              <div className={
                cn(
                  'w-full h-full',
                  selectedMapView === 'heat' ? 'bg-gradient-to-br from-red-500/30 via-yellow-500/20 to-blue-500/10' :
                    selectedMapView === 'click' ? 'bg-blue-100' :
                      selectedMapView === 'opacity' ? 'bg-gradient-to-tr from-blue-200/50 to-blue-100/20' :
                        selectedMapView === 'scanPath' ? 'bg-blue-50' :
                          selectedMapView === 'image' ? 'bg-gray-100' :
                            'bg-indigo-50'
                )
              }>
                {selectedMapView === 'scanPath' && (
                  <svg viewBox="0 0 400 300" className="w-full h-full">
                    <path d="M50,150 C100,50 200,250 300,100" stroke="blue" fill="transparent" strokeWidth="2" />
                    <circle cx="50" cy="150" r="5" fill="red" />
                    <circle cx="150" cy="50" r="5" fill="red" />
                    <circle cx="250" cy="200" r="5" fill="red" />
                    <circle cx="300" cy="100" r="5" fill="red" />
                  </svg>
                )}

                {selectedMapView === 'prediction' && (
                  <div className="text-center text-gray-500">
                    Prediction model visualization
                  </div>
                )}

                {selectedMapView === 'image' && (
                  <div className="text-center text-gray-500">
                    Original image
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {step.areas?.map((area) => (
              <div key={area.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 flex-shrink-0 mr-4 bg-gray-100 rounded-md flex items-center justify-center">
                    <span className="text-xs text-gray-500">AOI {area.id}</span>
                  </div>

                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-blue-600">
                        {area.name}
                      </div>
                      <div className="font-medium text-sm text-gray-700">
                        #{area.id}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center mr-4">
                        <span className="text-sm font-medium text-blue-600">
                          {area.viewTime}
                        </span>
                      </div>

                      <div className="flex items-center mr-4">
                        <span className="text-sm font-medium text-blue-600">
                          {area.percentage}%
                        </span>
                      </div>

                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm">{area.participants}</span>
                      </div>

                      <button className="text-red-500 hover:text-red-700 text-sm">
                        Remove AOI
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Header con información de la prueba */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-gray-900">{questionId}</h2>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
            {questionType}
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md">
            Conditionality disabled
          </span>
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-md">
            Required
          </span>
        </div>

        <button className="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex space-x-6">
        {/* Columna de pasos */}
        <div className="w-1/4 space-y-4">
          {renderStepCards()}
        </div>

        {/* Columna de detalles */}
        <div className="w-3/4">
          {renderStepDetail()}
        </div>
      </div>
    </div>
  );
}
