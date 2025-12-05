import { useState, useEffect } from 'react';
// import { smartVOCService } from '../services/smartVOC.service'; // TODO: Uncomment when API is ready
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
            
            // TODO: Replace with real API call when backend is ready
            // const analytics = await smartVOCService.getAnalytics(researchId);
            
            // Mock data for design review
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
            
            const mockAnalytics: SmartVOCAnalytics = {
                responses: [
                    {
                        id: '1',
                        research_id: researchId,
                        participant_id: 'p1',
                        question_key: 'nps',
                        question_type: 'NPS',
                        response_value: { score: 9 },
                        created_at: '2024-12-01T10:00:00Z'
                    },
                    {
                        id: '2',
                        research_id: researchId,
                        participant_id: 'p2',
                        question_key: 'nps',
                        question_type: 'NPS',
                        response_value: { score: 8 },
                        created_at: '2024-12-02T11:00:00Z'
                    },
                    {
                        id: '3',
                        research_id: researchId,
                        participant_id: 'p3',
                        question_key: 'csat',
                        question_type: 'CSAT',
                        response_value: { rating: 4 },
                        created_at: '2024-12-03T12:00:00Z'
                    }
                ],
                metrics: {
                    cpvValue: 7.8,
                    satisfaction: 85,
                    retention: 92,
                    npsScore: 45,
                    promoters: 60,
                    neutrals: 25,
                    detractors: 15,
                    csatScores: [78, 82, 85, 88, 84, 86],
                    cesScores: [65, 70, 72, 75, 73, 76],
                    cvScores: [80, 82, 78, 85, 83, 84],
                    impact: 'High',
                    trend: 'Increasing'
                },
                timeSeriesData: [
                    { date: '2024-11-25', score: 7.2, nps: 40, nev: 6.8, count: 12 },
                    { date: '2024-11-26', score: 7.4, nps: 42, nev: 7.0, count: 15 },
                    { date: '2024-11-27', score: 7.6, nps: 43, nev: 7.2, count: 18 },
                    { date: '2024-11-28', score: 7.5, nps: 41, nev: 7.1, count: 14 },
                    { date: '2024-11-29', score: 7.8, nps: 45, nev: 7.4, count: 20 },
                    { date: '2024-11-30', score: 7.9, nps: 46, nev: 7.5, count: 22 },
                    { date: '2024-12-01', score: 8.0, nps: 47, nev: 7.6, count: 25 }
                ],
                vocResponses: [
                    { text: 'Great service, very satisfied!', sentiment: 'positive' },
                    { text: 'The product quality exceeded my expectations', sentiment: 'positive' },
                    { text: 'Could improve response time', sentiment: 'neutral' },
                    { text: 'Overall good experience', sentiment: 'positive' },
                    { text: 'Not happy with delivery time', sentiment: 'negative' }
                ],
                monthlyNPSData: [
                    { month: 'Jul', promoters: 55, neutrals: 30, detractors: 15, npsRatio: 40, date: '2024-07-01' },
                    { month: 'Aug', promoters: 58, neutrals: 28, detractors: 14, npsRatio: 44, date: '2024-08-01' },
                    { month: 'Sep', promoters: 60, neutrals: 26, detractors: 14, npsRatio: 46, date: '2024-09-01' },
                    { month: 'Oct', promoters: 57, neutrals: 28, detractors: 15, npsRatio: 42, date: '2024-10-01' },
                    { month: 'Nov', promoters: 62, neutrals: 24, detractors: 14, npsRatio: 48, date: '2024-11-01' },
                    { month: 'Dec', promoters: 60, neutrals: 25, detractors: 15, npsRatio: 45, date: '2024-12-01' }
                ],
                emotionalStates: {
                    Feliz: 29,
                    Satisfecho: 42,
                    Confiado: 38,
                    Valorado: 18,
                    Cuidado: 16,
                    Seguro: 40,
                    Enfocado: 38,
                    Indulgente: 12,
                    Estimulado: 14,
                    Exploratorio: 30,
                    Interesado: 34,
                    Enérgico: 32,
                    Descontento: 42,
                    Frustrado: 48,
                    Irritado: 14,
                    Decepción: 12,
                    Estresado: 8,
                    Infeliz: 10,
                    Desatendido: 32,
                    Apresurado: 30
                }
            };
            
            setData(mockAnalytics);
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
