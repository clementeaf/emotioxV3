import { useTranslation } from 'react-i18next';

interface InvalidResearchScreenProps {
  title?: string;
  message?: string;
}

export const InvalidResearchScreen = ({
  title,
  message
}: InvalidResearchScreenProps) => {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('invalidResearch.title');
  const resolvedMessage = message ?? t('invalidResearch.noId');

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {resolvedTitle}
        </h1>
        <p className="text-gray-600">
          {resolvedMessage}
        </p>
      </div>
    </div>
  );
};
