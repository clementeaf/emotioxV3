import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { configService } from './services/api/config.service'

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

// Initialize API configuration before rendering
configService.init().then(() => {
  // Registrar Service Worker
  void registerServiceWorker();
  
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch((error) => {
  console.error('Failed to initialize app:', error);
  // Still render the app with fallback config
  void registerServiceWorker();
  
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
