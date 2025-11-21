import { Navigate } from 'react-router-dom';
import { useIsAuthenticated } from '../stores/auth.store';

/**
 * Wrapper para rutas protegidas
 * Verifica autenticación antes de renderizar
 */
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = useIsAuthenticated();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

