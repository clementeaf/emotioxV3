import { StrictMode } from 'react'
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { configService } from './services/config.service'

interface BootstrapErrorScreenProps {
  error: unknown;
}

/**
 * Displays a minimal error screen when app bootstrap fails (e.g., missing API base URL).
 * @param props - Component props
 * @returns React element
 */
const BootstrapErrorScreen = (props: BootstrapErrorScreenProps): ReactElement => {
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

// Initialize API configuration before rendering
configService.init().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch((error) => {
  console.error('Failed to initialize app:', error);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BootstrapErrorScreen error={error} />
    </StrictMode>,
  );
})

// Register Service Worker (only in production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // First, unregister all existing service workers to force fresh start
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister().then(() => {
          console.log('Unregistered old service worker');
        });
      });
    }).then(() => {
      // Clear all caches
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              console.log('Deleting cache:', cacheName);
              return caches.delete(cacheName);
            })
          );
        });
      }
    }).then(() => {
      // Register new service worker with timestamp to bypass cache
      const buildTime = (window as { __BUILD_TIME__?: number }).__BUILD_TIME__ || Date.now();
      const swUrl = '/sw.js?version=' + Date.now() + '&build=' + buildTime;
      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          console.log('SW registered: ', registration);
          
          // Force update check immediately
          registration.update();
          
          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, force reload
                  console.log('New service worker available, reloading...');
                  window.location.reload();
                }
              });
            }
          });
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  });
}
