import { useCallback, useEffect, useState } from 'react';
import { getApiUrl } from '../config/endpoints';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
  source: 'gps' | 'ip';
}

interface LocationTrackingState {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  hasConsent: boolean;
  hasRequested: boolean;
  requestLocation: () => Promise<void>;
  rejectLocation: () => void;
  clearLocation: () => void;
}

interface UseLocationTrackingProps {
  researchId: string | null;
  trackLocationEnabled: boolean;
}

/**
 * Hook para manejar el tracking de ubicación con consentimiento
 * Solo solicita ubicación si trackLocation está habilitado en la configuración
 */
export const useLocationTracking = ({
  researchId,
  trackLocationEnabled
}: UseLocationTrackingProps): LocationTrackingState => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  // Verificar si ya se ha solicitado consentimiento
  useEffect(() => {
    const consentKey = `location_consent_${researchId}`;
    const storedConsent = localStorage.getItem(consentKey);

    if (storedConsent) {
      const consentData = JSON.parse(storedConsent);
      setHasConsent(consentData.hasConsent);
      setHasRequested(true);

      // Si ya dio consentimiento, cargar ubicación guardada
      if (consentData.hasConsent && consentData.location) {
        setLocation(consentData.location);
      }
    }
  }, [researchId]);

  // Función para obtener ubicación por GPS
  const getGPSLocation = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      const geolocationOptions = isSafari || isIOS ? {
        enableHighAccuracy: false,
        timeout: 30000,           
        maximumAge: 60000         
      } : {
        enableHighAccuracy: true,
        timeout: 15000,           
        maximumAge: 300000
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            source: 'gps'
          };
          resolve(locationData);
        },
        (error) => {
          console.error('[useLocationTracking] Error de geolocalización:', {
            code: error.code,
            message: error.message,
            isSafari,
            isIOS
          });
          
          let errorMessage = `Error de geolocalización: ${error.message}`;
          
          if (isSafari || isIOS) {
            switch (error.code) {
              case 1: // PERMISSION_DENIED
                errorMessage = 'Permiso de ubicación denegado. Por favor, habilita la ubicación en Safari > Preferencias > Privacidad > Servicios de ubicación';
                break;
              case 2: // POSITION_UNAVAILABLE
                errorMessage = 'Ubicación no disponible. Verifica que tengas conexión a internet y que la ubicación esté habilitada';
                break;
              case 3: // TIMEOUT
                errorMessage = 'Tiempo de espera agotado. Safari puede requerir más tiempo para obtener la ubicación';
                break;
            }
          }
          
          reject(new Error(errorMessage));
        },
        geolocationOptions
      );
    });
  }, []);

  const getIPLocation = useCallback(async (): Promise<LocationData> => {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { getApiUrl } = await import('../config/endpoints');
      
      // Usar endpoint del backend que hace proxy de servicios externos
      const response = await fetch(getApiUrl('device-info/location'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || result;

      return {
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        timestamp: new Date().toISOString(),
        source: 'ip'
      };
    } catch (error) {
      console.error('[useLocationTracking] Error obteniendo ubicación por IP:', error);
      throw new Error('No se pudo obtener ubicación por IP');
    }
  }, []);

  // Función principal para solicitar ubicación
  const requestLocation = useCallback(async () => {
    if (!trackLocationEnabled || !researchId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Intentar GPS primero
      const locationData = await getGPSLocation();

      // Guardar consentimiento y ubicación
      const consentKey = `location_consent_${researchId}`;
      const consentData = {
        hasConsent: true,
        timestamp: new Date().toISOString(),
        location: locationData
      };

      localStorage.setItem(consentKey, JSON.stringify(consentData));
      setLocation(locationData);
      setHasConsent(true);
      setHasRequested(true);

      // Enviar al backend
      await sendLocationToBackend(locationData);

    } catch (gpsError) {
      // Si el usuario denegó el permiso, no es un error crítico
      const isPermissionDenied = gpsError instanceof Error && 
        (gpsError.message.includes('denied') || gpsError.message.includes('Permission'));
      
      if (isPermissionDenied) {
        console.info('[useLocationTracking] Permiso de ubicación denegado, intentando IP como fallback');
      } else {
        console.warn('[useLocationTracking] GPS falló, intentando IP:', gpsError);
      }

      try {
        // Fallback a IP
        const ipLocationData = await getIPLocation();

        // Guardar consentimiento y ubicación
        const consentKey = `location_consent_${researchId}`;
        const consentData = {
          hasConsent: true,
          timestamp: new Date().toISOString(),
          location: ipLocationData
        };

        localStorage.setItem(consentKey, JSON.stringify(consentData));
        setLocation(ipLocationData);
        setHasConsent(true);
        setHasRequested(true);

        // Enviar al backend
        await sendLocationToBackend(ipLocationData);

      } catch (ipError) {
        setError('No se pudo obtener ubicación');
        console.error('[useLocationTracking] Error obteniendo ubicación:', ipError);
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackLocationEnabled, researchId, getGPSLocation, getIPLocation]);

  // Función para enviar ubicación al backend
  const sendLocationToBackend = useCallback(async (locationData: LocationData) => {
    if (!researchId) return;

    try {
      const response = await fetch(`${getApiUrl('location-tracking')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          researchId,
          location: locationData,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        // Si el endpoint no existe (404), es esperado si el tracking está deshabilitado en el backend
        // La ubicación ya se guardó en localStorage, así que no es crítico
        if (response.status === 404) {
          console.warn('[useLocationTracking] Endpoint de location-tracking no disponible (deshabilitado en backend). La ubicación se guardó en localStorage.');
          return;
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      // Solo mostrar error si no es un 404 (endpoint no disponible)
      if (error instanceof Error && !error.message.includes('404')) {
        console.error('[useLocationTracking] Error enviando ubicación al backend:', error);
      } else {
        console.warn('[useLocationTracking] Endpoint de location-tracking no disponible. La ubicación se guardó en localStorage.');
      }
    }
  }, [researchId]);

  // Función para rechazar tracking
  const rejectLocation = useCallback(() => {
    const consentKey = `location_consent_${researchId}`;
    const consentData = {
      hasConsent: false,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem(consentKey, JSON.stringify(consentData));
    setHasConsent(false);
    setHasRequested(true);
  }, [researchId]);

  // Función para limpiar datos de ubicación
  const clearLocation = useCallback(() => {
    if (researchId) {
      const consentKey = `location_consent_${researchId}`;
      localStorage.removeItem(consentKey);
    }
    setLocation(null);
    setHasConsent(false);
    setHasRequested(false);
    setError(null);
  }, [researchId]);

  return {
    location,
    isLoading,
    error,
    hasConsent,
    hasRequested,
    requestLocation,
    rejectLocation,
    clearLocation
  };
};
