import { useScaleResponses } from '../../../hooks/useScaleResponses';
import { LinearScaleQuestionCard } from './components/LinearScaleQuestionCard';

interface ScaleResultsWrapperProps {
    researchId: string;
    moduleId: string;
    moduleName: string;
    questionNumber: string;
}

export const ScaleResultsWrapper = ({
    researchId,
    moduleId,
    moduleName,
    questionNumber
}: ScaleResultsWrapperProps) => {
    const { data, isLoading } = useScaleResponses(researchId, moduleId);

    if (isLoading || !data) {
        return (
            <div className="p-6 border rounded-lg bg-gray-50 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-32 bg-gray-200 rounded" />
            </div>
        );
    }

    // Map distribution to options with color gradient
    const options = data.distribution
        .sort((a, b) => a.value - b.value)
        .map((dist) => {
            // Color gradient: red (low) -> gray (middle) -> green (high)
            const maxValue = Math.max(...data.distribution.map(d => d.value));
            let color = '#9CA3AF'; // Gray for middle values
            
            if (dist.value <= 2) {
                color = '#EF4444'; // Red for low values
            } else if (dist.value >= maxValue - 1) {
                color = '#10B981'; // Green for high values
            }

            return {
                value: dist.value,
                percentage: Math.round(dist.percentage),
                color
            };
        });

    return (
        <LinearScaleQuestionCard
            questionNumber={questionNumber}
            questionText={moduleName}
            questionType="Linear Scale question"
            conditionalityDisabled={true}
            required={false}
            totalResponses={data.totalResponses}
            options={options}
        />
    );
};
