import { Navigate } from 'react-router-dom';
import { useIsAuthenticated, useAuthStore } from '../stores/auth.store';

/**
 * Wrapper for protected routes
 * Verifies authentication before rendering
 * Waits for session bootstrap to complete before redirecting
 */
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = useIsAuthenticated();
    const isLoading = useAuthStore((state) => state.isLoading);

    // Wait for session verification to complete
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

