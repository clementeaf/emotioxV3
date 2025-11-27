import React from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ResearchType } from '../../../../../shared/interfaces/research.model';

interface ResearchTypeStepProps {
  selectedType?: ResearchType;
  onTypeToggle: (type: ResearchType) => void;
}

export const ResearchTypeStep: React.FC<ResearchTypeStepProps> = ({
  selectedType,
  onTypeToggle
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium mb-2">Kind of research</h2>
        <p className="text-neutral-500 text-sm mb-6">
          Select the type of research you wish to carry out. In the next
          step, you will be able to select between different configurations.
        </p>

        <div className="space-y-4">
          {/* Solo Behavioural Research */}
          <div className={cn(
            'p-4 border rounded-lg transition-colors',
            selectedType === ResearchType.BEHAVIOURAL
              ? 'border-blue-500 bg-blue-50'
              : 'border-neutral-200'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center overflow-hidden">
                  <svg className="w-10 h-10 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Enterprise</div>
                  <div className="text-md font-medium">Behavioural Research</div>
                </div>
              </div>
              <Button
                type="button"
                variant={selectedType === ResearchType.BEHAVIOURAL ? 'default' : 'outline'}
                onClick={() => onTypeToggle(ResearchType.BEHAVIOURAL)}
                className={selectedType === ResearchType.BEHAVIOURAL ? 'bg-blue-500 hover:bg-blue-600' : ''}
              >
                {selectedType === ResearchType.BEHAVIOURAL ? 'Selected' : 'Choose'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};