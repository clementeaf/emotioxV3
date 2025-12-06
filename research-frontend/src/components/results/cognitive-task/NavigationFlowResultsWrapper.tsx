import { useNavigationFlowResults } from '../../../hooks/useNavigationFlowResults';
import { NavigationTestCard } from './components/NavigationTestCard';

interface NavigationFlowResultsWrapperProps {
    researchId: string;
    moduleId: string;
    moduleName: string;
    questionNumber: string;
}

export const NavigationFlowResultsWrapper = ({
    researchId,
    moduleId,
    moduleName,
    questionNumber
}: NavigationFlowResultsWrapperProps) => {
    const { data, isLoading } = useNavigationFlowResults(researchId, moduleId);

    if (isLoading || !data) {
        return (
            <div className="p-6 border rounded-lg bg-gray-50 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-32 bg-gray-200 rounded" />
            </div>
        );
    }

    // Map responses to steps (one step per navigation flow)
    const steps = [{
        stepNumber: 1,
        title: moduleName,
        duration: `${data.averageDuration}s`,
        completionRate: Math.round(data.completionRate),
        participantCount: data.totalResponses,
        hasHeatmap: data.heatmapData.length > 0,
        aois: [] // TODO: Extract AOIs from hitZones if needed
    }];

    return (
        <NavigationTestCard
            questionNumber={questionNumber}
            questionText={moduleName}
            questionType="Navigation Test"
            conditionalityDisabled={true}
            required={false}
            steps={steps}
        />
    );
};
