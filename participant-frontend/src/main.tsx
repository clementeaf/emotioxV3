import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { configService } from './services/config.service'
import { BootstrapErrorScreen } from './components/BootstrapErrorScreen'

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
// TEMPORARILY DISABLED to break cache cycle - will re-enable after cache is cleared
const ENABLE_SW = false; // Set to true after cache is cleared
if (ENABLE_SW && 'serviceWorker' in navigator && import.meta.env.PROD) {
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
