import type { SmartVOCMetrics } from '../../../../services/smartVOC.service';

interface MetricsOverviewProps {
    metrics: SmartVOCMetrics;
}

export const MetricsOverview = ({ metrics }: MetricsOverviewProps) => {
    return (
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
