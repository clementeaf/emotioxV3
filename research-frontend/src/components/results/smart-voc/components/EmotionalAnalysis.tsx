import type { SmartVOCTimeSeriesData } from '../../../../services/smartVOC.service';

interface EmotionalAnalysisProps {
    emotionalStates: Record<string, number>;
    timeSeriesData: SmartVOCTimeSeriesData[];
}

export const EmotionalAnalysis = ({ emotionalStates }: EmotionalAnalysisProps) => {
    const states = Object.entries(emotionalStates).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Emotional States</h2>
            <div className="space-y-3">
                {states.map(([emotion, count]) => (
                    <div key={emotion} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-24">{emotion}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(count / Math.max(...Object.values(emotionalStates))) * 100}%` }}
                            />
                        </div>
                        <span className="text-sm text-gray-500">{count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
