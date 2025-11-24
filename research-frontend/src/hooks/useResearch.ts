import { useState, useEffect } from 'react';
import { researchService, type Research } from '../services/research.service';

interface UseResearchResult {
    research: Research | null;
    loading: boolean;
    error: string;
    refetch: () => Promise<void>;
}

/**
 * Hook personalizado para cargar y gestionar datos de un research
 */
export const useResearch = (researchId: string | undefined): UseResearchResult => {
    const [research, setResearch] = useState<Research | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    const fetchResearch = async (): Promise<void> => {
        if (!researchId) {
            setError('No research ID provided');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            const response = await researchService.getById(researchId);
            setResearch(response.research);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load research';
            setError(errorMessage);
            setResearch(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchResearch();
    }, [researchId]);

    return {
        research,
        loading,
        error,
        refetch: fetchResearch,
    };
};

