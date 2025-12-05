import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import type { CognitiveTaskResponse } from '../../../../services/cognitiveTask.service';

interface ResponsesTimelineProps {
    responses: CognitiveTaskResponse[];
}

export const ResponsesTimeline = ({ responses }: ResponsesTimelineProps) => {
    const sortedResponses = useMemo(() => {
        return [...responses].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 10);
    }, [responses]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Recent Responses</h2>
                <span className="text-sm text-gray-500">(Last 10)</span>
            </div>
            
            <div className="space-y-3">
                {sortedResponses.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                        No responses available yet
                    </p>
                ) : (
                    sortedResponses.map((response) => {
                        const { date, time } = formatDate(response.created_at);
                        return (
                            <div
                                key={response.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                        Question: {response.question_id.slice(0, 8)}...
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Participant: {response.participant_id.slice(0, 8)}... • Type: {response.question_type}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-medium text-gray-700">{date}</p>
                                    <p className="text-xs text-gray-500">{time}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
