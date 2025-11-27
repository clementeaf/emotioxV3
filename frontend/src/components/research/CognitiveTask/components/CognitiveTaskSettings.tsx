import React from 'react';

import { Switch } from '@/components/ui/Switch';

import { UI_TEXTS } from '../constants';
import { CognitiveTaskFieldsProps as CognitiveTaskSettingsProps } from '../types';

/**
 * Componente para las configuraciones generales de las tareas cognitivas
 */
export const CognitiveTaskSettings: React.FC<CognitiveTaskSettingsProps> = ({
  randomizeQuestions,
  setRandomizeQuestions,
  disabled
}) => {
  return (
    <div className="p-4 bg-white rounded-lg border border-neutral-100">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-md font-medium">Configuración</h3>
          <p className="text-sm text-neutral-500">
            {UI_TEXTS.SETTINGS.RANDOMIZE_DESCRIPTION}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-neutral-500">
            {UI_TEXTS.SETTINGS.RANDOMIZE_LABEL}
          </span>
          <Switch
            checked={randomizeQuestions}
            onCheckedChange={setRandomizeQuestions}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}; 