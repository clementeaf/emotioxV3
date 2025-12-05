import { useParams } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { useCognitiveTaskAnalytics } from '../../../hooks/useCognitiveTaskAnalytics';
import { ResultsLayout, LoadingState, EmptyState, ErrorState } from '../shared';
import { ResultsOverview } from './components/ResultsOverview';
import { QuestionAnalysis } from './components/QuestionAnalysis';
import { ResponsesTimeline } from './components/ResponsesTimeline';
import { Filters } from './components/Filters';

/**
 * Cognitive Task Results Page
 * Displays comprehensive analytics for Cognitive Task responses
 */
export const CognitiveTaskResults = () => {
    const { id } = useParams<{ id: string }>();
    const { data, isLoading, error, refetch } = useCognitiveTaskAnalytics(id || null);

    // Loading state
    if (isLoading) {
        return (
            <ResultsLayout
                title="Cognitive Task Results"
                description="Task performance and response analysis"
            >
                <LoadingState message="Loading Cognitive Task analytics..." />
            </ResultsLayout>
        );
    }

    // Error state
    if (error) {
        return (
            <ResultsLayout
                title="Cognitive Task Results"
                description="Task performance and response analysis"
            >
                <ErrorState
                    title="Failed to load Cognitive Task results"
                    message={error.message}
                    onRetry={refetch}
                />
            </ResultsLayout>
        );
    }

    // Empty state
    if (!data || data.responses.length === 0) {
        return (
            <ResultsLayout
                title="Cognitive Task Results"
                description="Task performance and response analysis"
            >
                <EmptyState
                    icon={<Brain className="h-8 w-8 text-gray-400" />}
                    title="No Cognitive Task data available"
                    description="Start collecting responses from participants to see analytics here."
                />
            </ResultsLayout>
        );
    }

    return (
        <ResultsLayout
            title="Cognitive Task Results"
            description={`Analyzing ${data.totalParticipants} participants with ${data.responses.length} responses`}
            filters={<Filters researchId={id || ''} />}
        >
            <div className="space-y-6">
                {/* Overview */}
                <ResultsOverview
                    totalParticipants={data.totalParticipants}
                    completionRate={data.completionRate}
                    totalResponses={data.responses.length}
                    processedData={data.processedData}
                />

                {/* Question Analysis */}
                <QuestionAnalysis processedData={data.processedData} />

                {/* Responses Timeline */}
                <ResponsesTimeline responses={data.responses} />
            </div>
        </ResultsLayout>
    );
};
