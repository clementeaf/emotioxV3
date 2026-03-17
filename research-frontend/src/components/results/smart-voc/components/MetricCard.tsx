import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

interface MonthlyDataPoint {
  date: string;
  satisfied: number;
  dissatisfied: number;
}

interface MetricCardProps {
  title: string;
  abbreviation: string;
  score: number;
  question: string;
  monthlyData?: MonthlyDataPoint[];
  className?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
        <p className="text-sm text-gray-600 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {entry.value}%
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ cardType }: { cardType: string }) => {
  const getLegendLabels = () => {
    switch (cardType) {
      case 'Customer Satisfaction':
        return { positive: 'Satisfied', negative: 'Dissatisfied' };
      case 'Customer Effort Score':
        return { positive: 'Little effort', negative: 'Much effort' };
      case 'Cognitive Value':
        return { positive: 'Worth', negative: 'Worthless' };
      default:
        return { positive: 'Positive', negative: 'Negative' };
    }
  };

  const labels = getLegendLabels();

  return (
    <div className="flex gap-4 mt-2">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-red-500"></div>
        <span className="text-xs text-gray-600">{labels.negative}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-green-500"></div>
        <span className="text-xs text-gray-600">{labels.positive}</span>
      </div>
    </div>
  );
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getEmptyData = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { date: monthNames[d.getMonth()], satisfied: 0, dissatisfied: 0 };
  });
};

export const MetricCard = ({
  title,
  abbreviation,
  score,
  question,
  monthlyData,
  className
}: MetricCardProps) => {
  const chartData = monthlyData && monthlyData.length > 0
    ? monthlyData.map(d => {
        const dt = new Date(d.date + 'T00:00:00');
        // If multiple entries share the same month, use short date (Mar 15); otherwise month only
        const label = monthlyData.length <= 6 && new Set(monthlyData.map(m => new Date(m.date + 'T00:00:00').getMonth())).size === monthlyData.length
          ? monthNames[dt.getMonth()]
          : `${monthNames[dt.getMonth()]} ${dt.getDate()}`;
        return { date: label, satisfied: d.satisfied, dissatisfied: d.dissatisfied };
      })
    : getEmptyData();
  return (
    <Card className={cn('p-6 space-y-6', className)}>
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="text-gray-600">{title}</h3>
          <button className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-medium">
            {abbreviation} {(score || 0).toFixed(2)}
          </span>
          <div className="flex items-center text-gray-400 text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 mr-1"
            >
              <path
                fillRule="evenodd"
                d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042.815a.75.75 0 01-.919-.53z"
                clipRule="evenodd"
              />
            </svg>
            --
          </div>
        </div>

        <p className="text-gray-500">{question}</p>
      </div>

      <div style={{ width: '100%', height: '160px', minHeight: '160px' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E5E7EB"
            />
            <XAxis
              dataKey="date"
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
              domain={[0, 100]}
              ticks={[0, 50, 100]}
              tickMargin={10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="satisfied"
              name="Satisfied"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 4, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
            />
            <Line
              type="monotone"
              dataKey="dissatisfied"
              name="Dissatisfied"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <CustomLegend cardType={title} />
    </Card>
  );
};
