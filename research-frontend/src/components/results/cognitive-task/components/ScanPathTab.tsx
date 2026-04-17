import { useMemo } from 'react';
import { HitZoneOverlay } from './HitZoneOverlay';
import type { NavigationStep } from './navigationTestCard.types';

export const ScanPathTab = ({ step }: { step: NavigationStep }) => {
  const clicks = useMemo(() => {
    const raw = step.heatmapData || [];
    return [...raw].sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }, [step.heatmapData]);

  if (!step.imageUrl) {
    return (
      <div className="mb-4 rounded-lg overflow-hidden bg-gray-200 h-64 flex items-center justify-center">
        <span className="text-gray-500 font-semibold text-lg">No Image Available</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="mb-4 rounded-lg overflow-hidden border bg-gray-100 relative w-fit mx-auto">
        <img src={step.imageUrl} alt={step.title} className="max-h-[700px] w-auto block" />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Defs for arrow markers */}
          <defs>
            <marker id="arrow-green" markerWidth="3" markerHeight="3" refX="2" refY="1.5" orient="auto">
              <path d="M0,0 L3,1.5 L0,3 Z" fill="#22C55E" />
            </marker>
            <marker id="arrow-red" markerWidth="3" markerHeight="3" refX="2" refY="1.5" orient="auto">
              <path d="M0,0 L3,1.5 L0,3 Z" fill="#EF4444" />
            </marker>
          </defs>
          {/* Lines connecting sequential clicks */}
          {clicks.map((click, idx) => {
            if (idx === 0) return null;
            const prev = clicks[idx - 1];
            const isCorrect = click.isCorrect;
            return (
              <line
                key={`line-${idx}`}
                x1={prev.x}
                y1={prev.y}
                x2={click.x}
                y2={click.y}
                stroke={isCorrect ? '#22C55E' : '#EF4444'}
                strokeWidth="0.3"
                strokeOpacity={0.7}
                markerEnd={isCorrect ? 'url(#arrow-green)' : 'url(#arrow-red)'}
              />
            );
          })}
          {/* Click points with numbers */}
          {clicks.map((click, idx) => (
            <g key={`point-${idx}`}>
              <circle
                cx={click.x}
                cy={click.y}
                r="1.2"
                fill={click.isCorrect ? '#22C55E' : '#EF4444'}
                stroke="white"
                strokeWidth="0.3"
              />
              <text
                x={click.x}
                y={click.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="1"
                fill="white"
                fontWeight="bold"
              >
                {idx + 1}
              </text>
            </g>
          ))}
        </svg>
        <HitZoneOverlay hitZones={step.hitZones} />
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Correct click</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Incorrect click</span>
        </div>
        <span className="text-gray-400">Numbers indicate click order</span>
        <span className="text-gray-500">{clicks.length} total clicks</span>
      </div>
    </div>
  );
};
