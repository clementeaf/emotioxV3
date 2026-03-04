import { useTranslation } from 'react-i18next';

interface ResearchCompletionContentProps {
  showRestartOption: boolean;
}

export const ResearchCompletionContent = ({ showRestartOption }: ResearchCompletionContentProps) => {
  const { t } = useTranslation();

  if (!showRestartOption) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
      <div className="bg-green-100 rounded-full p-3 mb-4">
        <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900">
        {t('completion.title')}
      </h1>
      <p className="text-gray-600 max-w-md">
        {t('completion.multipleAllowed')}
      </p>
    </div>
  );
};
