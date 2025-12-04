import { useEffect, useState } from 'react';
import { useSessionStore } from '../stores/useSessionStore';

export const useLocationCollector = () => {
    const { config, setLocation } = useSessionStore();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!config?.settings.enableLocationCapture) return;

        if (!('geolocation' in navigator)) {
            setError('Geolocation not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                });
            },
            (err) => {
                setError(err.message);
                console.warn('Location capture failed:', err.message);
            }
        );
    }, [config, setLocation]);

    return { error };
};
