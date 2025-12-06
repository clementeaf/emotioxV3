import { useRankingResponses } from '../../../hooks/useRankingResponses';
import { RankingQuestionCard } from './components/RankingQuestionCard';

interface RankingResultsWrapperProps {
    researchId: string;
    moduleId: string;
    moduleName: string;
    questionNumber: string;
}

export const RankingResultsWrapper = ({
    researchId,
    moduleId,
    moduleName,
    questionNumber
}: RankingResultsWrapperProps) => {
    const { data, isLoading } = useRankingResponses(researchId, moduleId);

    if (isLoading || !data) {
        return (
            <div className="p-6 border rounded-lg bg-gray-50 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-32 bg-gray-200 rounded" />
            </div>
        );
    }

    // Map rankings to options with distribution
    // Color palette for ranking segments (lightest to darkest indigo)
    const colors = ['#A5B4FC', '#818CF8', '#6366F1', '#4F46E5', '#4338CA', '#3730A3'];

    const options = data.rankings.map((ranking, index) => ({
        id: String(index + 1),
        label: ranking.item,
        mean: Math.round(ranking.meanPosition * 10) / 10,
        segments: colors.map((color, position) => ({
            position: position + 1,
            percentage: Math.round(100 / colors.length), // Equal distribution for now (TODO: get actual distribution)
            color
        }))
    }));

    return (
        <RankingQuestionCard
            questionNumber={questionNumber}
            questionText={moduleName}
            questionType="Ranking question"
            conditionalityDisabled={true}
            required={false}
            totalResponses={data.totalResponses}
            options={options}
        />
    );
};
