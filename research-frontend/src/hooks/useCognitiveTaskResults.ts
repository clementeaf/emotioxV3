import { useState, useEffect } from 'react';
import * as analyticsService from '../services/analytics.service';
import type { CognitiveTaskResults } from '../services/analytics.service';

export const useCognitiveTaskResults = (researchId: string) => {
    const [data, setData] = useState<CognitiveTaskResults | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchResults = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const results = await analyticsService.getCognitiveTaskResults(researchId);
            setData(results);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch results'));
            console.error('Error fetching cognitive task results:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (researchId) {
            fetchResults();
        }
    }, [researchId]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchResults,
    };
};
