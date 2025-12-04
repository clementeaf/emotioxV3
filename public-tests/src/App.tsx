import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useEffect, useState } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { LocationConsentModal } from './components/common/LocationConsentModal';
import LoginRedirect from './components/common/LoginRedirect';
import TestLayoutMain from './components/TestLayout/components/TestLayoutMain';
import { useEyeTrackingConfigQuery } from './hooks/useEyeTrackingConfigQuery';
import { useLocationTracking } from './hooks/useLocationTracking';
import { useTestStore } from './stores/useTestStore';
import './index.css';
import NoResearchIdError from './pages/NoResearchIdError';
import { PrivacyNoticePage } from './pages';

// Crear el cliente de Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

function App() {
  const { researchId, setParticipant } = useTestStore();
  const [showLocationModal, setShowLocationModal] = useState(false);

  useEffect(() => {
    const initializeStoreFromURL = () => {
      // Si ya tenemos researchId, no hacer nada (evitar perderlo)
      if (researchId) {
        return;
      }

      // Leer desde window.location.search (más confiable en móviles)
      const urlParams = new URLSearchParams(window.location.search);
      const urlResearchId = urlParams.get('researchId');

      if (urlResearchId) {
        setParticipant(
          '',
          '',
          '',
          urlResearchId
        );
      }
    };

    // 🎯 EJECUTAR INICIALIZACIÓN INMEDIATAMENTE
    initializeStoreFromURL();
  }, [researchId, setParticipant]);

  // Obtener configuración de eye-tracking
  const { data: eyeTrackingConfig } = useEyeTrackingConfigQuery(researchId || '');

  // Determinar si el tracking de ubicación está habilitado
  const trackLocationEnabled = eyeTrackingConfig?.linkConfig?.trackLocation || false;

  // Hook de tracking de ubicación
  const {
    location,
    isLoading: isLoadingLocation,
    error: locationError,
    hasConsent,
    hasRequested,
    requestLocation,
    rejectLocation
  } = useLocationTracking({
    researchId,
    trackLocationEnabled
  });

  // Mostrar modal de consentimiento si es necesario
  useEffect(() => {
    if (researchId && trackLocationEnabled && !hasRequested && !isLoadingLocation) {
      setShowLocationModal(true);
    }
  }, [researchId, trackLocationEnabled, hasRequested, isLoadingLocation]);

  // Manejar aceptación de ubicación
  const handleAcceptLocation = async () => {
    setShowLocationModal(false);
    await requestLocation();
  };

  // Manejar rechazo de ubicación
  const handleRejectLocation = () => {
    setShowLocationModal(false);
    rejectLocation();
  };

  // Cerrar modal
  const handleCloseLocationModal = () => {
    setShowLocationModal(false);
  };


  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="w-screen h-screen">
          {/* Modal de consentimiento de ubicación */}
          <LocationConsentModal
            isOpen={showLocationModal}
            onAccept={handleAcceptLocation}
            onReject={handleRejectLocation}
            onClose={handleCloseLocationModal}
            researchTitle={eyeTrackingConfig?.researchId ? `la investigación ${eyeTrackingConfig.researchId}` : 'esta investigación'}
          />

          {/* Indicador de carga de ubicación */}
          {isLoadingLocation && (
            <div className="fixed top-11 sm:top-3 right-2 sm:right-4 bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-lg z-40">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-white mr-1.5 sm:mr-2"></div>
                <span className="text-xs sm:text-sm">Obteniendo ubicación...</span>
              </div>
            </div>
          )}

          {/* Indicador de error de ubicación */}
          {locationError && (
            <div className="fixed top-11 sm:top-3 right-2 sm:right-4 bg-red-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-lg z-40 max-w-xs sm:max-w-sm">
              <div className="flex items-start">
                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-xs sm:text-sm">
                  <div className="font-medium">Error de ubicación:</div>
                  <div className="text-xs mt-1 opacity-90">{locationError}</div>
                  {/* 🎯 AVISO ESPECÍFICO PARA SAFARI */}
                  {/^((?!chrome|android).)*safari/i.test(navigator.userAgent) && (
                    <div className="text-xs mt-1.5 sm:mt-2 bg-red-700 bg-opacity-50 p-1.5 sm:p-2 rounded">
                      <strong>Safari:</strong> Verifica permisos de ubicación en Safari &gt; Preferencias &gt; Privacidad
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Indicador de ubicación obtenida */}
          {location && hasConsent && (
            <div className="fixed top-9 sm:top-3 right-2 sm:right-4 bg-green-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-lg z-40">
              <div className="flex items-center">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs sm:text-sm">
                  Ubicación: {location.source === 'gps' ? 'GPS' : 'IP'}
                </span>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/" element={<LoginRedirect />} />
            <Route path="/error-no-research-id" element={<NoResearchIdError />} />
            <Route path="/test" element={<TestLayoutMain />} />
            <Route path="/privacy" element={<PrivacyNoticePage />} />
            {/* 🎯 NUEVA RUTA: Acceso directo con path params */}
            <Route path="/:researchId/:participantId" element={<LoginRedirect />} />
          </Routes>
        </div>
      </Router>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}

export default App;
