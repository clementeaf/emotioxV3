import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

interface ResponseDistributionChartProps {
  data: Array<{
    questionType: string;
    count: number;
    avgResponseTime: number;
  }>;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">{data.questionType}</p>
        <p className="text-sm text-gray-600">Responses: {data.count}</p>
        <p className="text-sm text-gray-600">Avg Time: {data.avgResponseTime}s</p>
      </div>
    );
  }
  return null;
};

export const ResponseDistributionChart = ({ data, className }: ResponseDistributionChartProps) => {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false}
            stroke="#E5E7EB"
          />
          <XAxis 
            dataKey="questionType"
            axisLine={false}
            tickLine={false}
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            stroke="#9CA3AF"
            fontSize={12}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="count" 
            fill="#3B82F6"
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
