import { Navigate } from 'react-router-dom';
import { useIsAuthenticated } from '../stores/auth.store';

/**
 * Wrapper for protected routes
 * Verifies authentication before rendering
 */
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = useIsAuthenticated();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

