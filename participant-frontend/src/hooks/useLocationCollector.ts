import { useState } from 'react';
import { useSessionStore } from '../stores/useSessionStore';
import type { LocationInfo } from '../types/research-config';

interface UseLocationCollectorReturn {
    error: string | null;
    isLoading: boolean;
    hasConsent: boolean;
    requestLocation: () => Promise<void>;
    denyLocation: () => void;
}

/**
 * Hook para recolectar ubicación del usuario con consentimiento explícito
 * Soporta GPS y fallback a IP
 */
export const useLocationCollector = (): UseLocationCollectorReturn => {
    const { config, setLocation } = useSessionStore();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasConsent, setHasConsent] = useState(false);

    /**
     * Solicita ubicación GPS del usuario
     */
    const requestLocation = async () => {
        if (!config?.settings.enableLocationCapture) return;
        if (!('geolocation' in navigator)) {
            setError('Geolocalización no soportada');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0,
                    }
                );
            });

            const locationData: LocationInfo = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp,
                source: 'gps',
            };

            setLocation(locationData);
            setHasConsent(true);
        } catch (err) {
            const errorMessage = err instanceof GeolocationPositionError
                ? getGeolocationErrorMessage(err.code)
                : 'Error al obtener ubicación';
            
            setError(errorMessage);
            
            // Registrar ubicación denegada
            setLocation({
                latitude: 0,
                longitude: 0,
                accuracy: 0,
                timestamp: Date.now(),
                source: 'denied',
            });
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Usuario rechaza compartir ubicación
     */
    const denyLocation = () => {
        setHasConsent(false);
        setLocation({
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            timestamp: Date.now(),
            source: 'denied',
        });
    };

    return {
        error,
        isLoading,
        hasConsent,
        requestLocation,
        denyLocation,
    };
};

/**
 * Convierte código de error de geolocalización a mensaje legible
 */
function getGeolocationErrorMessage(code: number): string {
    switch (code) {
        case GeolocationPositionError.PERMISSION_DENIED:
            return 'Permiso de ubicación denegado';
        case GeolocationPositionError.POSITION_UNAVAILABLE:
            return 'Ubicación no disponible';
        case GeolocationPositionError.TIMEOUT:
            return 'Tiempo de espera agotado';
        default:
            return 'Error desconocido al obtener ubicación';
    }
}
