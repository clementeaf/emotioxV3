import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface ErrorScreenProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryButtonText?: string;
}

export const ErrorScreen = ({
  title,
  message,
  onRetry,
  retryButtonText
}: ErrorScreenProps) => {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('common.error');
  const resolvedRetryText = retryButtonText ?? t('common.retry');

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">{resolvedTitle}</h1>
        <p className="text-gray-600 mb-4">{message}</p>
        {onRetry && (
          <Button onClick={onRetry}>
            {resolvedRetryText}
          </Button>
        )}
      </div>
    </div>
  );
};
