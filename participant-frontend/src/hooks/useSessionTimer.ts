import { useEffect, useRef } from 'react';
import { useSessionStore } from '../stores/useSessionStore';

const IDLE_TIMEOUT = 30000; // 30 segundos sin actividad = idle

/**
 * Hook para trackear tiempo de sesión, tiempo de foco y tiempo idle.
 * Uses refs for store actions to keep the effect stable (single mount/unmount).
 */
export const useSessionTimer = () => {
    const storeRef = useRef(useSessionStore.getState());
    const focusTimeRef = useRef(0);
    const idleTimeRef = useRef(0);
    const lastActivityRef = useRef(0);
    const isIdleRef = useRef(false);
    const focusStartRef = useRef<number | null>(null);

    useEffect(() => {
        const store = storeRef.current;

        // Initialize on mount
        lastActivityRef.current = Date.now();
        store.startSession();
        focusStartRef.current = Date.now();

        // Trackear actividad del usuario
        const handleActivity = () => {
            lastActivityRef.current = Date.now();
            if (isIdleRef.current) {
                isIdleRef.current = false;
                focusStartRef.current = Date.now();
            }
        };

        // Trackear cuando la ventana pierde/gana foco
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Ventana perdió foco
                if (focusStartRef.current) {
                    focusTimeRef.current += Date.now() - focusStartRef.current;
                    focusStartRef.current = null;
                }
            } else {
                // Ventana ganó foco
                focusStartRef.current = Date.now();
                lastActivityRef.current = Date.now();
                isIdleRef.current = false;
            }
        };

        // Intervalo para detectar idle
        const idleInterval = setInterval(() => {
            const timeSinceActivity = Date.now() - lastActivityRef.current;

            if (timeSinceActivity > IDLE_TIMEOUT && !isIdleRef.current && !document.hidden) {
                // Usuario está idle
                isIdleRef.current = true;
                if (focusStartRef.current) {
                    focusTimeRef.current += Date.now() - focusStartRef.current;
                    focusStartRef.current = null;
                }
            }

            // Actualizar idle time si está idle
            if (isIdleRef.current) {
                idleTimeRef.current += 1000; // Incrementar 1 segundo
            }
        }, 1000);

        // Actualizar métricas periódicamente
        const metricsInterval = setInterval(() => {
            let currentFocusTime = focusTimeRef.current;
            if (focusStartRef.current && !isIdleRef.current && !document.hidden) {
                currentFocusTime += Date.now() - focusStartRef.current;
            }

            useSessionStore.getState().updateMetrics({
                focusTime: currentFocusTime,
                idleTime: idleTimeRef.current,
            });
        }, 5000); // Cada 5 segundos

        // Event listeners para actividad
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            // Calcular tiempo final
            if (focusStartRef.current && !isIdleRef.current && !document.hidden) {
                focusTimeRef.current += Date.now() - focusStartRef.current;
            }

            useSessionStore.getState().updateMetrics({
                focusTime: focusTimeRef.current,
                idleTime: idleTimeRef.current,
            });

            useSessionStore.getState().endSession();
            clearInterval(idleInterval);
            clearInterval(metricsInterval);

            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });

            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []); // Empty deps — runs once per mount
};
