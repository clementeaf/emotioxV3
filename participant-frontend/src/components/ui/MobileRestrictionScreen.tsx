import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface MobileRestrictionScreenProps {
  message: string;
}

export const MobileRestrictionScreen = ({ message }: MobileRestrictionScreenProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-md p-6">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('mobileRestriction.title')}
        </h1>
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        <Button onClick={() => window.location.reload()}>
          {t('common.reloadPage')}
        </Button>
      </div>
    </div>
  );
};
