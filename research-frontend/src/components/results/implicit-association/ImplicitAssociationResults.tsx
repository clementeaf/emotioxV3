import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { ResultsStateHandler } from '../shared/ResultsStateHandler';
import { Filters } from '../shared/Filters';
import { DataTable, type DataTableColumn } from '../../ui/DataTable';
import { useResultsFilter } from '../../../hooks/useResultsFilter';
import * as analyticsService from '../../../services/analytics.service';
import type { IATModuleResult, IATParticipantData } from '../../../services/analytics.service';

// Recharts Label `content` callback uses internal Props with RenderableText (includes `false`).
// A custom interface can't satisfy the overload without importing private types — eslint-disable is the pragmatic fix.

interface ImplicitAssociationResultsProps {
  researchId: string;
  className?: string;
}

// Chart color palette — matches reference design
const TARGET_COLORS = [
  '#4F46E5', // indigo/purple (Target 1 / Attribute 1)
  '#22D3EE', // cyan/light blue (Target 2 / Attribute 2)
  '#10B981', // green (Target 3)
  '#F59E0B', // amber (Target 4)
  '#EF4444', // red (Target 5)
];

// Reference line color
const REFERENCE_LINE_COLOR = '#EF4444';

// ==========================================
// ATTRIBUTE TESTING — RADAR CHART
// ==========================================

