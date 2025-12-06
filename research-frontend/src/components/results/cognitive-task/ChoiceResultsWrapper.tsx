import { useChoiceResponses } from '../../../hooks/useChoiceResponses';
import { ChoiceQuestionCard } from './components/ChoiceQuestionCard';

interface ChoiceResultsWrapperProps {
    researchId: string;
    moduleId: string;
    moduleName: string;
    questionNumber: string;
    isSingleChoice: boolean;
}

export const ChoiceResultsWrapper = ({
    researchId,
    moduleId,
    moduleName,
    questionNumber,
    isSingleChoice
}: ChoiceResultsWrapperProps) => {
    const { data, isLoading } = useChoiceResponses(researchId, moduleId);

    if (isLoading || !data) {
        return (
            <div className="p-6 border rounded-lg bg-gray-50 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-32 bg-gray-200 rounded" />
            </div>
        );
    }

    // Map choice counts to options
    const options = data.choiceCounts.map((choice, index) => ({
        id: String(index + 1),
        text: choice.choice,
        percentage: Math.round(choice.percentage),
        color: '#6366F1' // Indigo color
    }));

    return (
        <ChoiceQuestionCard
            questionNumber={questionNumber}
            questionText={moduleName}
            questionType={isSingleChoice ? 'Single Choice question' : 'Multiple Choice question'}
            conditionalityDisabled={true}
            required={false}
            totalResponses={data.totalResponses}
            options={options}
        />
    );
};
