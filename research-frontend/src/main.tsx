import { StrictMode } from 'react'
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { configService } from './services/api/config.service'
import apiClient from './services/api/client'

/**
 * Registra el Service Worker para caché offline
 */
const registerServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('Service Worker registered:', registration.scope);
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  }
};

interface BootstrapErrorScreenProps {
  error: unknown;
}

/**
 * Displays a minimal error screen when app bootstrap fails (e.g., missing API base URL).
 * @param props - Component props
 * @returns React element
 */
// eslint-disable-next-line react-refresh/only-export-components
const BootstrapErrorScreen = (props: BootstrapErrorScreenProps): ReactElement => {
  const message = props.error instanceof Error ? props.error.message : 'Unknown initialization error';
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: 24 }}>
      <h1 style={{ fontSize: 18, margin: 0, marginBottom: 8 }}>Initialization failed</h1>
      <p style={{ margin: 0, marginBottom: 12, color: '#444' }}>
        The app could not load API configuration.
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

// Initialize API configuration before rendering
configService.init().then(async () => {
  apiClient.setBaseUrl(configService.getBaseUrl());

  // Registrar Service Worker
  void registerServiceWorker();
  
  // AuthProvider will handle bootstrapSession() via useEffect
  // No need to call it here to avoid duplicate requests
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch((error) => {
  console.error('Failed to initialize app:', error);
  void registerServiceWorker();
  
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BootstrapErrorScreen error={error} />
    </StrictMode>,
  )
})
