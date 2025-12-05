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

interface TrustFlowChartProps {
  data: Array<{
    stage: string;
    nps: number;
    nev: number;
    timestamp?: string;
  }>;
  timeRange?: '24h' | 'week' | 'month';
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
            {entry.name}: {entry.value?.toFixed(2)}
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

export const TrustFlowChart = ({ data, timeRange = '24h', className }: TrustFlowChartProps) => {
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return data;
    
    const now = new Date();
    let daysBack: number;
    
    switch (timeRange) {
      case '24h':
        daysBack = 1;
        break;
      case 'week':
        daysBack = 7;
        break;
      case 'month':
        daysBack = 30;
        break;
      default:
        return data;
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    const cutoffDateStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`;
    
    return data.filter(item => {
      if (item.timestamp && typeof item.timestamp === 'string') {
        return item.timestamp >= cutoffDateStr;
      }
      return true;
    });
  }, [data, timeRange]);

  const currentData = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div className={`relative ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
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
            domain={[0, 12]}
            ticks={[0, 4, 8, 12]}
            tickFormatter={(value) => `${value}k`}
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

      {currentData && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-xs text-gray-500 mb-1">{currentTime}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium">NPS {currentData.nps.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm font-medium">NEV {currentData.nev.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
