import { useMemo } from 'react';
import { HitZoneOverlay } from './HitZoneOverlay';
import type { NavigationStep } from './navigationTestCard.types';

const GRID_SIZE = 10;

export const QuantityMapperTab = ({ step }: { step: NavigationStep }) => {
  const gridData = useMemo(() => {
    const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => 0);
    const clicks = step.heatmapData || [];
    let maxCount = 0;

    for (const click of clicks) {
      const col = Math.min(Math.floor((click.x / 100) * GRID_SIZE), GRID_SIZE - 1);
      const row = Math.min(Math.floor((click.y / 100) * GRID_SIZE), GRID_SIZE - 1);
      cells[row * GRID_SIZE + col]++;
      if (cells[row * GRID_SIZE + col] > maxCount) {
        maxCount = cells[row * GRID_SIZE + col];
      }
    }

    return { cells, maxCount };
  }, [step.heatmapData]);

  if (!step.imageUrl) {
    return (
      <div className="mb-4 rounded-lg overflow-hidden bg-gray-200 h-64 flex items-center justify-center">
        <span className="text-gray-500 font-semibold text-lg">No Image Available</span>
      </div>
    );
  }

  const cellW = 100 / GRID_SIZE;
  const cellH = 100 / GRID_SIZE;

  return (
    <div className="space-y-3">
      <div className="mb-4 rounded-lg overflow-hidden border bg-gray-100 relative w-fit mx-auto">
        <img src={step.imageUrl} alt={step.title} className="max-h-[700px] w-auto block" />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {gridData.cells.map((count, idx) => {
            if (count === 0) return null;
            const row = Math.floor(idx / GRID_SIZE);
            const col = idx % GRID_SIZE;
            const opacity = gridData.maxCount > 0 ? (count / gridData.maxCount) * 0.7 + 0.1 : 0;
            return (
              <rect
                key={idx}
                x={col * cellW}
                y={row * cellH}
                width={cellW}
                height={cellH}
                fill={`rgba(239, 68, 68, ${opacity})`}
                stroke="rgba(239, 68, 68, 0.3)"
                strokeWidth="0.15"
              />
            );
          })}
          {/* Grid lines */}
          {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
            <line key={`h-${i}`} x1={0} y1={i * cellH} x2={100} y2={i * cellH} stroke="rgba(0,0,0,0.1)" strokeWidth="0.1" />
          ))}
          {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
            <line key={`v-${i}`} x1={i * cellW} y1={0} x2={i * cellW} y2={100} stroke="rgba(0,0,0,0.1)" strokeWidth="0.1" />
          ))}
          {/* Count labels */}
          {gridData.cells.map((count, idx) => {
            if (count === 0) return null;
            const row = Math.floor(idx / GRID_SIZE);
            const col = idx % GRID_SIZE;
            return (
              <text
                key={`t-${idx}`}
                x={col * cellW + cellW / 2}
                y={row * cellH + cellH / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="2"
                fill="white"
                fontWeight="bold"
                style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' } as React.CSSProperties}
              >
                {count}
              </text>
            );
          })}
        </svg>
        <HitZoneOverlay hitZones={step.hitZones} />
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span>Click density:</span>
        <div className="flex items-center gap-1">
          <span>Low</span>
          <div className="flex">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((op) => (
              <div key={op} className="w-5 h-3" style={{ backgroundColor: `rgba(239, 68, 68, ${op})` }} />
            ))}
          </div>
          <span>High</span>
        </div>
        {gridData.maxCount > 0 && (
          <span className="text-gray-500">Max: {gridData.maxCount} clicks/cell</span>
        )}
      </div>
    </div>
  );
};
