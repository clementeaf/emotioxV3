'use client';

import { ArrowUp, Info } from 'lucide-react';
import { useState } from 'react';

import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

import { CPVChartData } from './types';

// Componente Skeleton para CPVCard
const CPVCardSkeleton = () => {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 text-white h-96">
      <div className="absolute top-4 right-4 z-20">
        <div className="flex bg-white/20 rounded-lg p-1">
          {['Hoy', 'Semana', 'Mes'].map((period) => (
            <button
              key={period}
              className="px-3 py-1 text-xs rounded-md bg-white/20 text-white/60"
              disabled
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 p-6 pt-16">
        <div className="w-full mb-6">
          <div className="flex items-center gap-5">
            <h3 className="text-lg font-medium leading-tight">Valor percibido por el cliente</h3>
            <div className="w-4 h-4 bg-white/20 rounded animate-pulse"></div>
          </div>
        </div>

        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-8 h-8 bg-white/40 rounded"></div>
            </div>
            <div className="w-24 h-6 bg-white/20 rounded animate-pulse mb-2"></div>
            <div className="w-48 h-4 bg-white/20 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface UITooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

const UITooltip = ({ content, children }: UITooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-50 p-2 text-sm bg-white text-gray-800 rounded-md shadow-lg w-64 top-6 right-0">
          {content}
          <div className="absolute -top-1 right-2 w-2 h-2 rotate-45 bg-white"></div>
        </div>
      )}
    </div>
  );
};

interface CPVCardProps {
  value: number;
  timeRange: 'Today' | 'Week' | 'Month';
  onTimeRangeChange: (range: 'Today' | 'Week' | 'Month') => void;
  trendData: CPVChartData[];
  className?: string;
  satisfaction?: number;
  retention?: number;
  impact?: string;
  trend?: string;
  hasData?: boolean;
  csatPercentage?: number; // % de registros 4 y 5
  cesPercentage?: number;  // % de registros 1 y 2
  peakValue?: number;      // Valor pico para el gráfico
  isLoading?: boolean;     // Nueva prop para loading
}

const TimeRangeSelector = ({ timeRange, onChange }: { timeRange: 'Today' | 'Week' | 'Month'; onChange: (range: 'Today' | 'Week' | 'Month') => void }) => {
  const periods = [
    { key: 'Today' as const, label: 'Hoy' },
    { key: 'Week' as const, label: 'Semana' },
    { key: 'Month' as const, label: 'Mes' }
  ];

  return (
    <div className="flex bg-white/20 rounded-lg p-1">
      {periods.map((period) => (
        <button
          key={period.key}
          onClick={() => onChange(period.key)}
          className={cn(
            'px-3 py-1 text-xs rounded-md transition-colors',
            timeRange === period.key
              ? 'bg-white text-blue-600'
              : 'text-white/60 hover:text-white'
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
};

export const CPVCard = ({
  value,
  timeRange,
  onTimeRangeChange,
  className,
  satisfaction = 8.4,
  retention = 92,
  impact = 'Alto',
  trend = 'Positiva',
  hasData = true,
  isLoading = false
}: CPVCardProps) => {
  const percentChange = 2.5;

  if (isLoading) {
    return <CPVCardSkeleton />;
  }

  if (!hasData) {
    return (
      <Card className={cn('relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 text-white h-96', className)}>
        <div className="absolute top-4 right-4 z-20">
          <TimeRangeSelector
            timeRange={timeRange}
            onChange={onTimeRangeChange}
          />
        </div>

        <div className="relative z-10 p-6 pt-16">
          <div className="w-full mb-6">
            <div className="flex items-center gap-5">
              <h3 className="text-lg font-medium leading-tight">Valor percibido por el cliente</h3>
              <UITooltip content="Medida que indica cuánto valor perciben los clientes en relación al precio pagado">
                <Info className="w-4 h-4 mt-1 text-white/60 hover:text-white cursor-help transition-colors" />
              </UITooltip>
            </div>
          </div>

          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-white mb-2">Aún no hay datos</h4>
              <p className="text-sm text-white/70 max-w-xs">
                Los datos de valor percibido por el cliente aparecerán aquí cuando los participantes completen las encuestas SmartVOC.
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 text-white h-96', className)}>
      <div className="absolute top-4 right-4 z-20">
        <TimeRangeSelector
          timeRange={timeRange}
          onChange={onTimeRangeChange}
        />
      </div>

      <div className="relative z-10 p-6 pt-16">
        <div className="w-full mb-6">
          <div className="flex items-center gap-5">
            <h3 className="text-lg font-medium leading-tight">Valor percibido por el cliente</h3>
            <UITooltip content="Medida que indica cuánto valor perciben los clientes en relación al precio pagado">
              <Info className="w-4 h-4 mt-1 text-white/60 hover:text-white cursor-help transition-colors" />
            </UITooltip>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{value.toFixed(2)}</span>
            <div className="flex items-center gap-1 text-green-400">
              <ArrowUp className="w-4 h-4" />
              <span className="text-sm">+{percentChange}%</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/60">CPV Estimation</div>
            <div className="text-xs text-white/40">Customer Perceived Value</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{satisfaction.toFixed(1)}</div>
            <div className="text-xs text-white/60">Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{retention}%</div>
            <div className="text-xs text-white/60">Retention</div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-white/60">Impact:</span>
            <span className={`px-2 py-1 rounded-full text-xs ${impact === 'Alto' ? 'bg-green-500/20 text-green-300' :
                impact === 'Medio' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
              }`}>
              {impact}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60">Trend:</span>
            <span className={`px-2 py-1 rounded-full text-xs ${trend === 'Positiva' ? 'bg-green-500/20 text-green-300' :
                trend === 'Neutral' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
              }`}>
              {trend}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
