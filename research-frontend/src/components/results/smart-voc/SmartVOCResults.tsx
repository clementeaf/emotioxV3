import { useParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useSmartVOCAnalytics } from '../../../hooks/useSmartVOCAnalytics';
import { ResultsLayout, LoadingState, EmptyState, ErrorState } from '../shared';
import { MetricsOverview } from './components/MetricsOverview';
import { NPSAnalysis } from './components/NPSAnalysis';
import { EmotionalAnalysis } from './components/EmotionalAnalysis';
import { VOCComments } from './components/VOCComments';
import { Filters } from './components/Filters';

/**
 * SmartVOC Results Page
 * Displays comprehensive analytics for SmartVOC responses
 */
export const SmartVOCResults = () => {
    const { id } = useParams<{ id: string }>();
    const { data, isLoading, error, refetch } = useSmartVOCAnalytics(id || null);

    // Loading state
    if (isLoading) {
        return (
            <ResultsLayout
                title="SmartVOC Results"
                description="Customer perception and emotional analysis"
            >
                <LoadingState message="Loading SmartVOC analytics..." />
            </ResultsLayout>
        );
    }

    // Error state
    if (error) {
        return (
            <ResultsLayout
                title="SmartVOC Results"
                description="Customer perception and emotional analysis"
            >
                <ErrorState
                    title="Failed to load SmartVOC results"
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
                title="SmartVOC Results"
                description="Customer perception and emotional analysis"
            >
                <EmptyState
                    icon={<BarChart3 className="h-8 w-8 text-gray-400" />}
                    title="No SmartVOC data available"
                    description="Start collecting responses from participants to see analytics here."
                />
            </ResultsLayout>
        );
    }

    return (
        <ResultsLayout
            title="SmartVOC Results"
            description={`Analyzing ${data.responses.length} participant responses`}
            filters={<Filters researchId={id || ''} />}
        >
            <div className="space-y-6">
                {/* Metrics Overview */}
                <MetricsOverview metrics={data.metrics} />

                {/* NPS Analysis */}
                <NPSAnalysis
                    npsData={data.metrics}
                    monthlyData={data.monthlyNPSData}
                    timeSeriesData={data.timeSeriesData}
                />

                {/* Emotional Analysis */}
                <EmotionalAnalysis
                    emotionalStates={data.emotionalStates}
                    timeSeriesData={data.timeSeriesData}
                />

                {/* VOC Comments */}
                <VOCComments comments={data.vocResponses} />
            </div>
        </ResultsLayout>
    );
};
