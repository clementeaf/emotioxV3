import { useState, useMemo } from 'react';
import { useSmartVOCAnalytics } from '../../../hooks/useSmartVOCAnalytics';
import { ResultsStateHandler } from '../shared/ResultsStateHandler';
import { SmartVOCResultsSkeleton } from './components/SmartVOCResultsSkeleton';
import { CPVCard } from './components/CPVCard';
import { TrustFlowChart } from './components/TrustFlowChart';
import { MetricCard } from './components/MetricCard';
import { NPSAnalysis } from './components/NPSAnalysis';
import { EmotionalStates } from './components/EmotionalStates';
import { VOCComments } from './components/VOCComments';
import { Filters } from './components/Filters';
import { safeCalculateAverage, hasScores } from '../shared/utils/calculations';

interface SmartVOCResultsProps {
  researchId: string;
  className?: string;
}

export const SmartVOCResults = ({ researchId, className }: SmartVOCResultsProps) => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('month');
  const { data, isLoading, error, refetch } = useSmartVOCAnalytics(researchId);

  const trustFlowData = useMemo(() => {
    return (data?.timeSeriesData || []).map(item => ({
      stage: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      nps: item.nps,
      nev: item.nev,
      timestamp: item.date
    }));
  }, [data?.timeSeriesData]);

  const emotionalData = useMemo(() => {
    if (!data?.emotionalStates) return [];
    return Object.entries(data.emotionalStates).map(([emotion, count]) => ({
      emotion,
      count,
      percentage: 0 // Will be calculated in component
    }));
  }, [data?.emotionalStates]);

  return (
    <ResultsStateHandler
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      loadingSkeleton={<SmartVOCResultsSkeleton />}
    >
      <div className={className}>
        {/* Top Section: CPV + Trust Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-1">
            <CPVCard
              value={data?.metrics.cpvValue || 0}
              satisfaction={data?.metrics.satisfaction || 0}
              retention={data?.metrics.retention || 0}
              impact={data?.metrics.impact || 'Low'}
              trend={data?.metrics.trend || 'Neutral'}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              hasData={!!data}
            />
          </div>
          <div className="md:col-span-2">
            <TrustFlowChart
              data={trustFlowData}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </div>
        </div>

        {/* Metrics Cards: CSAT, CES, CV */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <MetricCard
            title="Customer Satisfaction"
            abbreviation="CSAT"
            score={safeCalculateAverage(data?.metrics.csatScores)}
            question="How satisfied are you with our service?"
            hasData={hasScores(data?.metrics.csatScores)}
          />
          <MetricCard
            title="Customer Effort Score"
            abbreviation="CES"
            score={safeCalculateAverage(data?.metrics.cesScores)}
            question="How easy was it to use our service?"
            hasData={hasScores(data?.metrics.cesScores)}
          />
          <MetricCard
            title="Cognitive Value"
            abbreviation="CV"
            score={safeCalculateAverage(data?.metrics.cvScores)}
            question="How valuable do you find our service?"
            hasData={hasScores(data?.metrics.cvScores)}
          />
        </div>

        {/* Main Content + Sidebar */}
        <div className="flex gap-6">
          <div className="flex-1 space-y-6">
            <NPSAnalysis
              npsScore={data?.metrics.npsScore || 0}
              promoters={data?.metrics.promoters || 0}
              neutrals={data?.metrics.neutrals || 0}
              detractors={data?.metrics.detractors || 0}
              monthlyData={data?.monthlyNPSData || []}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
            
            <EmotionalStates data={emotionalData} />
            
            <VOCComments comments={data?.vocResponses || []} />
          </div>

          <div className="w-80 shrink-0">
            <Filters researchId={researchId} />
          </div>
        </div>
      </div>
    </ResultsStateHandler>
  );
};
