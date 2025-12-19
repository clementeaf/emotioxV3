import { useState, useEffect, useCallback } from 'react';
// import { cognitiveTaskService } from '../services/cognitiveTask.service'; // TODO: Uncomment when API is ready
import type { CognitiveTaskAnalytics } from '../services/cognitiveTask.service';

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

    const fetchData = useCallback(async () => {
        if (!researchId) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            
            // TODO: Replace with real API call when backend is ready
            // const analytics = await cognitiveTaskService.getAnalytics(researchId);
            
            // Mock data for design review
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
            
            const mockAnalytics: CognitiveTaskAnalytics = {
                responses: [
                    {
                        id: '1',
                        research_id: researchId,
                        participant_id: 'p1',
                        question_id: 'q1',
                        question_type: 'multiple_choice',
                        response_value: { selected: 'option_a' },
                        created_at: '2024-12-01T10:00:00Z'
                    },
                    {
                        id: '2',
                        research_id: researchId,
                        participant_id: 'p2',
                        question_id: 'q1',
                        question_type: 'multiple_choice',
                        response_value: { selected: 'option_b' },
                        created_at: '2024-12-01T11:00:00Z'
                    },
                    {
                        id: '3',
                        research_id: researchId,
                        participant_id: 'p1',
                        question_id: 'q2',
                        question_type: 'text',
                        response_value: { text: 'This is my response to the text question' },
                        created_at: '2024-12-01T12:00:00Z'
                    },
                    {
                        id: '4',
                        research_id: researchId,
                        participant_id: 'p3',
                        question_id: 'q3',
                        question_type: 'rating',
                        response_value: { rating: 4 },
                        created_at: '2024-12-02T09:00:00Z'
                    },
                    {
                        id: '5',
                        research_id: researchId,
                        participant_id: 'p2',
                        question_id: 'q2',
                        question_type: 'text',
                        response_value: { text: 'Another participant response' },
                        created_at: '2024-12-02T10:00:00Z'
                    }
                ],
                processedData: [
                    {
                        questionId: 'q1',
                        questionText: 'What is your preferred communication method?',
                        questionType: 'multiple_choice',
                        totalResponses: 12,
                        data: {
                            options: [
                                { label: 'Email', count: 5, percentage: 41.67 },
                                { label: 'Phone', count: 3, percentage: 25 },
                                { label: 'Video Call', count: 2, percentage: 16.67 },
                                { label: 'Chat', count: 2, percentage: 16.67 }
                            ]
                        }
                    },
                    {
                        questionId: 'q2',
                        questionText: 'What improvements would you suggest?',
                        questionType: 'text',
                        totalResponses: 8,
                        data: {
                            responses: [
                                { text: 'Better user interface', sentiment: 'neutral' },
                                { text: 'Faster response time', sentiment: 'neutral' },
                                { text: 'More features', sentiment: 'positive' }
                            ]
                        }
                    },
                    {
                        questionId: 'q3',
                        questionText: 'How would you rate the overall experience?',
                        questionType: 'rating',
                        totalResponses: 15,
                        data: {
                            average: 4.2,
                            distribution: [
                                { rating: 1, count: 0 },
                                { rating: 2, count: 1 },
                                { rating: 3, count: 3 },
                                { rating: 4, count: 6 },
                                { rating: 5, count: 5 }
                            ]
                        }
                    },
                    {
                        questionId: 'q4',
                        questionText: 'Would you recommend our service?',
                        questionType: 'yes_no',
                        totalResponses: 18,
                        data: {
                            yes: 14,
                            no: 4,
                            yesPercentage: 77.78,
                            noPercentage: 22.22
                        }
                    }
                ],
                totalParticipants: 25,
                completionRate: 72,
                totalResponses: 53
            };
            
            setData(mockAnalytics);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [researchId]);

    useEffect(() => {
        void fetchData();
    }, [researchId, fetchData]);

    return {
        data,
        isLoading,
        error,
        refetch: fetchData
    };
};
