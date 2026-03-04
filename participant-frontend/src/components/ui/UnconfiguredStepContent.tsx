import { useTranslation } from 'react-i18next';

interface UnconfiguredStepContentProps {
  currentStep: string;
}

export const UnconfiguredStepContent = ({ currentStep }: UnconfiguredStepContentProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">
        {t('unconfigured.stepLabel', { step: currentStep })}
      </h1>
      <p className="text-gray-500">
        {t('unconfigured.notConfigured')}
      </p>
    </div>
  );
};
