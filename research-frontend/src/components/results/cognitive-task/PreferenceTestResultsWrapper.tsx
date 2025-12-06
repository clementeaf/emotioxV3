import { usePreferenceTestResults } from '../../../hooks/usePreferenceTestResults';
import { PreferenceTestCard } from './components/PreferenceTestCard';

interface PreferenceTestResultsWrapperProps {
    researchId: string;
    moduleId: string;
    moduleName: string;
    questionNumber: string;
}

export const PreferenceTestResultsWrapper = ({
    researchId,
    moduleId,
    moduleName,
    questionNumber
}: PreferenceTestResultsWrapperProps) => {
    const { data, isLoading } = usePreferenceTestResults(researchId, moduleId);

    if (isLoading || !data) {
        return (
            <div className="p-6 border rounded-lg bg-gray-50 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-32 bg-gray-200 rounded" />
            </div>
        );
    }

    // Map selections to steps
    const steps = data.selections.map((selection) => ({
        stepNumber: selection.imageId,
        title: `Image ${selection.imageId}`,
        duration: `${Math.round(data.averageViewTime / 1000)}s`,
        completionRate: Math.round(selection.percentage),
        participantCount: data.totalResponses,
        selectionCount: selection.count,
        progressColor: selection.percentage > 50 ? '#9333EA' : '#6366F1'
    }));

    return (
        <PreferenceTestCard
            questionNumber={questionNumber}
            questionText={moduleName}
            questionType="Preference Test"
            conditionalityDisabled={true}
            required={false}
            steps={steps}
        />
    );
};
