import { useState, useEffect, useCallback } from 'react';
import * as analyticsService from '../services/analytics.service';
import type { NavigationFlowResults } from '../services/analytics.service';

export const useNavigationFlowResults = (researchId: string, moduleId: string) => {
    const [data, setData] = useState<NavigationFlowResults | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchResults = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const results = await analyticsService.getNavigationFlowResults(researchId, moduleId);
            setData(results);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch results'));
            console.error('Error fetching navigation flow results:', err);
        } finally {
            setIsLoading(false);
        }
    }, [researchId, moduleId]);

    useEffect(() => {
        if (researchId && moduleId) {
            fetchResults();
        }
    }, [researchId, moduleId, fetchResults]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchResults,
    };
};
