import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';
import type { TimeRange } from '../SmartVOCResults';

interface ChartDataPoint {
  stage: string;
  nps: number;
  nev: number;
  timestamp: string;
}

interface TrustFlowChartProps {
  dailyData: ChartDataPoint[];
  intradayData: ChartDataPoint[];
  timeRange: TimeRange;
  className?: string;
}

interface TooltipPayload {
  color: string;
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm text-gray-600" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomLegend = () => (
  <div className="flex items-center space-x-4 text-sm">
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
      <span className="text-gray-600">NPS</span>
    </div>
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
      <span className="text-gray-600">NEV</span>
    </div>
  </div>
);

function filterDailyDataByTimeRange(
  dataToFilter: ChartDataPoint[],
  range: TimeRange
) {
  if (!dataToFilter || dataToFilter.length === 0) return [];

  const daysMap: Record<TimeRange, number> = { today: 1, week: 7, month: 30, '6months': 180, '12months': 365 };
  const daysBack = daysMap[range] ?? 30;

  const today = new Date();
  const cutoffDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const cutoffDateStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`;

  return dataToFilter.filter(item => {
    if (item.timestamp && typeof item.timestamp === 'string') {
      return item.timestamp >= cutoffDateStr;
    }
    return true;
  });
}

export const TrustFlowChart = ({
  dailyData,
  intradayData,
  timeRange,
  className
}: TrustFlowChartProps) => {
  // For week view, format labels as weekday names (Mon, Tue, etc.)
  const weekData = useMemo(() => {
    const filtered = filterDailyDataByTimeRange(dailyData, 'week');
    return filtered.map(item => ({
      ...item,
      stage: new Date(item.timestamp).toLocaleDateString('en-US', { weekday: 'short' })
    }));
  }, [dailyData]);

  const filteredData = useMemo(() => {
    if (timeRange === 'today') {
      return intradayData;
    }
    if (timeRange === 'week') {
      return weekData;
    }
    return filterDailyDataByTimeRange(dailyData, timeRange);
  }, [dailyData, intradayData, weekData, timeRange]);

  const lastPoint = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
  const lastPointLabel = lastPoint?.timestamp
    ? (timeRange === 'today'
        ? new Date(lastPoint.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        : new Date(lastPoint.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: ['month', '6months', '12months'].includes(timeRange) ? 'numeric' : undefined }))
    : null;

  return (
    <Card className={cn('p-6 h-96', className)}>
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="text-gray-900 font-medium">Trust Relationship Flow</h3>
          <p className="text-sm text-gray-500 mt-1">Customer's perception about service in time</p>
        </div>
        {lastPoint && lastPointLabel && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <div className="text-xs text-gray-500 mb-0.5">Latest point</div>
            <div className="text-gray-700 font-medium">{lastPointLabel}</div>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                NPS {lastPoint.nps.toFixed(2)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-purple-500 rounded-full shrink-0" />
                NEV {lastPoint.nev.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="h-64 mt-6 relative" style={{ minHeight: '256px' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={filteredData}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E5E7EB"
            />
            <XAxis
              dataKey="stage"
              axisLine={false}
              tickLine={false}
              stroke="#9CA3AF"
              fontSize={12}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              stroke="#9CA3AF"
              fontSize={12}
              domain={[-100, 100]}
              ticks={[-100, -50, 0, 50, 100]}
              tickMargin={10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Line
              type="monotone"
              dataKey="nps"
              name="NPS"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="nev"
              name="NEV"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
