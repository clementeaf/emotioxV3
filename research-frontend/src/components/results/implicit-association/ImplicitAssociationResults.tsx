import { useState, useEffect, useCallback } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { ResultsStateHandler } from '../shared/ResultsStateHandler';
import * as analyticsService from '../../../services/analytics.service';
import type { IATModuleResult } from '../../../services/analytics.service';

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
        <div className={className}>
          {/* Header */}
          <div className="mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 mb-4">
              <span className="text-sm font-semibold text-gray-700">3.0.- Implicit Association</span>
            </div>
          </div>

          {data.modules.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-lg font-medium text-gray-900 mb-2">No IAT modules found</p>
              <p className="text-sm text-gray-500">
                This research does not have Implicit Association test modules configured.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {data.modules.map(mod => (
                <IATModuleCard key={mod.moduleId} module={mod} />
              ))}
            </div>
          )}
        </div>
      )}
    </ResultsStateHandler>
  );
};
