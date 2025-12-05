import { Users, TrendingUp, CheckCircle, FileText } from 'lucide-react';
import type { ProcessedQuestionData } from '../../../../services/cognitiveTask.service';
import { ResponseDistributionChart, QuestionTypeBreakdownChart } from '../charts';

interface ResultsOverviewProps {
    totalParticipants: number;
    completionRate: number;
    totalResponses: number;
    processedData: ProcessedQuestionData[];
}

export const ResultsOverview = ({
    totalParticipants,
    completionRate,
    totalResponses,
    processedData
}: ResultsOverviewProps) => {
    // Generate data for charts
    const questionTypeData = processedData.reduce((acc, q) => {
        const type = q.questionType;
        if (!acc[type]) {
            acc[type] = { count: 0, totalTime: 0 };
        }
        acc[type].count++;
        return acc;
    }, {} as Record<string, { count: number; totalTime: number }>);

    const responseDistribution = Object.entries(questionTypeData).map(([type, data]) => ({
        questionType: type,
        count: data.count,
        avgResponseTime: 0 // Will be calculated from actual response times
    }));

    const total = Object.values(questionTypeData).reduce((sum, data) => sum + data.count, 0);
    const typeBreakdown = Object.entries(questionTypeData).map(([type, data]) => ({
        type,
        count: data.count,
        percentage: total > 0 ? (data.count / total) * 100 : 0
    }));

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
                <div className="grid grid-cols-4 gap-4">
                    <StatCard
                        icon={<Users className="h-5 w-5 text-blue-600" />}
                        label="Total Participants"
                        value={totalParticipants.toString()}
                        bgColor="bg-blue-50"
                    />
                    <StatCard
                        icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                        label="Completion Rate"
                        value={`${completionRate.toFixed(1)}%`}
                        bgColor="bg-green-50"
                    />
                    <StatCard
                        icon={<CheckCircle className="h-5 w-5 text-purple-600" />}
                        label="Total Responses"
                        value={totalResponses.toString()}
                        bgColor="bg-purple-50"
                    />
                    <StatCard
                        icon={<FileText className="h-5 w-5 text-orange-600" />}
                        label="Questions Analyzed"
                        value={processedData.length.toString()}
                        bgColor="bg-orange-50"
                    />
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Response Distribution */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Response Distribution</h3>
                    <div className="h-64">
                        <ResponseDistributionChart data={responseDistribution} className="h-full" />
                    </div>
                </div>

                {/* Question Type Breakdown */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Question Type Breakdown</h3>
                    <div className="h-64">
                        <QuestionTypeBreakdownChart data={typeBreakdown} className="h-full" />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    bgColor: string;
}

const StatCard = ({ icon, label, value, bgColor }: StatCardProps) => {
    return (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200">
            <div className={`${bgColor} p-3 rounded-lg`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
        </div>
    );
};
