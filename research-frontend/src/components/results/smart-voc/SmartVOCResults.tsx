import { useState, useEffect, useMemo } from 'react';
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
import { Filters, type DemographicFiltersState } from './components/Filters';
import * as analyticsService from '../../../services/analytics.service';
import { safeCalculatePercentage, calculateCSAT, calculateCES, calculateCV, hasScores } from '../shared/utils/calculations';
import { cn } from '../../../lib/utils';

interface SmartVOCResultsProps {
  researchId: string;
  className?: string;
}

/** Canonical NEV emotions: IDs match participant-frontend EmotionSelector (lowercase, no accents). Labels in Spanish for consistent display. */
const NEV_EMOTIONS: Array<{ id: string; label: string; isPositive: boolean }> = [
  { id: 'feliz', label: 'Feliz', isPositive: true },
  { id: 'satisfecho', label: 'Satisfecho', isPositive: true },
  { id: 'confiado', label: 'Confiado', isPositive: true },
  { id: 'valorado', label: 'Valorado', isPositive: true },
  { id: 'cuidado', label: 'Cuidado', isPositive: true },
  { id: 'seguro', label: 'Seguro', isPositive: true },
  { id: 'enfocado', label: 'Enfocado', isPositive: true },
  { id: 'indulgente', label: 'Indulgente', isPositive: true },
  { id: 'estimulado', label: 'Estimulado', isPositive: true },
  { id: 'exploratorio', label: 'Exploratorio', isPositive: true },
  { id: 'interesado', label: 'Interesado', isPositive: true },
  { id: 'energico', label: 'Enérgico', isPositive: true },
  { id: 'descontento', label: 'Descontento', isPositive: false },
  { id: 'frustrado', label: 'Frustrado', isPositive: false },
  { id: 'irritado', label: 'Irritado', isPositive: false },
  { id: 'decepcion', label: 'Decepción', isPositive: false },
  { id: 'estresado', label: 'Estresado', isPositive: false },
  { id: 'infeliz', label: 'Infeliz', isPositive: false },
  { id: 'desatendido', label: 'Desatendido', isPositive: false },
  { id: 'apresurado', label: 'Apresurado', isPositive: false }
];

/** Normalize emotion key for aggregation (lowercase, remove accents) so no records are lost. */
function normalizeEmotionKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0301/g, '')
    .replace(/\u0300/g, '')
    .replace(/[\u0302\u0303\u0308]/g, '');
}

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

/** Compute emotional states from NEV responses; keys normalized so no records are lost (e.g. Enérgico/energico -> energico). */
function computeEmotionalStates(nevResponses: Array<{ emotions: string[]; date: string }>): Record<string, number> {
  const states: Record<string, number> = {};
  nevResponses.forEach(r => {
    r.emotions.forEach(e => {
      const key = normalizeEmotionKey(e);
      states[key] = (states[key] || 0) + 1;
    });
  });
  return states;
}

