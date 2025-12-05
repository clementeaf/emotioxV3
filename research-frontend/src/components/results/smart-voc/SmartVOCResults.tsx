import { useState, useMemo } from 'react';
import { useSmartVOCAnalytics } from '../../../hooks/useSmartVOCAnalytics';
import { ResultsStateHandler } from '../shared/ResultsStateHandler';
import { SmartVOCResultsSkeleton } from './components/SmartVOCResultsSkeleton';
import { CPVCard } from './components/CPVCard';
import { TrustFlowChart } from './components/TrustFlowChart';
import { MetricCard } from './components/MetricCard';
import { QuestionCard } from './components/QuestionCard';
import { NEVQuestionCard } from './components/NEVQuestionCard';
import { NPSAnalysis } from './components/NPSAnalysis';
import { Filters } from './components/Filters';
import { safeCalculateAverage, safeCalculatePercentage, hasScores } from '../shared/utils/calculations';
import { cn } from '../../../lib/utils';

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

  return (
    <ResultsStateHandler
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      loadingSkeleton={<SmartVOCResultsSkeleton />}
    >
      <div className={cn('max-h-[calc(100vh-9rem)] overflow-y-auto', className)}>
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

        {/* Metrics Cards: CSAT, CES, CV - Small charts */}
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
            {/* Question Cards: CSAT, CES, CV - Detailed breakdown */}
            <QuestionCard
              questionNumber="2.1"
              title="Customer Satisfaction Score (CSAT)"
              questionText="How satisfied are you with our service?"
              score={Math.round(safeCalculateAverage(data?.metrics.csatScores))}
              responses={data?.metrics.csatScores?.length || 0}
              breakdown={[
                {
                  label: 'Promoters',
                  percentage: safeCalculatePercentage(data?.metrics.csatScores, (score) => score >= 4),
                  color: 'bg-green-500'
                },
                {
                  label: 'Neutrals',
                  percentage: safeCalculatePercentage(data?.metrics.csatScores, (score) => score === 3),
                  color: 'bg-gray-400'
                },
                {
                  label: 'Detractors',
                  percentage: safeCalculatePercentage(data?.metrics.csatScores, (score) => score <= 2),
                  color: 'bg-red-500'
                }
              ]}
            />
            <QuestionCard
              questionNumber="2.2"
              title="Customer Effort Score (CES)"
              questionText="How easy was it to use our service?"
              score={Math.round(safeCalculateAverage(data?.metrics.cesScores))}
              responses={data?.metrics.cesScores?.length || 0}
              breakdown={[
                {
                  label: 'Little effort',
                  percentage: safeCalculatePercentage(data?.metrics.cesScores, (score) => score <= 2),
                  color: 'bg-green-500'
                },
                {
                  label: 'Neutrals',
                  percentage: safeCalculatePercentage(data?.metrics.cesScores, (score) => score === 3),
                  color: 'bg-gray-400'
                },
                {
                  label: 'Much effort',
                  percentage: safeCalculatePercentage(data?.metrics.cesScores, (score) => score >= 4),
                  color: 'bg-red-500'
                }
              ]}
            />
            <QuestionCard
              questionNumber="2.3"
              title="Cognitive Value (CV)"
              questionText="How valuable do you find our service?"
              score={Math.round(safeCalculateAverage(data?.metrics.cvScores))}
              responses={data?.metrics.cvScores?.length || 0}
              breakdown={[
                {
                  label: 'Worth',
                  percentage: safeCalculatePercentage(data?.metrics.cvScores, (score) => score >= 4),
                  color: 'bg-green-500'
                },
                {
                  label: 'Neutrals',
                  percentage: safeCalculatePercentage(data?.metrics.cvScores, (score) => score === 3),
                  color: 'bg-gray-400'
                },
                {
                  label: 'Worthless',
                  percentage: safeCalculatePercentage(data?.metrics.cvScores, (score) => score <= 2),
                  color: 'bg-red-500'
                }
              ]}
            />
            
            {/* NEV Question Card */}
            <NEVQuestionCard
              questionNumber="2.4"
              title="Net Emotional Value (NEV)"
              questionText="How do you feel about the experience offered by the [company]?"
              instructionsText="Please select up to 3 emotions from these 20 emotional moods"
              score={Math.round((data?.metrics.csatScores?.length || 0) * 0.56)}
              responses={data?.metrics.csatScores?.length || 0}
              positivePercentage={Math.round(Object.entries(data?.emotionalStates || {}).filter(([emotion]) => 
                ['joy', 'anticipation', 'trust', 'surprise', 'feliz', 'satisfecho', 'confiado', 'valorado'].includes(emotion.toLowerCase())
              ).reduce((sum, [, count]) => sum + count, 0) / Math.max(Object.values(data?.emotionalStates || {}).reduce((sum, count) => sum + count, 0), 1) * 100) || 0}
              negativePercentage={Math.round(Object.entries(data?.emotionalStates || {}).filter(([emotion]) => 
                ['sadness', 'fear', 'anger', 'disgust', 'descontento', 'frustrado', 'irritado', 'decepción'].includes(emotion.toLowerCase())
              ).reduce((sum, [, count]) => sum + count, 0) / Math.max(Object.values(data?.emotionalStates || {}).reduce((sum, count) => sum + count, 0), 1) * 100) || 0}
              emotionalStates={(() => {
                const totalEmotions = Object.values(data?.emotionalStates || {}).reduce((sum, count) => sum + count, 0);
                return Object.entries(data?.emotionalStates || {}).map(([name, count]) => ({
                  name,
                  value: totalEmotions > 0 ? Math.round((count / totalEmotions) * 100) : 0,
                  isPositive: ['joy', 'anticipation', 'trust', 'surprise', 'feliz', 'satisfecho', 'confiado', 'valorado', 'cuidado', 'seguro', 'enfocado', 'indulgente', 'estimulado', 'exploratorio', 'interesado', 'enérgico'].includes(name.toLowerCase())
                }));
              })()}
              longTermClusters={[
                { name: 'Advocacy', value: 70.95, trend: 'up' as const },
                { name: 'Recommendation', value: 50.0, trend: 'down' as const },
                { name: 'Attention', value: 20.95, trend: 'up' as const },
                { name: 'Desirability', value: 35.5, trend: 'down' as const }
              ]}
              shortTermClusters={[
                { name: 'Attention', value: 93.5, trend: 'up' as const },
                { name: 'Destroying', value: 36.5, trend: 'down' as const }
              ]}
            />
            
            <NPSAnalysis
              monthlyData={data?.monthlyNPSData || []}
              score={data?.metrics.npsScore || 0}
              promoters={data?.metrics.promoters || 0}
              neutrals={data?.metrics.neutrals || 0}
              detractors={data?.metrics.detractors || 0}
              totalResponses={data?.metrics.csatScores?.length || 0}
              questionText="On a scale from 0-10, how likely are you to recommend [company] to a friend or colleague?"
              questionNumber="2.5"
              title="Net Promoter Score (NPS)"
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </div>

          <div className="w-80 shrink-0">
            <Filters researchId={researchId} />
          </div>
        </div>
      </div>
    </ResultsStateHandler>
  );
};
