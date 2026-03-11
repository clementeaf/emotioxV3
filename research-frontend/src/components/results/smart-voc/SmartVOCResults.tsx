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

const POSITIVE_EMOTIONS = [
  'joy', 'anticipation', 'trust', 'surprise',
  'feliz', 'satisfecho', 'confiado', 'valorado', 'cuidado', 'seguro',
  'enfocado', 'indulgente', 'estimulado', 'exploratorio', 'interesado', 'enérgico'
];

const NEGATIVE_EMOTIONS = [
  'sadness', 'fear', 'anger', 'disgust',
  'descontento', 'frustrado', 'irritado', 'decepción'
];

/** Filter timestamped items by time range */
function filterByTimeRange<T extends { date: string }>(
  items: T[],
  range: 'today' | 'week' | 'month'
): T[] {
  if (!items || items.length === 0) return [];
  const now = new Date();
  let cutoff: Date;
  switch (range) {
    case 'today':
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      break;
    case 'month':
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      break;
  }
  return items.filter(item => new Date(item.date) >= cutoff);
}

/** Compute emotional states record from timestamped NEV responses */
function computeEmotionalStates(nevResponses: Array<{ emotions: string[]; date: string }>): Record<string, number> {
  const states: Record<string, number> = {};
  nevResponses.forEach(r => {
    r.emotions.forEach(e => { states[e] = (states[e] || 0) + 1; });
  });
  return states;
}

