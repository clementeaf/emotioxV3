import React from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface TechniqueStepProps {
  selectedTechnique?: string;
  onTechniqueToggle: (technique: string) => void;
}

export const TechniqueStep: React.FC<TechniqueStepProps> = ({
  selectedTechnique,
  onTechniqueToggle
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-medium mb-2">Techniques for Behavioural Research</h2>
        <p className="text-neutral-500 text-sm mb-6">
          Please, select the configuration for this research.
        </p>

        <div className="space-y-4">
          {/* Opción AIM Framework Stage 3 */}
          <div className={cn(
            'flex items-center justify-between border rounded-lg p-4 transition-colors',
            selectedTechnique === 'aim-framework'
              ? 'border-blue-500 bg-blue-50'
              : 'border-neutral-200'
          )}>
            <div className="flex-1">
              <div className="text-md font-medium mb-2">AIM Framework Stage 3</div>
              <p className="text-sm text-neutral-600">
                Start with VOC Smart or build an upgrade by your own
              </p>
            </div>
            <div className="ml-4">
              <Button
                type="button"
                variant={selectedTechnique === 'aim-framework' ? 'default' : 'outline'}
                onClick={() => onTechniqueToggle('aim-framework')}
                className={selectedTechnique === 'aim-framework' ? 'bg-blue-500 hover:bg-blue-600' : ''}
              >
                {selectedTechnique === 'aim-framework' ? 'Selected' : 'Choose'}
              </Button>
            </div>
          </div>

          {/* Opción Biometric, Cognitive and Predictive */}
          <div className={cn(
            'flex items-center justify-between border rounded-lg p-4 transition-colors',
            selectedTechnique === 'biometric-cognitive'
              ? 'border-blue-500 bg-blue-50'
              : 'border-neutral-200'
          )}>
            <div className="flex-1">
              <div className="text-md font-medium mb-2">Biometric, Cognitive and Predictive</div>
              <p className="text-sm text-neutral-600">
                Evaluating one or more section with biometrics, implicit association and cognitive task. Also, you can have image and video predictions
              </p>
            </div>
            <div className="ml-4">
              <Button
                type="button"
                variant={selectedTechnique === 'biometric-cognitive' ? 'default' : 'outline'}
                onClick={() => onTechniqueToggle('biometric-cognitive')}
                className={selectedTechnique === 'biometric-cognitive' ? 'bg-blue-500 hover:bg-blue-600' : ''}
              >
                {selectedTechnique === 'biometric-cognitive' ? 'Selected' : 'Choose'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};