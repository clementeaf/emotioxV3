import { ChevronDown, Target } from 'lucide-react';
import { useMemo } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

// Progress component inline
interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
}

const Progress = ({ value, className, indicatorClassName }: ProgressProps) => (
  <div className={cn('h-2 w-full bg-gray-200 rounded-full overflow-hidden', className)}>
    <div
      className={cn('h-full transition-all', indicatorClassName)}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

// Componente circular especializado para NPS que maneja valores de -100 a +100
const NPSCircularProgress = ({ value, size = 96, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Normalizar el valor NPS (-100 a +100) a porcentaje (0 a 100) para el display visual
  const normalizedValue = Math.max(0, Math.min(100, (value + 100) / 2));
  const offset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          className="stroke-gray-200"
          strokeWidth={strokeWidth}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        {/* Progress circle */}
        <circle
          className="stroke-blue-600 transition-all duration-300 ease-in-out"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* Text in the middle showing actual NPS score */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="fill-current font-semibold text-lg"
        >
          {value}
        </text>
      </svg>
    </div>
  );
};

interface NPSAnalysisProps {
  monthlyData: Array<{
    month: string;
    promoters: number;
    neutrals: number;
    detractors: number;
    npsRatio: number;
    date?: string;
  }>;
  score: number;
  promoters: number;
  neutrals: number;
  detractors: number;
  totalResponses?: number;
  questionText?: string;
  questionNumber?: string;
  title?: string;
  badges?: Array<{ label: string; color: string }>;
  timeRange?: 'today' | 'week' | 'month';
  onTimeRangeChange?: (range: 'today' | 'week' | 'month') => void;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900">{label}</p>
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
  <div className="flex items-center space-x-4 text-sm">
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
      <span className="text-gray-600">NPS Ratio</span>
    </div>
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      <span className="text-gray-600">Promoters</span>
    </div>
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
      <span className="text-gray-600">Neutrals</span>
    </div>
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
      <span className="text-gray-600">Detractors</span>
    </div>
  </div>
);

export const NPSAnalysis = ({
  monthlyData,
  score,
  promoters,
  neutrals,
  detractors,
  totalResponses = 0,
  questionText,
  questionNumber = "2.5",
  title,
  badges = [
    { label: 'Linear Scale question', color: 'text-green-600 bg-green-50' },
    { label: 'Conditionality disabled', color: 'text-blue-600 bg-blue-50' },
    { label: 'Required', color: 'text-red-600 bg-red-50' }
  ],
  timeRange = 'month',
  onTimeRangeChange,
  className
}: NPSAnalysisProps) => {
  // Calcular porcentajes
  const total = promoters + detractors + neutrals;
  const promotersPercentage = total > 0 ? Math.round((promoters / total) * 100) : 0;
  const detractorsPercentage = total > 0 ? Math.round((detractors / total) * 100) : 0;
  const neutralsPercentage = total > 0 ? Math.round((neutrals / total) * 100) : 0;

  // Filtrar datos según el rango de tiempo seleccionado
  const filteredMonthlyData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return monthlyData;
    if (timeRange === 'month') return monthlyData;

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
        return monthlyData;
    }

    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    return monthlyData.filter(item => {
      if (!item.date) return true;
      const itemDate = new Date(item.date + 'T12:00:00');
      return itemDate >= cutoffDate;
    });
  }, [monthlyData, timeRange]);

  return (
    <Card className={cn('p-6 pb-24 space-y-4', className)}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">{questionNumber}- Question: {title || 'Net Promoter Score (NPS)'}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, index) => (
                <span key={index} className={cn('px-2 py-1 text-xs font-medium rounded', badge.color)}>
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Responses</span>
            <span className="text-2xl font-semibold">{totalResponses.toLocaleString()}</span>
            <span className="text-sm text-gray-500">26s</span>
          </div>
        </div>

        {/* Progress bars */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Promoters</span>
              <span className="text-sm font-medium">{promotersPercentage}%</span>
            </div>
            <Progress
              value={promotersPercentage}
              className="h-2"
              indicatorClassName="bg-green-500"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Detractors</span>
              <span className="text-sm font-medium">{detractorsPercentage}%</span>
            </div>
            <Progress
              value={detractorsPercentage}
              className="h-2"
              indicatorClassName="bg-red-500"
            />
          </div>
        </div>

        {/* Question + Score */}
        <div className="flex items-start gap-3 pt-4 border-t border-gray-100 mb-6">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 mb-1">{title || 'NPS'}'s question</div>
            <p className="text-sm text-gray-500">{questionText || "On a scale from 0-10, how likely are you to recommend [company] to a friend or colleague?"}</p>
          </div>
          <div className="ml-4">
            <NPSCircularProgress value={score} size={96} strokeWidth={8} />
          </div>
        </div>

        {/* Chart */}
        <div className="h-[320px] bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <CustomLegend />
            <div className="relative inline-block">
              <select
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer pr-8"
                value={timeRange}
                onChange={(e) => {
                  const newRange = e.target.value as 'today' | 'week' | 'month';
                  onTimeRangeChange?.(newRange);
                }}
              >
                <option value="today">Today</option>
                <option value="week">Week</option>
                <option value="month">Year</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={filteredMonthlyData} margin={{ top: 10, right: 10, bottom: 20, left: 40 }} barGap={0}>
              <defs>
                <linearGradient id="npsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4338CA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4338CA" stopOpacity={0.05} />
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
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="neutrals"
                name="Neutrals"
                fill="#D1D5DB"
                stackId="nps"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="detractors"
                name="Detractors"
                fill="#F87171"
                stackId="nps"
                radius={[0, 0, 0, 0]}
              />
              <Area
                type="natural"
                dataKey="npsRatio"
                name="NPS Ratio"
                stroke="#4338CA"
                strokeWidth={3}
                fill="url(#npsGradient)"
                fillOpacity={1}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Loyalty Evolution */}
        <div className="border-t border-gray-200 pt-3">
          <div className="mb-3">
            <h3 className="text-base font-medium">Loyalty's Evolution</h3>
            <div className="text-green-600 font-medium text-sm mt-1">
              +16% Since last month
            </div>
          </div>

          <div className="flex mt-3">
            <div className="flex-1 flex flex-col items-center">
              <div className="text-lg font-semibold text-gray-700">{promotersPercentage}%</div>
              <div className="my-2">
                <div className="rounded-full bg-green-100 p-1.5">
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <span className="text-sm text-gray-600">Promoters</span>
            </div>

            <div className="flex-1 flex flex-col items-center">
              <div className="text-lg font-semibold text-gray-700">{detractorsPercentage}%</div>
              <div className="my-2">
                <div className="rounded-full bg-red-100 p-1.5">
                  <svg className="w-4 h-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <span className="text-sm text-gray-600">Detractors</span>
            </div>

            <div className="flex-1 flex flex-col items-center">
              <div className="text-lg font-semibold text-gray-700">{neutralsPercentage}%</div>
              <div className="my-2">
                <div className="rounded-full bg-gray-200 p-1.5">
                  <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <span className="text-sm text-gray-600">Neutrals</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
