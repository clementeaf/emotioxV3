import { useState, useEffect } from 'react';
import { cognitiveTaskService, type CognitiveTaskAnalytics } from '../services/cognitiveTask.service';

interface UseCognitiveTaskAnalyticsResult {
    data: CognitiveTaskAnalytics | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

/**
 * Hook for fetching Cognitive Task analytics
 */
export const useCognitiveTaskAnalytics = (
    researchId: string | null
): UseCognitiveTaskAnalyticsResult => {
    const [data, setData] = useState<CognitiveTaskAnalytics | null>(null);
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
            const analytics = await cognitiveTaskService.getAnalytics(researchId);
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
