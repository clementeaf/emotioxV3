import { useState, useEffect } from 'react';
import * as analyticsService from '../services/analytics.service';
import type { SmartVOCAnalytics } from '../services/smartVOC.service';

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
            
            // Fetch real data from backend
            const results = await analyticsService.getSmartVOCResults(researchId);
            
            // Map backend response to SmartVOCAnalytics format
            const analytics: SmartVOCAnalytics = {
                responses: [], // Backend doesn't return individual responses in this endpoint
                metrics: results.metrics,
                timeSeriesData: results.timeSeriesData,
                vocResponses: results.vocResponses,
                monthlyNPSData: results.monthlyNPSData,
                emotionalStates: results.emotionalStates
            };
            
            setData(analytics);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch SmartVOC analytics'));
            console.error('Error fetching SmartVOC analytics:', err);
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
