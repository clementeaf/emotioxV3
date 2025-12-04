 
import React from 'react';
import { QuestionComponent } from './QuestionComponent';
import { SmartVOCRenderers } from './ComponentRenderers/SmartVOCRenderers';
import { screenRenderers } from './ComponentRenderers/ScreenRenderers';
import { cognitiveRenderers } from './ComponentRenderers/CognitiveRenderers';
import { demographicRenderers } from './demographic';

import { QuotaResult, EyeTrackingConfig } from './components/ThankYouScreenTypes';

interface RendererArgs {
  contentConfiguration?: Record<string, unknown>;
  currentQuestionKey: string;
  quotaResult?: QuotaResult;
  eyeTrackingConfig?: EyeTrackingConfig;
  formData?: Record<string, unknown>;
  [key: string]: unknown;
}

const getRenderers = (): Record<string, (args: RendererArgs) => React.ReactNode> => ({
  ...screenRenderers,
  ...demographicRenderers,

  smartvoc: ({ contentConfiguration, currentQuestionKey, formData }: RendererArgs) => {
    const displayType = contentConfiguration?.type || 'text';
    
    let questionType: string;
    let config: Record<string, unknown>;
    
    switch (displayType) {
      case 'stars':
        questionType = 'emoji';
        config = { ...contentConfiguration, type: 'stars' };
        break;
      case 'numbers':
      case 'scale':
        questionType = 'scale';
        config = { ...contentConfiguration };
        break;
      case 'emojis':
        questionType = 'emoji';
        config = { ...contentConfiguration };
        break;
      case 'text':
      default:
        questionType = 'text';
        config = { ...contentConfiguration };
        break;
    }
    
    return (
      <QuestionComponent
        question={{
          title: String(contentConfiguration?.title || 'Pregunta SmartVOC'),
          questionKey: currentQuestionKey,
          type: questionType,
          config,
          choices: [],
          description: String(contentConfiguration?.description || '')
        }}
        currentStepKey={currentQuestionKey}
        initialFormData={formData}
      />
    );
  },
  ...SmartVOCRenderers,
  ...cognitiveRenderers
});

export const UnknownStepComponent: React.FC<{ data: unknown }> = ({ data }) => (
  <div className='flex flex-col items-center justify-center h-full gap-10'>
    <h2 className='text-2xl font-bold'>Componente desconocido</h2>
    <p>No se pudo renderizar este tipo de componente</p>
    <pre className='text-sm text-gray-500'>{JSON.stringify(data, null, 2)}</pre>
  </div>
);

export const RENDERERS = getRenderers();
