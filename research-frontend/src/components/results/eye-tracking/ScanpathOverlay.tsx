import { useState, useMemo } from 'react';
import type { EyeTrackingStimulus } from '../../../services/analytics.service';

/** Color gradient from cool (first) to warm (last) fixation */
const SCANPATH_GRADIENT = [
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#D946EF', '#EC4899', '#F43F5E', '#EF4444',
  '#F97316', '#F59E0B',
];

const getScanpathColor = (index: number, total: number): string => {
  const t = total <= 1 ? 0 : index / (total - 1);
  const ci = Math.min(Math.floor(t * (SCANPATH_GRADIENT.length - 1)), SCANPATH_GRADIENT.length - 1);
  return SCANPATH_GRADIENT[ci];
};

export const ScanpathOverlay = ({
  imageUrl,
  fixations,
}: {
  imageUrl: string;
  fixations: EyeTrackingStimulus['fixations'];
}) => {
  const [selectedParticipant, setSelectedParticipant] = useState<string>('all');

  const participantIds = useMemo(() => {
    const ids = new Set(fixations.map(f => f.participantId));
    return Array.from(ids);
  }, [fixations]);

  const visibleFixations = useMemo(() => {
    const filtered = selectedParticipant === 'all'
      ? fixations
      : fixations.filter(f => f.participantId === selectedParticipant);
    // Sort by timestamp for path ordering
    return [...filtered].sort((a, b) => a.timestamp - b.timestamp);
  }, [fixations, selectedParticipant]);

  // Normalize fixation positions — fixations are in image pixel coords
  // Need to find max x/y to compute relative positions
  const maxX = useMemo(() => Math.max(...fixations.map(f => f.x), 1), [fixations]);
  const maxY = useMemo(() => Math.max(...fixations.map(f => f.y), 1), [fixations]);

  return (
    <div>
      {/* Participant selector */}
      <div className="flex items-center gap-3 mb-3">
        <label className="text-xs text-gray-500">Participant:</label>
        <select
          value={selectedParticipant}
          onChange={e => setSelectedParticipant(e.target.value)}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
        >
          <option value="all">All ({participantIds.length})</option>
          {participantIds.map(pid => (
            <option key={pid} value={pid}>{pid}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{visibleFixations.length} fixations</span>
      </div>

      {/* Image with scanpath overlay */}
      <div className="relative rounded-lg overflow-hidden border bg-gray-100 w-fit mx-auto">
        <img src={imageUrl} alt="Stimulus" className="max-h-[60vh] w-auto block" draggable={false} />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${maxX} ${maxY}`} preserveAspectRatio="none">
          {/* Connection lines */}
          {visibleFixations.map((fix, i) => {
            if (i === 0) return null;
            const prev = visibleFixations[i - 1];
            // Skip line if different participant in "all" mode
            if (selectedParticipant === 'all' && fix.participantId !== prev.participantId) return null;
            return (
              <line
                key={`line-${i}`}
                x1={prev.x}
                y1={prev.y}
                x2={fix.x}
                y2={fix.y}
                stroke={getScanpathColor(i, visibleFixations.length)}
                strokeWidth={Math.max(maxX * 0.002, 1)}
                strokeOpacity={0.6}
              />
            );
          })}
          {/* Fixation circles */}
          {visibleFixations.map((fix, i) => {
            const color = getScanpathColor(i, visibleFixations.length);
            // Radius proportional to duration (min 0.5%, max 2.5% of image)
            const minR = maxX * 0.005;
            const maxR = maxX * 0.025;
            const maxDur = Math.max(...visibleFixations.map(f => f.duration), 1);
            const r = minR + (fix.duration / maxDur) * (maxR - minR);
            return (
              <g key={`fix-${i}`}>
                <circle cx={fix.x} cy={fix.y} r={r} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={Math.max(maxX * 0.001, 0.5)} />
                <text
                  x={fix.x}
                  y={fix.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.max(maxX * 0.012, 8)}
                  fontWeight={600}
                  fill="white"
                  stroke={color}
                  strokeWidth={Math.max(maxX * 0.002, 0.5)}
                  paintOrder="stroke"
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SCANPATH_GRADIENT[0] }} />
          <span className="text-[10px] text-gray-500">First fixation</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SCANPATH_GRADIENT[SCANPATH_GRADIENT.length - 1] }} />
          <span className="text-[10px] text-gray-500">Last fixation</span>
        </div>
        <span className="text-[10px] text-gray-400">Circle size = duration</span>
      </div>
    </div>
  );
};
