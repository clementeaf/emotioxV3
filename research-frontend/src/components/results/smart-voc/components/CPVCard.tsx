import { useMemo } from 'react';
import { Card } from '../../../ui/Card';
import { cn } from '../../../../lib/utils';

interface CPVDataPoint {
  date: string;
  cpv: number;
}

interface CPVCardProps {
  value: number;
  timeRange: 'today' | 'week' | 'month';
  onTimeRangeChange: (range: 'today' | 'week' | 'month') => void;
  cpvData?: CPVDataPoint[];
  className?: string;
  hasData?: boolean;
}

const TimeRangeSelector = ({
  timeRange,
  onChange
}: {
  timeRange: 'today' | 'week' | 'month';
  onChange: (range: 'today' | 'week' | 'month') => void
}) => {
  const periods = [
    { key: 'today' as const, label: 'Today' },
    { key: 'week' as const, label: 'Week' },
    { key: 'month' as const, label: 'Month' }
  ];

  return (
    <div className="flex gap-8">
      {periods.map((period) => (
        <button
          key={period.key}
          onClick={() => onChange(period.key)}
          className={cn(
            'text-base transition-colors pb-2',
            timeRange === period.key
              ? 'text-white border-b-2 border-white font-medium'
              : 'text-white/50 hover:text-white/80'
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
};

/**
 * Generate SVG path from CPV data points.
 * Maps values into a 600x300 viewBox, with Y inverted (0=bottom, 300=top).
 */
const generateSVGPath = (points: number[], width = 600, height = 300, padding = 40): { linePath: string; areaPath: string; peakX: number; peakY: number } => {
  if (points.length === 0) {
    return { linePath: '', areaPath: '', peakX: 0, peakY: 0 };
  }

  const maxVal = Math.max(...points, 1);
  const minVal = Math.min(...points, 0);
  const range = maxVal - minVal || 1;

  const yBottom = height - padding;
  const yTop = padding;
  const yRange = yBottom - yTop;

  const coords = points.map((v, i) => {
    const x = points.length === 1 ? width / 2 : (i / (points.length - 1)) * width;
    const y = yBottom - ((v - minVal) / range) * yRange;
    return { x, y };
  });

  // Find peak
  let peakIdx = 0;
  points.forEach((v, i) => { if (v > points[peakIdx]) peakIdx = i; });

  // Build smooth path using quadratic bezier
  let linePath = `M ${coords[0].x},${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const cpx = (coords[i - 1].x + coords[i].x) / 2;
    linePath += ` Q ${cpx},${coords[i - 1].y} ${coords[i].x},${coords[i].y}`;
  }

  const areaPath = `${linePath} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

  return { linePath, areaPath, peakX: coords[peakIdx].x, peakY: coords[peakIdx].y };
};

export const CPVCard = ({
  value,
  timeRange,
  onTimeRangeChange,
  cpvData,
  className,
  hasData = true
}: CPVCardProps) => {

  const { linePath, areaPath, peakValue, peakXPercent, peakYPercent } = useMemo(() => {
    const points = (cpvData || []).map(d => d.cpv);
    if (points.length === 0 || points.every(v => v === 0)) {
      return { linePath: '', areaPath: '', peakValue: 0, peakXPercent: 0, peakYPercent: 0 };
    }

    const result = generateSVGPath(points);
    const maxVal = Math.max(...points);
    return {
      linePath: result.linePath,
      areaPath: result.areaPath,
      peakValue: maxVal,
      peakXPercent: (result.peakX / 600) * 100,
      peakYPercent: (result.peakY / 300) * 100
    };
  }, [cpvData]);

  const hasCurveData = linePath.length > 0;

  if (!hasData) {
    return (
      <Card className={cn('relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 text-white h-96', className)}>
        <div className="absolute top-4 right-4 z-20">
          <TimeRangeSelector timeRange={timeRange} onChange={onTimeRangeChange} />
        </div>
        <div className="relative z-10 p-6 pt-16">
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
      {/* Decorative wave pattern in background */}
      <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill="white" opacity="0.1" />
        <path d="M0,60 Q25,40 50,60 T100,60 L100,100 L0,100 Z" fill="white" opacity="0.1" />
        <path d="M0,70 Q25,50 50,70 T100,70 L100,100 L0,100 Z" fill="white" opacity="0.1" />
      </svg>

      <div className="absolute top-4 left-6 z-20">
        <TimeRangeSelector timeRange={timeRange} onChange={onTimeRangeChange} />
      </div>
      <div className="relative z-10 p-6 pt-16">
        {/* CPV Value */}
        <div className="mb-2">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-bold">{value.toFixed(2).replace('.', ',')}</span>
            <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-white mb-0.5">CPV Estimation</div>
          <div className="text-xs text-white/80">Customer Perceived Value</div>
        </div>

        {/* Chart Area with dynamic curve */}
        <div className="relative w-full h-48 mt-2">
          {hasCurveData ? (
            <>
              {/* Area gradient fill */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 300" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cpvAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#cpvAreaGradient)" />
              </svg>

              {/* Curved line */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 300" preserveAspectRatio="none">
                <path d={linePath} fill="none" stroke="white" strokeWidth="3" opacity="0.95" />
              </svg>

              {/* Peak value label */}
              {peakValue > 0 && (
                <div
                  className="absolute"
                  style={{
                    left: `${Math.min(Math.max(peakXPercent, 10), 85)}%`,
                    top: `${Math.max(peakYPercent - 12, 2)}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <div className="relative">
                    <div className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg font-bold text-sm shadow-xl">
                      {peakValue.toFixed(2).replace('.', ',')}
                    </div>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-white/50 text-sm">
              No CPV trend data available
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
