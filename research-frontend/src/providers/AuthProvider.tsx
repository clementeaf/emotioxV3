import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';

/**
 * AuthProvider component
 * Responsible for bootstrapping the user session on application mount.
 * checks for existing cookies and initializes authentication state.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const bootstrapSession = useAuthStore((state) => state.bootstrapSession);
    const isLoading = useAuthStore((state) => state.isLoading);
    // We only want to block rendering on the *initial* bootstrap
    // isLoading might be true for other reasons (login actions), so we might need a separate 'isBootstrapping' flag 
    // but looking at the store, isLoading is set to true during bootstrap.
    // However, we don't want to block the UI during a standard login action, only on initial load if we are unsure.
    // Actually, checking store: bootstrapSession sets isLoading=true.
    // If we rely on store.isLoading globally, we might block UI unnecessarily.
    // But for this specific requirement (prevent redirect on refresh), we MUST wait for bootstrapSession to finish.

    useEffect(() => {
        bootstrapSession();
    }, [bootstrapSession]);

    // Simple loading state for initial session check
    // In a real production app we might want a splash screen here
    if (isLoading && !useAuthStore.getState().user) { // Only show loader if we are loading AND don't have a user yet (bootstrapping)
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return <>{children}</>;
};
