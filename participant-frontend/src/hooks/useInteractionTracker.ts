import { useEffect, useCallback } from 'react';
import { useSessionStore } from '../stores/useSessionStore';

/**
 * Hook para trackear interacciones del usuario de manera no intrusiva
 */
export const useInteractionTracker = () => {
    const { config, trackInteraction } = useSessionStore();

    /**
     * Trackea un click del usuario
     */
    const trackClick = useCallback((target: string, metadata?: Record<string, unknown>) => {
        trackInteraction({
            type: 'click',
            target,
            metadata,
        });
    }, [trackInteraction]);

    /**
     * Trackea un input del usuario
     */
    const trackInput = useCallback((target: string, metadata?: Record<string, unknown>) => {
        trackInteraction({
            type: 'input',
            target,
            metadata,
        });
    }, [trackInteraction]);

    /**
     * Trackea un cambio de paso
     */
    const trackStepChange = useCallback((target: string, metadata?: Record<string, unknown>) => {
        trackInteraction({
            type: 'step_change',
            target,
            metadata,
        });
    }, [trackInteraction]);

    /**
     * Trackea eventos de foco
     */
    const trackFocus = useCallback((target: string, metadata?: Record<string, unknown>) => {
        trackInteraction({
            type: 'focus',
            target,
            metadata,
        });
    }, [trackInteraction]);

    /**
     * Trackea cuando el usuario pierde el foco
     */
    const trackBlur = useCallback((target: string, metadata?: Record<string, unknown>) => {
        trackInteraction({
            type: 'blur',
            target,
            metadata,
        });
    }, [trackInteraction]);

    useEffect(() => {
        if (!config?.settings.enableInteractionTracking) return;

        // Auto-trackear clicks globales está deshabilitado por defecto
        // Para habilitar, descomentar las líneas siguientes:
        // 
        // const handleGlobalClick = (e: MouseEvent) => {
        //     const target = e.target as HTMLElement;
        //     const targetInfo = target.tagName.toLowerCase() + 
        //         (target.id ? `#${target.id}` : '') + 
        //         (target.className ? `.${target.className.split(' ')[0]}` : '');
        //     
        //     trackClick('global', { targetInfo });
        // };
        // 
        // window.addEventListener('click', handleGlobalClick);
        // 
        // return () => {
        //     window.removeEventListener('click', handleGlobalClick);
        // };
    }, [config]);

    return {
        trackClick,
        trackInput,
        trackStepChange,
        trackFocus,
        trackBlur,
    };
};
