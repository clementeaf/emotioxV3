import type { SmartVOCMetrics } from '../../../../services/smartVOC.service';
import { MetricChartCard } from '../charts';

interface MetricsOverviewProps {
    metrics: SmartVOCMetrics;
}

export const MetricsOverview = ({ metrics }: MetricsOverviewProps) => {
    // Generate mock data for charts (replace with real data from API)
    const generateMonthlyData = (scores: number[]) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return months.map((month, i) => ({
            date: month,
            satisfied: scores[i] || Math.random() * 100,
            dissatisfied: 100 - (scores[i] || Math.random() * 100)
        }));
    };

    return (
        <div className="space-y-6">
            {/* CPV Metric Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Metrics Overview</h2>
                <div className="grid grid-cols-3 gap-4">
                    <MetricCard
                        label="CPV"
                        value={metrics.cpvValue.toFixed(1)}
                        subtitle={`Impact: ${metrics.impact}`}
                    />
                    <MetricCard
                        label="NPS Score"
                        value={metrics.npsScore.toString()}
                        subtitle={`${metrics.promoters}% promoters`}
                    />
                    <MetricCard
                        label="Satisfaction"
                        value={`${metrics.satisfaction}%`}
                        subtitle={`Retention: ${metrics.retention}%`}
                    />
                </div>
            </div>

            {/* CSAT, CES, CV Charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricChartCard
                    title="Customer Satisfaction"
                    score={metrics.satisfaction}
                    question="How satisfied are you with our service?"
                    data={generateMonthlyData(metrics.csatScores)}
                />
                <MetricChartCard
                    title="Customer Effort Score"
                    score={metrics.csatScores.length > 0 ? metrics.csatScores.reduce((a, b) => a + b, 0) / metrics.csatScores.length : 0}
                    question="How easy was it to use our service?"
                    data={generateMonthlyData(metrics.cesScores)}
                />
                <MetricChartCard
                    title="Cognitive Value"
                    score={metrics.cpvValue}
                    question="How valuable do you find our service?"
                    data={generateMonthlyData(metrics.cvScores)}
                />
            </div>
        </div>
    );
};

interface MetricCardProps {
    label: string;
    value: string;
    subtitle: string;
}

const MetricCard = ({ label, value, subtitle }: MetricCardProps) => {
    return (
        <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
    );
};
