import { useChoiceResponses } from '../../../hooks/useChoiceResponses';
import { ChoiceQuestionCard } from './components/ChoiceQuestionCard';

interface ChoiceResultsWrapperProps {
    researchId: string;
    moduleId: string;
    moduleName: string;
    questionNumber: string;
    isSingleChoice: boolean;
    filteredParticipantIds?: Set<string> | null;
}

export const ChoiceResultsWrapper = ({
    researchId,
    moduleId,
    moduleName,
    questionNumber,
    isSingleChoice,
    filteredParticipantIds
}: ChoiceResultsWrapperProps) => {
    const { data: rawData, isLoading } = useChoiceResponses(researchId, moduleId);

    // Apply participant filter
    const data = rawData && filteredParticipantIds
        ? (() => {
            const filtered = rawData.responses.filter(r => filteredParticipantIds.has(r.participantId));
            const counts: Record<string, number> = {};
            // Backend returns `choices` (array), frontend type says `choice` (string) — handle both
            filtered.forEach(r => {
                const choices = (r as unknown as { choices?: string[] }).choices ?? [r.choice];
                choices.forEach(c => { if (c) counts[c] = (counts[c] || 0) + 1; });
            });
            return {
                ...rawData,
                totalResponses: filtered.length,
                responses: filtered,
                choiceCounts: rawData.choiceCounts.map(cc => {
                    const count = counts[cc.choice] || 0;
                    return { ...cc, count, percentage: filtered.length > 0 ? (count / filtered.length) * 100 : 0 };
                }),
            };
        })()
        : rawData;

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
