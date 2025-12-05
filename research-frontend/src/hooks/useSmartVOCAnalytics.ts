import { useState, useEffect } from 'react';
import { smartVOCService, type SmartVOCAnalytics } from '../services/smartVOC.service';

interface UseSmartVOCAnalyticsResult {
    data: SmartVOCAnalytics | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook for fetching SmartVOC analytics
 */
export const useSmartVOCAnalytics = (researchId: string | null): UseSmartVOCAnalyticsResult => {
    const [data, setData] = useState<SmartVOCAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = async () => {
        if (!researchId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const analytics = await smartVOCService.getAnalytics(researchId);
            setData(analytics);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
            setData(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, [researchId]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchData
    };
};