export const SmartVOCResults = ({ researchId, className }: SmartVOCResultsProps) => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const { data, isLoading, error, refetch, isLive } = useSmartVOCAnalytics(researchId);

  // Demographic filters state (same pattern as CognitiveTaskResults)
  const [demographicData, setDemographicData] = useState<analyticsService.DemographicResponsesResult | null>(null);
  const [demographicFilters, setDemographicFilters] = useState<DemographicFiltersState>({});
  const [userIdFilter, setUserIdFilter] = useState('');

  useEffect(() => {
    if (!researchId) return;
    let cancelled = false;
    analyticsService.getDemographicResponses(researchId)
      .then((result) => { if (!cancelled) setDemographicData(result); })
      .catch(() => { if (!cancelled) setDemographicData({ participants: [], demographicTypes: [] }); });
    return () => { cancelled = true; };
  }, [researchId]);

  // Compute set of participant IDs matching current filters
  const filteredParticipantIds = useMemo(() => {
    if (!demographicData?.participants.length) return null;
    const hasAnyFilter = Object.values(demographicFilters).some((arr) => arr.length > 0) || userIdFilter.trim() !== '';
    if (!hasAnyFilter) return null;

    const idSet = new Set(
      demographicData.participants
        .filter((p) => {
          for (const [type, selected] of Object.entries(demographicFilters)) {
            if (selected.length === 0) continue;
            const val = p.demographics[type];
            const key = val != null && val !== '' ? String(val) : '—';
            if (!selected.includes(key)) return false;
          }
          if (userIdFilter.trim()) {
            if (!p.participantId.toLowerCase().includes(userIdFilter.trim().toLowerCase())) return false;
          }
          return true;
        })
        .map((p) => p.participantId)
    );
    return idSet;
  }, [demographicData?.participants, demographicFilters, userIdFilter]);

  // Helper: filter score arrays by participant when demographic filters are active
  const filterByParticipant = <T extends { participantId?: string }>(items: T[]): T[] => {
    if (!filteredParticipantIds) return items;
    return items.filter((item) => item.participantId && filteredParticipantIds.has(item.participantId));
  };

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

  // ========== DEMOGRAPHIC + TIME-RANGE FILTERED DATA ==========
  // All 5 panels use this filtered data instead of raw all-time data
  const filtered = useMemo(() => {
    if (!data) return null;

    // First apply demographic filter, then time-range filter
    const csatValues = filterByTimeRange(filterByParticipant(data.metrics.csatScores || []), timeRange).map(s => s.value);
    const cesValues = filterByTimeRange(filterByParticipant(data.metrics.cesScores || []), timeRange).map(s => s.value);
    const cvValues = filterByTimeRange(filterByParticipant(data.metrics.cvScores || []), timeRange).map(s => s.value);
    const npsFiltered = filterByTimeRange(filterByParticipant(data.metrics.npsScores || []), timeRange);
    const nevFiltered = filterByTimeRange(filterByParticipant(data.nevResponsesData || []), timeRange);
    const vocFiltered = filterByTimeRange(
      filterByParticipant(
        (data.vocResponses || [])
          .filter((v): v is typeof v & { createdAt: string } => !!v.createdAt)
          .map(v => ({ text: v.text, sentiment: v.sentiment, date: v.createdAt, participantId: v.participantId }))
      ),
      timeRange
    );
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
      ? Math.round((csatValues.filter((s: number) => s >= 4).length / csatValues.length) * 100) : 0;
    const cesPct = cesValues.length > 0
      ? Math.round((cesValues.filter((s: number) => s <= 2).length / cesValues.length) * 100) : 0;
    const cpvValue = csatPct - cesPct;

    return {
      csatValues, cesValues, cvValues, npsValues,
      promoters, neutrals, detractors, npsScore, cpvValue,
      emotionalStates,
      vocComments: vocFiltered.map(v => ({ text: v.text, mood: v.sentiment || 'Positive' })),
      vocExportRows: vocFiltered.map(v => ({ participantId: v.participantId ?? '', text: v.text, mood: v.sentiment })),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- filterByParticipant depends on filteredParticipantIds
  }, [data, timeRange, filteredParticipantIds]);

  // Check which metrics have actual data (all-time, for panel visibility)
  const hasCSAT = hasScores(data?.metrics.csatScores);
  const hasCES = hasScores(data?.metrics.cesScores);
  const hasCV = hasScores(data?.metrics.cvScores);
  const hasNEV = data?.nevResponsesData && data.nevResponsesData.length > 0;
  const hasNPS = hasScores(data?.metrics.npsScores);
  const hasVOC = data?.vocResponses && data.vocResponses.length > 0;

  // Build MetricCard chart data: group filtered scores by day (today/week) or use monthly (month)
  const buildChartData = (
    scores: Array<{ value: number; date: string; participantId?: string }>,
    positiveFn: (v: number) => boolean,
    negativeFn: (v: number) => boolean
  ) => {
    if (timeRange === 'month') return null; // use monthlyMetricsData below
    const filtered2 = filterByTimeRange(filterByParticipant(scores), timeRange);
    const byDay = new Map<string, number[]>();
    filtered2.forEach(s => {
      const dayKey = new Date(s.date).toDateString();
      if (!byDay.has(dayKey)) byDay.set(dayKey, []);
      byDay.get(dayKey)!.push(s.value);
    });
    return Array.from(byDay.entries())
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([dayKey, vals]) => ({
        date: new Date(dayKey).toISOString().split('T')[0],
        satisfied: vals.length > 0 ? Math.round((vals.filter(positiveFn).length / vals.length) * 100) : 0,
        dissatisfied: vals.length > 0 ? Math.round((vals.filter(negativeFn).length / vals.length) * 100) : 0,
      }));
  };

  const csatChartData = buildChartData(data?.metrics.csatScores || [], v => v >= 4, v => v <= 2)
    ?? (data?.monthlyMetricsData || []).map(m => ({ date: m.date, satisfied: m.csatSatisfied, dissatisfied: m.csatDissatisfied }));
  const cesChartData = buildChartData(data?.metrics.cesScores || [], v => v <= 2, v => v >= 4)
    ?? (data?.monthlyMetricsData || []).map(m => ({ date: m.date, satisfied: m.cesPositive, dissatisfied: m.cesNegative }));
  const cvChartData = buildChartData(data?.metrics.cvScores || [], v => v >= 4, v => v <= 2)
    ?? (data?.monthlyMetricsData || []).map(m => ({ date: m.date, satisfied: m.cvPositive, dissatisfied: m.cvNegative }));

  // Filter visible metric cards — scores from filtered data
  const visibleMetricCards = [
    { show: hasCSAT, component: <MetricCard key="csat" title="Customer Satisfaction" abbreviation="CSAT" score={calculateCSAT(filtered?.csatValues)} question="How satisfied are you with our service?" monthlyData={csatChartData} /> },
    { show: hasCES, component: <MetricCard key="ces" title="Customer Effort Score" abbreviation="CES" score={calculateCES(filtered?.cesValues)} question="How easy was it to use our service?" monthlyData={cesChartData} /> },
    { show: hasCV, component: <MetricCard key="cv" title="Cognitive Value" abbreviation="CV" score={calculateCV(filtered?.cvValues)} question="How valuable do you find our service?" monthlyData={cvChartData} /> }
  ].filter(card => card.show);
  // Determinar clases de grid para métricas
  const gridColsClass =
    visibleMetricCards.length === 1 ? 'grid-cols-1 md:grid-cols-1' :
    visibleMetricCards.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
    'grid-cols-1 md:grid-cols-3';

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
          { label: 'Easy', percentage: safeCalculatePercentage(filtered?.cesValues, (score) => score >= 4), color: 'bg-green-500' },
          { label: 'Neutral', percentage: safeCalculatePercentage(filtered?.cesValues, (score) => score === 3), color: 'bg-gray-400' },
          { label: 'Difficult', percentage: safeCalculatePercentage(filtered?.cesValues, (score) => score <= 2), color: 'bg-red-500' }
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

    const canonicalIds = new Set(NEV_EMOTIONS.map(e => e.id));
    const emotionalStatesList = [
      ...NEV_EMOTIONS.map(e => ({
        name: e.label,
        value: totalEmotions > 0 && states[e.id] ? Math.round((states[e.id] / totalEmotions) * 100) : 0,
        isPositive: e.isPositive
      })),
      ...Object.keys(states)
        .filter(k => !canonicalIds.has(k))
        .map(k => ({
          name: k,
          value: totalEmotions > 0 ? Math.round((states[k] / totalEmotions) * 100) : 0,
          isPositive: false
        }))
    ];

    const clusterFromStates = (emotionIds: string[]) => {
      return emotionIds.reduce((s, id) => s + (states[normalizeEmotionKey(id)] || states[id] || 0), 0);
    };

    const positiveTotal = NEV_EMOTIONS.filter(e => e.isPositive).reduce((s, e) => s + (states[e.id] || 0), 0);
    const negativeTotal = NEV_EMOTIONS.filter(e => !e.isPositive).reduce((s, e) => s + (states[e.id] || 0), 0);
    const nevScore = totalEmotions > 0
      ? Math.round(((positiveTotal - negativeTotal) / totalEmotions) * 100)
      : 0;

    questionCards.push(
      <NEVQuestionCard
        key="nev-detail"
        questionNumber={`2.${questionCounter}`}
        title="Net Emotional Value (NEV)"
        nevScore={nevScore}
        emotionalStates={emotionalStatesList}
        longTermClusters={[
          { name: 'Advocacy', emotions: ['confiado', 'valorado'] },
          { name: 'Recommendation', emotions: ['satisfecho', 'feliz'] },
          { name: 'Attention', emotions: ['interesado', 'exploratorio'] },
          { name: 'Desirability', emotions: ['estimulado', 'energico'] }
        ].map(c => {
          const value = Math.round((clusterFromStates(c.emotions) / totalForPct) * 10000) / 100;
          const trend: 'up' | 'down' = value > 0 ? 'up' : 'down';
          return { name: c.name, value, trend };
        })}
        shortTermClusters={[
          { name: 'Engagement', emotions: ['enfocado', 'indulgente', 'cuidado', 'seguro'] },
          { name: 'Destroying', emotions: ['frustrado', 'irritado', 'decepcion', 'descontento', 'estresado', 'infeliz', 'desatendido', 'apresurado'] }
        ].map(c => {
          const value = Math.round((clusterFromStates(c.emotions) / totalForPct) * 10000) / 100;
          const trend: 'up' | 'down' = c.name === 'Destroying' ? (value > 0 ? 'down' : 'up') : (value > 0 ? 'up' : 'down');
          return { name: c.name, value, trend };
        })}
      />
    );
  }

  if (hasNPS) {
    questionCounter++;
    // Adaptar datos según rango
    let npsChartData: Array<{ month: string; promoters: number; neutrals: number; detractors: number; npsRatio: number; date?: string }> = [];
    if (timeRange === 'month') {
      npsChartData = data?.monthlyNPSData || [];
    } else {
      // Agrupar scores filtrados por demografía + tiempo
      const filteredScores = filterByTimeRange(filterByParticipant(data?.metrics.npsScores || []), timeRange);
      const byDay = new Map<string, number[]>();
      filteredScores.forEach(item => {
        const dayKey = new Date(item.date).toDateString();
        if (!byDay.has(dayKey)) byDay.set(dayKey, []);
        byDay.get(dayKey)!.push(item.value);
      });
      npsChartData = Array.from(byDay.entries())
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([dayKey, scores]) => {
          const p = scores.filter(s => s >= 9).length;
          const n = scores.filter(s => s >= 7 && s <= 8).length;
          const d = scores.filter(s => s <= 6).length;
          const total = p + n + d || 1;
          const nps = scores.length > 0 ? Math.round(((p - d) / scores.length) * 100) : 0;
          return {
            month: new Date(dayKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            promoters: Math.round((p / total) * 100),
            neutrals: Math.round((n / total) * 100),
            detractors: Math.round((d / total) * 100),
            npsRatio: nps,
            date: dayKey
          };
        });
    }
    questionCards.push(
      <NPSAnalysis
        key="nps-detail"
        monthlyData={npsChartData}
        score={filtered?.npsScore || 0}
        promoters={filtered?.promoters || 0}
        neutrals={filtered?.neutrals || 0}
        detractors={filtered?.detractors || 0}
        totalResponses={filtered?.npsValues?.length || 0}
        questionText="On a scale from 0-10, how likely are you to recommend [company] to a friend or colleague?"
        questionNumber={`2.${questionCounter}`}
        title="Net Promoter Score (NPS)"
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
        researchId={researchId}
        cognitiveExportRows={filtered?.vocExportRows}
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
      {/* Mensaje aclaratorio sobre tiempo real */}
      {!isLive && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-700">
            <strong>Nota:</strong> Los resultados no se actualizan en tiempo real. Para ver los datos más recientes, reconecta el monitoreo o recarga la página.
          </p>
        </div>
      )}
      <div className={cn('max-h-[calc(100vh-9rem)] overflow-y-auto', className)}>
        {/* Sticky top bar: CPV + Time Range Selector */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm pb-3 mb-4">
          <div className="flex items-center gap-4">
            <CPVCard value={filtered?.cpvValue || 0} />
            <div className="flex gap-4">
              {(['today', 'week', 'month'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-full transition-colors',
                    timeRange === range
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {range === 'today' ? 'Today' : range === 'week' ? 'Week' : 'Month'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trust Flow Chart — full width */}
        <div className="mb-6">
          <TrustFlowChart
            dailyData={trustFlowDailyData}
            intradayData={trustFlowIntradayData}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        </div>

        {/* Metrics Cards: Only show cards with data */}
        {visibleMetricCards.length > 0 && (
          <div className={cn('grid gap-6 mb-6', gridColsClass)}>
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
            <Filters
              researchId={researchId}
              demographicData={demographicData}
              selectedFilters={demographicFilters}
              onFilterChange={setDemographicFilters}
              userIdFilter={userIdFilter}
              onUserIdFilterChange={setUserIdFilter}
            />
          </div>
        </div>
      </div>
    </ResultsStateHandler>
  );
};
