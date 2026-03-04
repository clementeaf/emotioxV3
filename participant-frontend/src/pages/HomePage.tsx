import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../components/ui/LanguageSelector';

export const HomePage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <LanguageSelector />
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {t('home.title')}
        </h1>
        <p className="text-gray-600">
          {t('home.subtitle')}
        </p>
      </div>
    </div>
  );
};
