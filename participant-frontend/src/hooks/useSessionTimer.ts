import { useEffect } from 'react';
import { useSessionStore } from '../stores/useSessionStore';

export const useSessionTimer = () => {
    const { startSession, endSession } = useSessionStore();

    useEffect(() => {
        startSession();

        // Optional: Capture end time on unmount or visibility change
        return () => {
            endSession();
        };
    }, [startSession, endSession]);
};
