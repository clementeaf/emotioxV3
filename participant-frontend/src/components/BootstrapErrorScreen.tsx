import type { ReactElement } from 'react';

interface BootstrapErrorScreenProps {
  error: unknown;
}

/**
 * Displays a minimal error screen when app bootstrap fails (e.g., missing API base URL).
 * @param props - Component props
 * @returns React element
 */
export const BootstrapErrorScreen = (props: BootstrapErrorScreenProps): ReactElement => {
  const message = props.error instanceof Error ? props.error.message : 'Unknown initialization error';
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: 24 }}>
      <h1 style={{ fontSize: 18, margin: 0, marginBottom: 8 }}>Initialization failed</h1>
      <p style={{ margin: 0, marginBottom: 12, color: '#444' }}>
        The app could not load API configuration. This build is configured to always use the AWS backend.
      </p>
      <pre style={{ background: '#f6f6f6', padding: 12, borderRadius: 6, whiteSpace: 'pre-wrap' }}>
        {message}
      </pre>
      <p style={{ margin: 0, marginTop: 12, color: '#444' }}>
        Provide <code>/runtime-config.json</code> with <code>{"{\"apiBaseUrl\":\"https://...\"}"}</code> or set <code>VITE_API_URL</code>.
      </p>
    </div>
  );
};