const AttributeTestingChart = ({ module: mod }: { module: IATModuleResult }) => {
  const radarData = mod.scores.map(score => {
    const entry: Record<string, string | number> = { attribute: score.attributeLabel };
    for (const target of mod.targets) {
      entry[target.name] = score.targetScores[target.id] ?? 0;
    }
    return entry;
  });

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        IAT - Reaction Time Test (Attribute Testing, RTT)
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Priming display time set in {mod.primingTime} ms
      </p>
      <div className="w-full" style={{ height: Math.max(450, mod.attributes.length * 30 + 200) }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#E5E7EB" />
            <PolarAngleAxis
              dataKey="attribute"
              tick={{ fontSize: 12, fill: '#374151' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[-100, 100]}
              tick={{ fontSize: 10, fill: '#9CA3AF' }}
              tickCount={5}
            />
            {mod.targets.map((target, i) => (
              <Radar
                key={target.id}
                name={target.name}
                dataKey={target.name}
                stroke={TARGET_COLORS[i % TARGET_COLORS.length]}
                fill={TARGET_COLORS[i % TARGET_COLORS.length]}
                fillOpacity={0.2}
                strokeWidth={2}
                dot={{ r: 4, fill: TARGET_COLORS[i % TARGET_COLORS.length] }}
              />
            ))}
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
            />
            <Tooltip
              formatter={(value: number, name: string) => [`${value}%`, name]}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: 12,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ==========================================
// COMPARING ATTRIBUTE — GROUPED BAR CHART
// ==========================================

const ComparingAttributeChart = ({ module: mod }: { module: IATModuleResult }) => {
  const barData = mod.scores.map(score => {
    const entry: Record<string, string | number> = { attribute: score.attributeLabel };
    for (const target of mod.targets) {
      entry[target.name] = score.targetScores[target.id] ?? 0;
    }
    return entry;
  });

  // Compute reference lines (average across all scores)
  const allValues = mod.scores.flatMap(s => Object.values(s.targetScores));
  const avg = allValues.length > 0
    ? Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length)
    : 0;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        IAT - Comparing Attribute
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Priming display time set in {mod.primingTime} ms
      </p>
      <div className="w-full" style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} barCategoryGap="20%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="attribute"
              tick={{ fontSize: 12, fill: '#374151' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              domain={[0, 120]}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            {/* Average reference line */}
            {avg > 0 && (
              <svg>
                <line
                  x1="0%"
                  y1={`${100 - (avg / 120) * 100}%`}
                  x2="100%"
                  y2={`${100 - (avg / 120) * 100}%`}
                  stroke={REFERENCE_LINE_COLOR}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              </svg>
            )}
            {mod.targets.map((target, i) => (
              <Bar
                key={target.id}
                dataKey={target.name}
                fill={TARGET_COLORS[i % TARGET_COLORS.length]}
                radius={[4, 4, 0, 0]}
                label={{
                  position: 'top' as const,
                  fontSize: 11,
                  fill: TARGET_COLORS[i % TARGET_COLORS.length],
                  content: ({ value, x, y, width // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts Label.Props internal type
}: any) => (
                    <text
                      x={(x ?? 0) + (width ?? 0) / 2}
                      y={(y ?? 0) - 6}
                      textAnchor="middle"
                      fontSize={11}
                      fill={TARGET_COLORS[i % TARGET_COLORS.length]}
                    >
                      {value}%
                    </text>
                  ),
                }}
              />
            ))}
            <Tooltip
              formatter={(value: number, name: string) => [`${value}%`, name]}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ==========================================
// OBJECTS COMPARING — HORIZONTAL DIVERGENT BAR CHART
// ==========================================

const ObjectsComparingChart = ({ module: mod }: { module: IATModuleResult }) => {
  // For Objects Comparing, targets = objects, attributes = 2 dimensions
  // Each object gets 2 bars: dimension-1 (negative side) and dimension-2 (positive side)
  const dim1 = mod.attributes[0];
  const dim2 = mod.attributes[1];

  const barData = mod.targets.map(target => {
    // Find the score entry that has this target's scores
    // In Objects Comparing, scores are per-dimension (attribute) with target scores
    const dim1Score = mod.scores.find(s => s.attributeId === dim1?.id)?.targetScores[target.id] ?? 0;
    const dim2Score = mod.scores.find(s => s.attributeId === dim2?.id)?.targetScores[target.id] ?? 0;

    return {
      object: target.name,
      [dim1?.label ?? 'Dimension 1']: -Math.abs(dim1Score), // negative side (left)
      [dim2?.label ?? 'Dimension 2']: Math.abs(dim2Score),  // positive side (right)
      // For labels
      dim1Value: Math.abs(dim1Score),
      dim2Value: Math.abs(dim2Score),
    };
  });

  const dim1Label = dim1?.label ?? 'Dimension 1';
  const dim2Label = dim2?.label ?? 'Dimension 2';

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        IAT - Comparing Objects
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Priming display time set in {mod.primingTime} ms
      </p>
      <div className="w-full" style={{ height: Math.max(300, mod.targets.length * 80 + 80) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barData}
            layout="vertical"
            barCategoryGap="30%"
            barGap={2}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              horizontal={false}
            />
            <XAxis
              type="number"
              domain={[-100, 100]}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={(v: number) => `${v}`}
            />
            <YAxis
              type="category"
              dataKey="object"
              tick={{ fontSize: 12, fill: '#374151' }}
              width={80}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <Bar
              dataKey={dim1Label}
              fill={TARGET_COLORS[0]}
              radius={[4, 0, 0, 4]}
              label={{
                position: 'left' as const,
                fontSize: 10,
                fill: TARGET_COLORS[0],
                content: ({ value, x, y, height // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts Label.Props internal type
}: any) => (
                  <text
                    x={(x ?? 0) - 6}
                    y={(y ?? 0) + (height ?? 0) / 2 + 4}
                    textAnchor="end"
                    fontSize={10}
                    fill={TARGET_COLORS[0]}
                  >
                    {Math.abs(value ?? 0)}%
                  </text>
                ),
              }}
            />
            <Bar
              dataKey={dim2Label}
              fill={TARGET_COLORS[1]}
              radius={[0, 4, 4, 0]}
              label={{
                position: 'right' as const,
                fontSize: 10,
                fill: TARGET_COLORS[1],
                content: ({ value, x, y, width, height // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts Label.Props internal type
}: any) => (
                  <text
                    x={(x ?? 0) + (width ?? 0) + 6}
                    y={(y ?? 0) + (height ?? 0) / 2 + 4}
                    textAnchor="start"
                    fontSize={10}
                    fill={TARGET_COLORS[1]}
                  >
                    {Math.abs(value ?? 0)}%
                  </text>
                ),
              }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [`${Math.abs(value)}%`, name]}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ==========================================
// D-SCORE CARD
// ==========================================

const EFFECT_COLORS: Record<string, { bg: string; text: string }> = {
  none: { bg: 'bg-gray-100', text: 'text-gray-600' },
  slight: { bg: 'bg-blue-50', text: 'text-blue-700' },
  moderate: { bg: 'bg-amber-50', text: 'text-amber-700' },
  strong: { bg: 'bg-red-50', text: 'text-red-700' },
};

const EFFECT_LABELS: Record<string, string> = {
  none: 'No effect',
  slight: 'Slight',
  moderate: 'Moderate',
  strong: 'Strong',
};

const dScoreColumns: DataTableColumn<IATParticipantData>[] = [
  { key: 'participant', header: 'Participant', render: (p) => <span className="font-mono text-gray-700">{p.participantId}</span> },
  { key: 'dScore', header: 'D-score', align: 'right', render: (p) => <span className="font-semibold text-gray-900">{p.dScore}</span> },
  {
    key: 'effect', header: 'Effect',
    render: (p) => {
      const ec = EFFECT_COLORS[p.dScoreEffect || 'none'];
      return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ec.bg} ${ec.text}`}>{EFFECT_LABELS[p.dScoreEffect || 'none']}</span>;
    },
  },
  { key: 'quality', header: 'Quality', accessor: 'quality', cellClassName: 'text-gray-500' },
];

type ErrorCombination = { targetName: string; attributeLabel: string; errorRate: number; errors: number; total: number };

const errorCombinationColumns: DataTableColumn<ErrorCombination>[] = [
  { key: 'target', header: 'Target', accessor: 'targetName', cellClassName: 'text-gray-700' },
  { key: 'attribute', header: 'Attribute', accessor: 'attributeLabel', cellClassName: 'text-gray-700' },
  {
    key: 'errorRate', header: 'Error Rate', align: 'right',
    render: (c) => <span className={`font-semibold ${c.errorRate > 20 ? 'text-red-600' : c.errorRate > 10 ? 'text-amber-600' : 'text-gray-600'}`}>{c.errorRate}%</span>,
  },
  { key: 'trials', header: 'Trials', align: 'right', render: (c) => <span className="text-gray-400">{c.errors}/{c.total}</span> },
];

const DScoreCard = ({ module: mod }: { module: IATModuleResult }) => {
  const ds = mod.dScore;
  if (!ds) return null;

  const colors = EFFECT_COLORS[ds.effect] || EFFECT_COLORS.none;
  // Position on a -1.5 to 1.5 scale
  const barPosition = Math.max(0, Math.min(100, ((ds.value + 1.5) / 3) * 100));

  return (
    <div className="border border-gray-200 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Greenwald D-score</h4>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors.bg} ${colors.text}`}>
            {EFFECT_LABELS[ds.effect]}
          </span>
          <span className="text-lg font-bold text-gray-900">{ds.value}</span>
        </div>
      </div>

      {/* D-score bar visualization */}
      <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden mb-2">
        {/* Reference zones */}
        <div className="absolute inset-y-0 left-[40%] right-[40%] bg-gray-200/50" title="No effect zone" />
        <div className="absolute inset-y-0 left-[28.3%] w-[11.7%] bg-blue-100/50" title="Slight" />
        <div className="absolute inset-y-0 right-[28.3%] w-[11.7%] bg-blue-100/50" title="Slight" />
        <div className="absolute inset-y-0 left-[16.7%] w-[11.6%] bg-amber-100/50" title="Moderate" />
        <div className="absolute inset-y-0 right-[16.7%] w-[11.6%] bg-amber-100/50" title="Moderate" />
        {/* Center line */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-gray-400" />
        {/* Marker */}
        <div
          className="absolute top-0.5 bottom-0.5 w-3 rounded-full bg-blue-600 shadow-sm"
          style={{ left: `calc(${barPosition}% - 6px)` }}
          title={`D = ${ds.value}`}
        />
      </div>

      <div className="flex justify-between text-[10px] text-gray-400">
        <span>-1.5</span>
        <span>0</span>
        <span>+1.5</span>
      </div>

      {/* CI + participant count */}
      <p className="text-xs text-gray-500 mt-2">
        95% CI: [{ds.ciLower}, {ds.ciUpper}] &middot; {ds.validParticipants} valid participant{ds.validParticipants !== 1 ? 's' : ''}
      </p>

      {/* Per-participant D-scores table */}
      {mod.participantData && mod.participantData.some(p => p.dScore != null) && (
        <details className="mt-3">
          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
            Individual D-scores ({mod.participantData.filter(p => p.dScore != null).length} participants)
          </summary>
          <div className="mt-2 border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            <DataTable<IATParticipantData>
              columns={dScoreColumns}
              data={mod.participantData
                .filter(p => p.dScore != null)
                .sort((a, b) => Math.abs(b.dScore!) - Math.abs(a.dScore!))}
              rowKey={(p) => p.participantId}
              size="compact"
              stickyHeader
            />
          </div>
        </details>
      )}
    </div>
  );
};

// ==========================================
// ERROR ANALYSIS CARD
// ==========================================

const ErrorAnalysisCard = ({ module: mod }: { module: IATModuleResult }) => {
  const ea = mod.errorAnalysis;
  if (!ea) return null;

  return (
    <details className="border border-gray-200 rounded-lg p-4 mt-4">
      <summary className="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
        Error Analysis
        <span className="ml-2 text-xs font-normal text-gray-400">
          {ea.overallErrorRate}% errors &middot; {ea.overallFastRate}% fast responses
        </span>
      </summary>

      <div className="mt-3 space-y-4">
        {/* By phase */}
        <div>
          <h5 className="text-xs font-medium text-gray-500 mb-2">By Phase</h5>
          <div className="flex gap-3">
            {ea.byPhase.map(p => (
              <div key={p.phase} className="flex-1 border rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400 capitalize mb-1">{p.phase}</p>
                <p className={`text-lg font-bold ${p.errorRate > 20 ? 'text-red-600' : p.errorRate > 10 ? 'text-amber-600' : 'text-green-600'}`}>
                  {p.errorRate}%
                </p>
                <p className="text-[10px] text-gray-400">{p.errors}/{p.total} trials</p>
              </div>
            ))}
          </div>
        </div>

        {/* By combination — top 5 highest error rates */}
        {ea.byCombination.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-gray-500 mb-2">Highest Error Combinations</h5>
            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              <DataTable
                columns={errorCombinationColumns}
                data={ea.byCombination}
                rowKey={(_, i) => String(i)}
                size="compact"
              />
            </div>
          </div>
        )}
      </div>
    </details>
  );
};

// ==========================================
// EFFECT SIZE VISUALIZATION
// ==========================================

const EffectSizeBar = ({ module: mod }: { module: IATModuleResult }) => {
  const ds = mod.dScore;
  if (!ds || !mod.participantData) return null;

  const validParticipants = mod.participantData.filter(p => p.dScore != null && p.quality === 'good');
  if (validParticipants.length === 0) return null;

  // Histogram buckets
  const buckets = [
    { label: 'Strong -', min: -Infinity, max: -0.65, color: 'bg-red-400' },
    { label: 'Moderate -', min: -0.65, max: -0.35, color: 'bg-amber-400' },
    { label: 'Slight -', min: -0.35, max: -0.15, color: 'bg-blue-300' },
    { label: 'None', min: -0.15, max: 0.15, color: 'bg-gray-300' },
    { label: 'Slight +', min: 0.15, max: 0.35, color: 'bg-blue-400' },
    { label: 'Moderate +', min: 0.35, max: 0.65, color: 'bg-amber-500' },
    { label: 'Strong +', min: 0.65, max: Infinity, color: 'bg-red-500' },
  ];

  const bucketCounts = buckets.map(b => ({
    ...b,
    count: validParticipants.filter(p => p.dScore! >= b.min && p.dScore! < b.max).length,
  }));
  const maxCount = Math.max(...bucketCounts.map(b => b.count), 1);

  return (
    <div className="border border-gray-200 rounded-lg p-4 mt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">D-score Distribution</h4>
      <div className="flex items-end gap-1 h-24">
        {bucketCounts.map((b, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            {b.count > 0 && (
              <span className="text-[10px] font-medium text-gray-600">{b.count}</span>
            )}
            <div
              className={`w-full rounded-t ${b.color}`}
              style={{ height: `${(b.count / maxCount) * 100}%`, minHeight: b.count > 0 ? 4 : 0 }}
              title={`${b.label}: ${b.count} participants`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {bucketCounts.map((b, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[9px] text-gray-400 leading-tight block">{b.label}</span>
          </div>
        ))}
      </div>
      {/* Reference lines */}
      <div className="flex justify-between mt-2 text-[10px] text-gray-400">
        <span>Strong negative bias</span>
        <span>No bias</span>
        <span>Strong positive bias</span>
      </div>
    </div>
  );
};

// ==========================================
// MODULE CARD WRAPPER
// ==========================================

const IATModuleCard = ({ module: mod }: { module: IATModuleResult }) => {
  const ChartComponent = {
    attribute_testing: AttributeTestingChart,
    comparing_attribute: ComparingAttributeChart,
    objects_comparing: ObjectsComparingChart,
  }[mod.testType];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      {mod.testTitle && (
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{mod.testTitle}</p>
      )}
      <ChartComponent module={mod} />
      {mod.testType !== 'comparing_attribute' && (
        <>
          <DScoreCard module={mod} />
          <EffectSizeBar module={mod} />
          <ErrorAnalysisCard module={mod} />
        </>
      )}
      {mod.totalResponses === 0 && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">
            No responses yet. Data will appear here once participants complete this test.
          </p>
        </div>
      )}
      {mod.totalResponses > 0 && (
        <p className="mt-3 text-xs text-gray-400 text-right">
          {mod.totalResponses} response{mod.totalResponses !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export const ImplicitAssociationResults = ({ researchId, className }: ImplicitAssociationResultsProps) => {
  const [data, setData] = useState<analyticsService.ImplicitAssociationResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    demographicData,
    demographicFilters,
    setDemographicFilters,
    userIdFilter,
    setUserIdFilter,
    completionMin,
    setCompletionMin,
    filteredParticipantIds,
  } = useResultsFilter(researchId);

  // Filter modules by participant when filters active
  const filteredModules = useMemo(() => {
    if (!data?.modules || !filteredParticipantIds) return data?.modules ?? [];
    return data.modules.map(mod => {
      const filteredPD = (mod.participantData ?? []).filter(p => filteredParticipantIds.has(p.participantId));
      return {
        ...mod,
        participantData: filteredPD,
        totalResponses: filteredPD.length,
      };
    });
  }, [data?.modules, filteredParticipantIds]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await analyticsService.getImplicitAssociationResults(researchId);
      setData(results);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load implicit association results'));
    } finally {
      setIsLoading(false);
    }
  }, [researchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadingSkeleton = (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64" />
      <div className="h-96 bg-gray-200 rounded-xl" />
      <div className="h-96 bg-gray-200 rounded-xl" />
    </div>
  );

  return (
    <ResultsStateHandler
      isLoading={isLoading}
      error={error}
      onRetry={fetchData}
      loadingSkeleton={loadingSkeleton}
    >
      {data && (
        <div className={`flex gap-6 ${className ?? ''}`}>
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 mb-4">
                <span className="text-sm font-semibold text-gray-700">3.0.- Implicit Association</span>
              </div>
            </div>

            {filteredModules.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <p className="text-lg font-medium text-gray-900 mb-2">No IAT modules found</p>
                <p className="text-sm text-gray-500">
                  This research does not have Implicit Association test modules configured.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {filteredModules.map(mod => (
                  <IATModuleCard key={mod.moduleId} module={mod} />
                ))}
              </div>
            )}
          </div>
          <div className="w-80 shrink-0 sticky top-4 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
            <Filters
              researchId={researchId}
              demographicData={demographicData}
              selectedFilters={demographicFilters}
              onFilterChange={setDemographicFilters}
              userIdFilter={userIdFilter}
              onUserIdFilterChange={setUserIdFilter}
              completionMin={completionMin}
              onCompletionMinChange={setCompletionMin}
            />
          </div>
        </div>
      )}
    </ResultsStateHandler>
  );
};
