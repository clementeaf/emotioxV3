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

    // Collect all unique items and determine total positions
    const allItems = new Set<string>();
    // Each RankingResponse has `rankings: Array<{ item, meanPosition }>` but the raw backend
    // response also includes the ordered array.  We read it from the raw shape.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawResponses = data.responses as any[];
    rawResponses.forEach((r: Record<string, unknown>) => {
        const items = (Array.isArray(r.ranking) ? r.ranking : []) as string[];
        items.forEach(item => allItems.add(item));
    });
    const positionCount = allItems.size || 1;

    // Build distribution: for each item, count how many times it was placed at each position
    const distMap: Record<string, number[]> = {};
    for (const item of allItems) {
        distMap[item] = Array(positionCount).fill(0);
    }
    rawResponses.forEach((r: Record<string, unknown>) => {
        const items = (Array.isArray(r.ranking) ? r.ranking : []) as string[];
        items.forEach((item: string, idx: number) => {
            if (distMap[item] && idx < positionCount) {
                distMap[item][idx]++;
            }
        });
    });

    // Sort by mean position (best first)
    const options = data.rankings.map((ranking) => ({
        id: ranking.item,
        label: ranking.label || ranking.item,
        mean: Math.round(ranking.meanPosition * 10) / 10,
        distribution: distMap[ranking.item] || Array(positionCount).fill(0),
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
