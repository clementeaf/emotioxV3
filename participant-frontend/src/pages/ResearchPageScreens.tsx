import { useTranslation } from 'react-i18next';
import { MainLayout } from '../components/layout/MainLayout';
import { MobileRestrictionScreen } from '../components/ui/MobileRestrictionScreen';
import { InvalidResearchScreen } from '../components/ui/InvalidResearchScreen';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { ErrorScreen } from '../components/ui/ErrorScreen';

/** Redirect screen with spinning logo */
export const RedirectingScreen = () => {
  const { t } = useTranslation();
  const logoUrl = `${import.meta.env.BASE_URL}EmotioCX-logo.svg`;
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
      <img src={logoUrl} alt="EmotioCX" className="h-12 mb-8 opacity-80" />
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-700 mb-4" />
      <p className="text-gray-500 text-sm">{t('redirecting', 'Redirecting...')}</p>
    </div>
  );
};

/** Block screen for participants who already responded */
export const AlreadyRespondedScreen = () => {
  const { t } = useTranslation();
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 px-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{t('alreadyResponded.title', 'You have already responded')}</h2>
        <p className="text-gray-600 max-w-md">{t('alreadyResponded.message', 'Your responses have been recorded. Thank you for your participation!')}</p>
      </div>
    </MainLayout>
  );
};

/** Kiosk transition screen between participants */
export const KioskTransitionScreen = () => {
  const { t } = useTranslation();
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 px-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t('kiosk.transitionTitle')}</h1>
        <p className="text-gray-600">{t('kiosk.transitionMessage')}</p>
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    </MainLayout>
  );
};

export { MobileRestrictionScreen, InvalidResearchScreen, LoadingScreen, ErrorScreen };
