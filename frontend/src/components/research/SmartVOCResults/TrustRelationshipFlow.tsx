'use client';

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

import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

import { TrustFlowData } from './types';

// Componente Skeleton para TrustRelationshipFlow
const TrustRelationshipFlowSkeleton = () => {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="w-48 h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="w-64 h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      <div className="h-64 mt-6 relative">
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-6 h-6 bg-gray-300 rounded"></div>
            </div>
            <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="w-48 h-3 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface TrustRelationshipFlowProps {
  data: TrustFlowData[];
  className?: string;
  hasData?: boolean; // Nueva prop para indicar si hay datos reales
  isLoading?: boolean; // Nueva prop para loading
  timeRange?: '24h' | 'week' | 'month';
  onTimeRangeChange?: (range: '24h' | 'week' | 'month') => void;
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
      <span className="text-gray-600">NPS</span>
    </div>
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
      <span className="text-gray-600">NEV</span>
    </div>
  </div>
);

/**
 * Filtrar datos según el rango de tiempo seleccionado
 */
function filterDataByTimeRange(dataToFilter: TrustFlowData[], range: '24h' | 'week' | 'month'): TrustFlowData[] {
  if (!dataToFilter || dataToFilter.length === 0) return [];
  
  const now = new Date();
  let daysBack: number;
  
  switch (range) {
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
      return dataToFilter;
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cutoffDate = new Date(today);
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  const cutoffDateStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`;
  
  
  const filtered = dataToFilter.filter(item => {
    if (item.timestamp && typeof item.timestamp === 'string') {
      const passes = item.timestamp >= cutoffDateStr;
      return passes;
    }
  
    return true;
  });
  
  return filtered;
}

export const TrustRelationshipFlow = ({ 
  data, 
  className, 
  isLoading = false,
  timeRange = '24h',
  onTimeRangeChange
}: TrustRelationshipFlowProps) => {
  
  const filteredData = useMemo(() => {
    const result = filterDataByTimeRange(data, timeRange);
    return result;
  }, [data, timeRange]);

  if (isLoading) {
    return <TrustRelationshipFlowSkeleton />;
  }

  const currentData = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
  const currentTime = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <Card className={cn('p-6', className, 'h-96')}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-gray-600">Trust Relationship Flow</h3>
            <p className="text-sm text-gray-500 mt-1">Customer's perception about service in time</p>
          </div>
          <select 
            className="text-sm border rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
            value={timeRange}
            onChange={(e) => {
              const newRange = e.target.value as '24h' | 'week' | 'month';
              onTimeRangeChange?.(newRange);
            }}
          >
            <option value="24h">Last 24 hours</option>
            <option value="week">Last week</option>
            <option value="month">Last month</option>
          </select>
        </div>
      </div>

      <div className="h-64 mt-6 relative">
        {/* Siempre mostrar el gráfico, incluso sin datos */}
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

            {/* Métricas en el lado derecho */}
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
    </Card>
  );
};
