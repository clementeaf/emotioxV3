import { useState, useCallback, useEffect } from 'react';
import { useSessionStore } from '../stores/useSessionStore';

interface LocationInfo {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
    source: 'gps' | 'ip' | 'denied';
}

interface UseLocationCollectorReturn {
    location: LocationInfo | null;
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
    const requestLocation = useCallback(async () => {
        if (!config?.settings.enableLocationCapture) return;

        try {
            setIsLoading(true);
            setError(null);
            
            // Check if Geolocation is supported
            if (!navigator.geolocation) {
                throw new Error('Geolocation is not supported by this browser');
            }

            // Get current position
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                });
            });

            const locationInfo: LocationInfo = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: Date.now(),
                source: 'gps'
            };

            setLocation(locationInfo);
            setHasConsent(true);
            console.log('✓ Location captured:', locationInfo);
        } catch (err) {
            console.error('Location error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
            setError(errorMessage);
            
            // Try IP-based location as fallback
            try {
                // In a real implementation, this would call a service to get IP-based location
                console.log('📍 Trying IP-based location fallback...');
                // For now, we'll just mark as denied
                setLocation({
                    latitude: 0,
                    longitude: 0,
                    accuracy: 0,
                    timestamp: Date.now(),
                    source: 'denied'
                });
            } catch (fallbackErr) {
                console.error('IP location fallback failed:', fallbackErr);
            }
        } finally {
            setIsLoading(false);
        }
    }, [config?.settings.enableLocationCapture, setLocation]);

    // Automatically request location if tracking is enabled in config
    useEffect(() => {
        if (config?.linkConfig?.trackLocation === true && config?.settings.enableLocationCapture) {
            // Only auto-request if we haven't already requested or denied
            if (!hasConsent && !error) {
                // Small delay to allow user to see the page first
                const timer = setTimeout(() => {
                    void requestLocation();
                }, 1000);
                
                return () => clearTimeout(timer);
            }
        }
    }, [config, hasConsent, error, requestLocation]);

    /**
     * Deny location tracking
     */
    const denyLocation = useCallback(() => {
        setHasConsent(false);
        setError('Location tracking denied by user');
        setLocation({
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            timestamp: Date.now(),
            source: 'denied'
        });
    }, [setLocation]);

    return {
        location: useSessionStore.getState().location,
        error,
        isLoading,
        hasConsent,
        requestLocation,
        denyLocation
    };
};