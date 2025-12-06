import { useState, useEffect } from 'react';
import * as analyticsService from '../services/analytics.service';
import type { TextResponses } from '../services/analytics.service';

export const useTextResponses = (researchId: string, moduleId: string) => {
    const [data, setData] = useState<TextResponses | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchResults = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const results = await analyticsService.getTextResponses(researchId, moduleId);
            setData(results);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch results'));
            console.error('Error fetching text responses:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (researchId && moduleId) {
            fetchResults();
        }
    }, [researchId, moduleId]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchResults,
    };
};
