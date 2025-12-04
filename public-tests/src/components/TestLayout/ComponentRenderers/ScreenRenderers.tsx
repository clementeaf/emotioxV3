import React from 'react';
import { ThankYouScreenComponent } from '../components/ThankYouScreenComponent';
import { ScreenComponent } from '../StepsComponents';
import { QuotaResult, EyeTrackingConfig } from '../components/ThankYouScreenTypes';

interface ScreenRendererArgs {
  contentConfiguration?: Record<string, unknown>;
  currentQuestionKey: string;
  quotaResult?: QuotaResult;
  eyeTrackingConfig?: EyeTrackingConfig;
}

export const screenRenderers = {
  screen: ({ contentConfiguration, currentQuestionKey, quotaResult, eyeTrackingConfig }: ScreenRendererArgs) => {
    if (currentQuestionKey === 'thank_you_screen') {
      return (
        <ThankYouScreenComponent
          contentConfiguration={contentConfiguration || {}}
          currentQuestionKey={currentQuestionKey}
          quotaResult={quotaResult}
          eyeTrackingConfig={eyeTrackingConfig}
        />
      );
    }

    return (
      <ScreenComponent
        data={{
          questionKey: currentQuestionKey,
          contentConfiguration,
          title: String(contentConfiguration?.title || 'Bienvenido'),
          message: String(contentConfiguration?.message || 'Bienvenido'),
          startButtonText: String(contentConfiguration?.startButtonText || 'Continuar')
        }}
      />
    );
  }
};
