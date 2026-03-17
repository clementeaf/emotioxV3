import { useScaleResponses } from '../../../hooks/useScaleResponses';
import { LinearScaleQuestionCard } from './components/LinearScaleQuestionCard';
import { triggerCsvDownload } from '../../../utils/csvDownload';

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

    const options = data.distribution
        .sort((a, b) => a.value - b.value)
        .map((dist) => {
            const maxValue = Math.max(...data.distribution.map(d => d.value));
            let color = '#9CA3AF';
            if (dist.value <= 2) color = '#EF4444';
            else if (dist.value >= maxValue - 1) color = '#10B981';
            return {
                value: dist.value,
                percentage: Math.round(dist.percentage),
                color
            };
        });

    const onDownloadCSV = (): void => {
        const header = ['participant_id', 'value', 'created_at'];
        const rows = (data.responses ?? []).map((r) => [
            String(r.participantId ?? '').replace(/"/g, '""'),
            String(r.value ?? ''),
            String(r.createdAt ?? '').replace(/"/g, '""'),
        ].map((v) => `"${v}"`).join(','));
        const csv = [header.join(','), ...rows].join('\n');
        const slug = questionNumber.replace(/\./g, '-');
        triggerCsvDownload(csv, `linear-scale-${slug}-${researchId}.csv`);
    };

    return (
        <LinearScaleQuestionCard
            questionNumber={questionNumber}
            questionText={moduleName}
            questionType="Linear Scale question"
            conditionalityDisabled={true}
            required={false}
            totalResponses={data.totalResponses}
            options={options}
            onDownloadCSV={onDownloadCSV}
        />
    );
};