export const SmartVOCResults = ({ researchId, className }: SmartVOCResultsProps) => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const { data, isLoading, error, refetch } = useSmartVOCAnalytics(researchId);

  // Trust Flow chart data (separate from filtered metrics)
  const trustFlowDailyData = useMemo(() => {
    return (data?.timeSeriesData || []).map(item => ({
      stage: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      nps: item.nps,
      nev: item.nev,
      timestamp: item.date
    }));
  }, [data?.timeSeriesData]);

  const trustFlowIntradayData = useMemo(() => {
    return (data?.intradayTimeSeriesData || []).map(item => ({
      stage: item.label,
      nps: item.nps,
      nev: item.nev,
      timestamp: item.date
    }));
  }, [data?.intradayTimeSeriesData]);

  // ========== TIME-RANGE FILTERED DATA ==========
  // All 5 panels use this filtered data instead of raw all-time data
  const filtered = useMemo(() => {
    if (!data) return null;

    // Filter timestamped scores by time range
    const csatFiltered = filterByTimeRange(data.metrics.csatScores || [], timeRange);
    const cesFiltered = filterByTimeRange(data.metrics.cesScores || [], timeRange);
    const cvFiltered = filterByTimeRange(data.metrics.cvScores || [], timeRange);
    const npsFiltered = filterByTimeRange(data.metrics.npsScores || [], timeRange);
    const nevFiltered = filterByTimeRange(data.nevResponsesData || [], timeRange);
    const vocFiltered = filterByTimeRange(
      (data.vocResponses || [])
        .filter((v): v is typeof v & { createdAt: string } => !!v.createdAt)
        .map(v => ({ text: v.text, sentiment: v.sentiment, date: v.createdAt })),
      timeRange
    );

    // Extract number arrays for calculation functions
    const csatValues = csatFiltered.map(s => s.value);
    const cesValues = cesFiltered.map(s => s.value);
    const cvValues = cvFiltered.map(s => s.value);
    const npsValues = npsFiltered.map(s => s.value);

    // NPS aggregates
    const promoters = npsValues.filter(s => s >= 9).length;
    const neutrals = npsValues.filter(s => s >= 7 && s <= 8).length;
    const detractors = npsValues.filter(s => s <= 6).length;
    const npsScore = npsValues.length > 0
      ? Math.round(((promoters - detractors) / npsValues.length) * 100) : 0;

    // Emotional states from filtered NEV responses
    const emotionalStates = computeEmotionalStates(nevFiltered);

    // CPV
    const csatPct = csatValues.length > 0
      ? Math.round((csatValues.filter(s => s >= 4).length / csatValues.length) * 100) : 0;
    const cesPct = cesValues.length > 0
      ? Math.round((cesValues.filter(s => s <= 2).length / cesValues.length) * 100) : 0;
    const cpvValue = cesPct > 0 ? Math.round((csatPct / cesPct) * 100) / 100 : 0;

    return {
      csatValues, cesValues, cvValues, npsValues,
      promoters, neutrals, detractors, npsScore, cpvValue,
      emotionalStates,
      vocComments: vocFiltered.map(v => ({ text: v.text, mood: v.sentiment || 'Positive' }))
    };
  }, [data, timeRange]);

  // Check which metrics have actual data (all-time, for panel visibility)
  const hasCSAT = hasScores(data?.metrics.csatScores);
  const hasCES = hasScores(data?.metrics.cesScores);
  const hasCV = hasScores(data?.metrics.cvScores);
  const hasNEV = data?.nevResponsesData && data.nevResponsesData.length > 0;
  const hasNPS = hasScores(data?.metrics.npsScores);
  const hasVOC = data?.vocResponses && data.vocResponses.length > 0;

  // Map monthly metrics for MetricCard charts
  const csatMonthly = (data?.monthlyMetricsData || []).map(m => ({ date: m.date, satisfied: m.csatSatisfied, dissatisfied: m.csatDissatisfied }));
  const cesMonthly = (data?.monthlyMetricsData || []).map(m => ({ date: m.date, satisfied: m.cesPositive, dissatisfied: m.cesNegative }));
  const cvMonthly = (data?.monthlyMetricsData || []).map(m => ({ date: m.date, satisfied: m.cvPositive, dissatisfied: m.cvNegative }));

  // Filter visible metric cards — scores from filtered data
  const visibleMetricCards = [
    { show: hasCSAT, component: <MetricCard key="csat" title="Customer Satisfaction" abbreviation="CSAT" score={calculateCSAT(filtered?.csatValues)} question="How satisfied are you with our service?" monthlyData={csatMonthly} /> },
    { show: hasCES, component: <MetricCard key="ces" title="Customer Effort Score" abbreviation="CES" score={calculateCES(filtered?.cesValues)} question="How easy was it to use our service?" monthlyData={cesMonthly} /> },
    { show: hasCV, component: <MetricCard key="cv" title="Cognitive Value" abbreviation="CV" score={calculateCV(filtered?.cvValues)} question="How valuable do you find our service?" monthlyData={cvMonthly} /> }
  ].filter(card => card.show);

  // Generate question cards — all using filtered data
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
        score={Math.round(calculateCSAT(filtered?.csatValues))}
        responses={filtered?.csatValues?.length || 0}
        breakdown={[
          { label: 'Promoters', percentage: safeCalculatePercentage(filtered?.csatValues, (score) => score >= 4), color: 'bg-green-500' },
          { label: 'Neutrals', percentage: safeCalculatePercentage(filtered?.csatValues, (score) => score === 3), color: 'bg-gray-400' },
          { label: 'Detractors', percentage: safeCalculatePercentage(filtered?.csatValues, (score) => score <= 2), color: 'bg-red-500' }
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
        score={Math.round(calculateCES(filtered?.cesValues))}
        responses={filtered?.cesValues?.length || 0}
        breakdown={[
          { label: 'Little effort', percentage: safeCalculatePercentage(filtered?.cesValues, (score) => score <= 2), color: 'bg-green-500' },
          { label: 'Neutrals', percentage: safeCalculatePercentage(filtered?.cesValues, (score) => score === 3), color: 'bg-gray-400' },
          { label: 'Much effort', percentage: safeCalculatePercentage(filtered?.cesValues, (score) => score >= 4), color: 'bg-red-500' }
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
        score={Math.round(calculateCV(filtered?.cvValues))}
        responses={filtered?.cvValues?.length || 0}
        breakdown={[
          { label: 'Worth', percentage: safeCalculatePercentage(filtered?.cvValues, (score) => score >= 4), color: 'bg-green-500' },
          { label: 'Neutrals', percentage: safeCalculatePercentage(filtered?.cvValues, (score) => score === 3), color: 'bg-gray-400' },
          { label: 'Worthless', percentage: safeCalculatePercentage(filtered?.cvValues, (score) => score <= 2), color: 'bg-red-500' }
        ]}
      />
    );
  }

  if (hasNEV) {
    questionCounter++;
    const states = filtered?.emotionalStates || {};
    const totalEmotions = Object.values(states).reduce((sum, count) => sum + count, 0);
    const totalForPct = Math.max(totalEmotions, 1);

    const positiveCount = Object.entries(states)
      .filter(([emotion]) => POSITIVE_EMOTIONS.includes(emotion.toLowerCase()))
      .reduce((sum, [, count]) => sum + count, 0);
    const negativeCount = Object.entries(states)
      .filter(([emotion]) => NEGATIVE_EMOTIONS.includes(emotion.toLowerCase()))
      .reduce((sum, [, count]) => sum + count, 0);

    const emotionalStatesList = Object.entries(states).map(([name, count]) => ({
      name,
      value: totalEmotions > 0 ? Math.round((count / totalEmotions) * 100) : 0,
      isPositive: POSITIVE_EMOTIONS.includes(name.toLowerCase())
    }));

    const clusterFromStates = (emotions: string[]) => {
      return emotions.reduce((s, e) => s + (states[e] || states[e.charAt(0).toUpperCase() + e.slice(1)] || 0), 0);
    };

    questionCards.push(
      <NEVQuestionCard
        key="nev-detail"
        questionNumber={`2.${questionCounter}`}
        title="Net Emotional Value (NEV)"
        questionText="How do you feel about the experience offered by the [company]?"
        instructionsText="Please select up to 3 emotions from these 20 emotional moods"
        score={Math.round(totalEmotions * 0.56)}
        responses={totalEmotions}
        positivePercentage={Math.round((positiveCount / totalForPct) * 100) || 0}
        negativePercentage={Math.round((negativeCount / totalForPct) * 100) || 0}
        emotionalStates={emotionalStatesList}
        longTermClusters={[
          { name: 'Advocacy', emotions: ['confiado', 'valorado', 'trust'] },
          { name: 'Recommendation', emotions: ['satisfecho', 'feliz', 'joy'] },
          { name: 'Attention', emotions: ['interesado', 'exploratorio', 'anticipation'] },
          { name: 'Desirability', emotions: ['estimulado', 'enérgico', 'surprise'] }
        ].map(c => ({
          name: c.name,
          value: Math.round((clusterFromStates(c.emotions) / totalForPct) * 10000) / 100,
          trend: 'up' as const
        }))}
        shortTermClusters={[
          { name: 'Engagement', emotions: ['enfocado', 'indulgente', 'cuidado', 'seguro'] },
          { name: 'Destroying', emotions: ['frustrado', 'irritado', 'decepción', 'descontento', 'anger', 'disgust'] }
        ].map(c => ({
          name: c.name,
          value: Math.round((clusterFromStates(c.emotions) / totalForPct) * 10000) / 100,
          trend: c.name === 'Destroying' ? 'down' as const : 'up' as const
        }))}
      />
    );
  }

  if (hasNPS) {
    questionCounter++;
    questionCards.push(
      <NPSAnalysis
        key="nps-detail"
        monthlyData={data?.monthlyNPSData || []}
        score={filtered?.npsScore || 0}
        promoters={filtered?.promoters || 0}
        neutrals={filtered?.neutrals || 0}
        detractors={filtered?.detractors || 0}
        totalResponses={filtered?.npsValues?.length || 0}
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
        comments={filtered?.vocComments || []}
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
              value={filtered?.cpvValue || 0}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              cpvData={(data?.monthlyMetricsData || []).map(m => ({ date: m.date, cpv: m.cpv }))}
              hasData={!!data}
            />
          </div>
          <div className="md:col-span-2">
            <TrustFlowChart
              dailyData={trustFlowDailyData}
              intradayData={trustFlowIntradayData}
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
