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
import { VOCComments } from './components/VOCComments';
import { Filters } from './components/Filters';
import { safeCalculatePercentage, calculateCSAT, calculateCES, calculateCV, hasScores } from '../shared/utils/calculations';
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

  // Check which metrics have actual data
  const hasCSAT = hasScores(data?.metrics.csatScores);
  const hasCES = hasScores(data?.metrics.cesScores);
  const hasCV = hasScores(data?.metrics.cvScores);
  const hasNEV = data?.emotionalStates && Object.keys(data.emotionalStates).length > 0;
  const hasNPS = (data?.metrics.promoters || 0) + (data?.metrics.neutrals || 0) + (data?.metrics.detractors || 0) > 0;
  const hasVOC = data?.vocResponses && data.vocResponses.length > 0;

  // Map monthly metrics for each MetricCard
  const csatMonthly = (data?.monthlyMetricsData || []).map(m => ({ date: m.date, satisfied: m.csatSatisfied, dissatisfied: m.csatDissatisfied }));
  const cesMonthly = (data?.monthlyMetricsData || []).map(m => ({ date: m.date, satisfied: m.cesPositive, dissatisfied: m.cesNegative }));
  const cvMonthly = (data?.monthlyMetricsData || []).map(m => ({ date: m.date, satisfied: m.cvPositive, dissatisfied: m.cvNegative }));

  // Filter visible metric cards
  const visibleMetricCards = [
    { show: hasCSAT, component: <MetricCard key="csat" title="Customer Satisfaction" abbreviation="CSAT" score={calculateCSAT(data?.metrics.csatScores)} question="How satisfied are you with our service?" monthlyData={csatMonthly} /> },
    { show: hasCES, component: <MetricCard key="ces" title="Customer Effort Score" abbreviation="CES" score={calculateCES(data?.metrics.cesScores)} question="How easy was it to use our service?" monthlyData={cesMonthly} /> },
    { show: hasCV, component: <MetricCard key="cv" title="Cognitive Value" abbreviation="CV" score={calculateCV(data?.metrics.cvScores)} question="How valuable do you find our service?" monthlyData={cvMonthly} /> }
  ].filter(card => card.show);

  // Generate question cards only for metrics with data
  let questionCounter = 0;
  const questionCards = [];

  if (hasCSAT) {
    questionCounter++;
    questionCards.push(
      <QuestionCard
        key="csat-detail"
        questionNumber={`2.${questionCounter}`}
        title="Customer Satisfaction Score (CSAT)"
        questionText="How satisfied are you with our service?"
        score={Math.round(calculateCSAT(data?.metrics.csatScores))}
        responses={data?.metrics.csatScores?.length || 0}
        breakdown={[
          { label: 'Promoters', percentage: safeCalculatePercentage(data?.metrics.csatScores, (score) => score >= 4), color: 'bg-green-500' },
          { label: 'Neutrals', percentage: safeCalculatePercentage(data?.metrics.csatScores, (score) => score === 3), color: 'bg-gray-400' },
          { label: 'Detractors', percentage: safeCalculatePercentage(data?.metrics.csatScores, (score) => score <= 2), color: 'bg-red-500' }
        ]}
      />
    );
  }

  if (hasCES) {
    questionCounter++;
    questionCards.push(
      <QuestionCard
        key="ces-detail"
        questionNumber={`2.${questionCounter}`}
        title="Customer Effort Score (CES)"
        questionText="How easy was it to use our service?"
        score={Math.round(calculateCES(data?.metrics.cesScores))}
        responses={data?.metrics.cesScores?.length || 0}
        breakdown={[
          { label: 'Little effort', percentage: safeCalculatePercentage(data?.metrics.cesScores, (score) => score <= 2), color: 'bg-green-500' },
          { label: 'Neutrals', percentage: safeCalculatePercentage(data?.metrics.cesScores, (score) => score === 3), color: 'bg-gray-400' },
          { label: 'Much effort', percentage: safeCalculatePercentage(data?.metrics.cesScores, (score) => score >= 4), color: 'bg-red-500' }
        ]}
      />
    );
  }

  if (hasCV) {
    questionCounter++;
    questionCards.push(
      <QuestionCard
        key="cv-detail"
        questionNumber={`2.${questionCounter}`}
        title="Cognitive Value (CV)"
        questionText="How valuable do you find our service?"
        score={Math.round(calculateCV(data?.metrics.cvScores))}
        responses={data?.metrics.cvScores?.length || 0}
        breakdown={[
          { label: 'Worth', percentage: safeCalculatePercentage(data?.metrics.cvScores, (score) => score >= 4), color: 'bg-green-500' },
          { label: 'Neutrals', percentage: safeCalculatePercentage(data?.metrics.cvScores, (score) => score === 3), color: 'bg-gray-400' },
          { label: 'Worthless', percentage: safeCalculatePercentage(data?.metrics.cvScores, (score) => score <= 2), color: 'bg-red-500' }
        ]}
      />
    );
  }

  if (hasNEV) {
    questionCounter++;
    questionCards.push(
      <NEVQuestionCard
        key="nev-detail"
        questionNumber={`2.${questionCounter}`}
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
        longTermClusters={(() => {
          const states = data?.emotionalStates || {};
          const total = Object.values(states).reduce((s, c) => s + c, 0) || 1;
          const clusterDefs = [
            { name: 'Advocacy', emotions: ['confiado', 'valorado', 'trust'] },
            { name: 'Recommendation', emotions: ['satisfecho', 'feliz', 'joy'] },
            { name: 'Attention', emotions: ['interesado', 'exploratorio', 'anticipation'] },
            { name: 'Desirability', emotions: ['estimulado', 'enérgico', 'surprise'] }
          ];
          return clusterDefs.map(c => {
            const count = c.emotions.reduce((s, e) => s + (states[e] || states[e.charAt(0).toUpperCase() + e.slice(1)] || 0), 0);
            return { name: c.name, value: Math.round((count / total) * 10000) / 100, trend: 'up' as const };
          });
        })()}
        shortTermClusters={(() => {
          const states = data?.emotionalStates || {};
          const total = Object.values(states).reduce((s, c) => s + c, 0) || 1;
          const clusterDefs = [
            { name: 'Engagement', emotions: ['enfocado', 'indulgente', 'cuidado', 'seguro'] },
            { name: 'Destroying', emotions: ['frustrado', 'irritado', 'decepción', 'descontento', 'anger', 'disgust'] }
          ];
          return clusterDefs.map(c => {
            const count = c.emotions.reduce((s, e) => s + (states[e] || states[e.charAt(0).toUpperCase() + e.slice(1)] || 0), 0);
            const trend = c.name === 'Destroying' ? 'down' as const : 'up' as const;
            return { name: c.name, value: Math.round((count / total) * 10000) / 100, trend };
          });
        })()}
      />
    );
  }

  if (hasNPS) {
    questionCounter++;
    questionCards.push(
      <NPSAnalysis
        key="nps-detail"
        monthlyData={data?.monthlyNPSData || []}
        score={data?.metrics.npsScore || 0}
        promoters={data?.metrics.promoters || 0}
        neutrals={data?.metrics.neutrals || 0}
        detractors={data?.metrics.detractors || 0}
        totalResponses={data?.metrics.csatScores?.length || 0}
        questionText="On a scale from 0-10, how likely are you to recommend [company] to a friend or colleague?"
        questionNumber={`2.${questionCounter}`}
        title="Net Promoter Score (NPS)"
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
    );
  }

  if (hasVOC) {
    questionCounter++;
    questionCards.push(
      <VOCComments
        key="voc-detail"
        questionNumber={`2.${questionCounter}`}
        questionText="Voice of Customer (VOC)"
        comments={data?.vocResponses.map(voc => ({
          text: voc.text,
          mood: voc.sentiment || 'Positive'
        })) || []}
      />
    );
  }

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
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              cpvData={(data?.monthlyMetricsData || []).map(m => ({ date: m.date, cpv: m.cpv }))}
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

        {/* Metrics Cards: Only show cards with data */}
        {visibleMetricCards.length > 0 && (
          <div className={cn(
            'grid gap-6 mb-6',
            visibleMetricCards.length === 1 ? 'grid-cols-1 md:grid-cols-1' :
            visibleMetricCards.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            'grid-cols-1 md:grid-cols-3'
          )}>
            {visibleMetricCards.map(card => card.component)}
          </div>
        )}

        {/* Main Content + Sidebar */}
        <div className="flex gap-6">
          <div className="flex-1 space-y-6">
            {/* Question Cards: Only show cards with data */}
            {questionCards.length > 0 ? (
              questionCards
            ) : (
              <div className="text-center p-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No SmartVOC data available yet. Data will appear here once participants complete the surveys.</p>
              </div>
            )}
          </div>

          <div className="w-80 shrink-0">
            <Filters researchId={researchId} />
          </div>
        </div>
      </div>
    </ResultsStateHandler>
  );
};
