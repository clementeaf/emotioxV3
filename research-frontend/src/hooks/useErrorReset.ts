import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook para resetear errores y navegar
 * Útil para componentes que necesitan resetear el estado después de un error
 */
export const useErrorReset = () => {
    const navigate = useNavigate();

    /**
     * Resetea el error y recarga la página actual
     */
    const resetAndReload = useCallback(() => {
        window.location.reload();
    }, []);

    /**
     * Resetea el error y navega a una ruta específica
     * @param path - Ruta a la que navegar
     */
    const resetAndNavigate = useCallback(
        (path: string) => {
            navigate(path, { replace: true });
        },
        [navigate]
    );

    /**
     * Resetea el error y vuelve a la página anterior
     */
    const resetAndGoBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    return {
        resetAndReload,
        resetAndNavigate,
        resetAndGoBack,
    };
};

