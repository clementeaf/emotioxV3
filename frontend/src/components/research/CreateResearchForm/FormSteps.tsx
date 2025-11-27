import React from 'react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface FormStepsProps {
  steps: Step[];
  currentStep: number;
}

export const FormSteps: React.FC<FormStepsProps> = ({ steps, currentStep }) => {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 w-full h-[2px] bg-neutral-100" />
        {steps.map((step) => (
          <div key={step.id} className="relative flex flex-col items-center">
            <div className={cn(
              'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white transition-colors',
              currentStep === step.id
                ? 'border-blue-500 text-blue-500'
                : currentStep > step.id
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-neutral-200 text-neutral-400'
            )}>
              <span className="text-sm font-medium">{step.id}</span>
            </div>
            <div className="relative z-10 mt-4 text-center">
              <p className={cn(
                'text-sm font-medium',
                currentStep === step.id
                  ? 'text-neutral-900'
                  : 'text-neutral-500'
              )}>
                {step.title}
              </p>
              <p className="mt-1 text-xs text-neutral-400 max-w-[200px]">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};