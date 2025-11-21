import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to reset errors and navigate
 * Useful for components that need to reset state after an error
 */
export const useErrorReset = () => {
    const navigate = useNavigate();

    /**
     * Resets the error and reloads the current page
     */
    const resetAndReload = useCallback(() => {
        window.location.reload();
    }, []);

    /**
     * Resets the error and navigates to a specific route
     * @param path - Route to navigate to
     */
    const resetAndNavigate = useCallback(
        (path: string) => {
            navigate(path, { replace: true });
        },
        [navigate]
    );

    /**
     * Resets the error and goes back to the previous page
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

