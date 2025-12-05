import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

interface NPSChartProps {
  data: Array<{
    month: string;
    promoters: number;
    neutrals: number;
    detractors: number;
    npsRatio: number;
    date?: string;
  }>;
  timeRange?: 'today' | 'week' | 'month';
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any, index: number) => (
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
  <div className="flex items-center space-x-4 text-sm mb-3">
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      <span className="text-gray-600">Promoters</span>
    </div>
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
      <span className="text-gray-600">Neutrals</span>
    </div>
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
      <span className="text-gray-600">Detractors</span>
    </div>
  </div>
);

export const NPSChart = ({ data, timeRange = 'month', className }: NPSChartProps) => {
  const filteredData = useMemo(() => {
    if (!data || data.length === 0 || timeRange === 'month') return data;

    const now = new Date();
    let daysBack: number;
    
    switch (timeRange) {
      case 'today':
        daysBack = 1;
        break;
      case 'week':
        daysBack = 7;
        break;
      default:
        return data;
    }

    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    return data.filter(item => {
      if (!item.date) return true;
      const itemDate = new Date(item.date + 'T12:00:00');
      return itemDate >= cutoffDate;
    });
  }, [data, timeRange]);

  return (
    <div className={className}>
      <CustomLegend />
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={filteredData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }} barGap={0}>
          <defs>
            <linearGradient id="npsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4338CA" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#4338CA" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            horizontal={true}
            stroke="#E5E7EB"
            opacity={0.5}
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            stroke="#9CA3AF"
            fontSize={12}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            stroke="#9CA3AF"
            fontSize={12}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickMargin={8}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="promoters"
            name="Promoters"
            fill="#10B981"
            stackId="nps"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="neutrals"
            name="Neutrals"
            fill="#F59E0B"
            stackId="nps"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="detractors"
            name="Detractors"
            fill="#EF4444"
            stackId="nps"
            radius={[0, 0, 4, 4]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
