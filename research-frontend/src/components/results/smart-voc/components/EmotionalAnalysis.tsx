import type { SmartVOCTimeSeriesData } from '../../../../services/smartVOC.service';
import { EmotionalStatesChart } from '../charts';

interface EmotionalAnalysisProps {
    emotionalStates: Record<string, number>;
    timeSeriesData: SmartVOCTimeSeriesData[];
}

export const EmotionalAnalysis = ({ emotionalStates }: EmotionalAnalysisProps) => {
    const states = Object.entries(emotionalStates).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Transform emotional states for chart
    const total = Object.values(emotionalStates).reduce((sum, count) => sum + count, 0);
    const chartData = Object.entries(emotionalStates).map(([emotion, count]) => ({
        emotion,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
    }));

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Emotional States</h2>
            
            {/* Top 5 Emotions List */}
            <div className="space-y-3 mb-6">
                {states.map(([emotion, count]) => (
                    <div key={emotion} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-24 capitalize">{emotion}</span>
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

            {/* Emotional States Chart */}
            <div className="h-64 bg-gray-50 rounded-lg border border-gray-200 p-4">
                <EmotionalStatesChart data={chartData} className="h-full" />
            </div>
        </div>
    );
};
