import { useState, useEffect } from 'react';
import * as analyticsService from '../services/analytics.service';
import type { ScaleResponses } from '../services/analytics.service';

export const useScaleResponses = (researchId: string, moduleId: string) => {
    const [data, setData] = useState<ScaleResponses | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchResults = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const results = await analyticsService.getScaleResponses(researchId, moduleId);
            setData(results);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch results'));
            console.error('Error fetching scale responses:', err);
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
