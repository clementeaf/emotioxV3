import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { configService } from './services/config.service'
import { BootstrapErrorScreen } from './components/BootstrapErrorScreen'
import { ErrorBoundary } from './components/ErrorBoundary'

// Initialize API configuration before rendering
configService.init().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
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

// Unregister stale service workers and clear caches on every load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(name => caches.delete(name)));
  }
}
