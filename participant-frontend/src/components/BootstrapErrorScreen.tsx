import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

interface BootstrapErrorScreenProps {
  error: unknown;
}

/**
 * Displays a minimal error screen when app bootstrap fails (e.g., missing API base URL).
 * @param props - Component props
 * @returns React element
 */
export const BootstrapErrorScreen = (props: BootstrapErrorScreenProps): ReactElement => {
  const { t } = useTranslation();
  const message = props.error instanceof Error ? props.error.message : t('errors.unknownError');
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: 24 }}>
      <h1 style={{ fontSize: 18, margin: 0, marginBottom: 8 }}>{t('bootstrap.initFailed')}</h1>
      <p style={{ margin: 0, marginBottom: 12, color: '#444' }}>
        {t('bootstrap.configLoadFailed')}
      </p>
      <pre style={{ background: '#f6f6f6', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap' }}>
        {message}
      </pre>
      <p
        style={{ margin: 0, marginTop: 12, color: '#444' }}
        dangerouslySetInnerHTML={{ __html: t('bootstrap.configHint') }}
      />
    </div>
  );
};
