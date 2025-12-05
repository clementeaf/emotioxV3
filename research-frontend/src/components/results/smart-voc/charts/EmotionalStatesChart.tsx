import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

interface EmotionalStatesChartProps {
  data: Array<{
    emotion: string;
    count: number;
    percentage: number;
  }>;
  className?: string;
}

const EMOTION_COLORS: Record<string, string> = {
  joy: '#10B981',
  trust: '#3B82F6',
  fear: '#EF4444',
  surprise: '#F59E0B',
  sadness: '#6366F1',
  disgust: '#8B5CF6',
  anger: '#DC2626',
  anticipation: '#14B8A6'
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as { emotion: string; count: number; percentage: number };
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 capitalize">{data.emotion}</p>
        <p className="text-sm text-gray-600">Count: {data.count}</p>
        <p className="text-sm text-gray-600">Percentage: {data.percentage.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export const EmotionalStatesChart = ({ data, className }: EmotionalStatesChartProps) => {
  // Sort data by count descending
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={sortedData} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            horizontal={false}
            stroke="#E5E7EB"
          />
          <XAxis 
            type="number"
            axisLine={false}
            tickLine={false}
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis 
            type="category"
            dataKey="emotion"
            axisLine={false}
            tickLine={false}
            stroke="#9CA3AF"
            fontSize={12}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="count" 
            radius={[0, 4, 4, 0]}
            maxBarSize={32}
          >
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={EMOTION_COLORS[entry.emotion.toLowerCase()] || '#9CA3AF'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
