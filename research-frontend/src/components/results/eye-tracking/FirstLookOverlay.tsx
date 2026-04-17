import { useState, useMemo } from 'react';
import { HeatmapRenderer } from '../cognitive-task/components/HeatmapRenderer';
import type { EyeTrackingStimulus } from '../../../services/analytics.service';

export const FirstLookOverlay = ({
  imageUrl,
  fixations,
}: {
  imageUrl: string;
  fixations: EyeTrackingStimulus['fixations'];
}) => {
  const [count, setCount] = useState(1);

  // Extract first N fixations per participant (by lowest timestamp)
  const firstFixations = useMemo(() => {
    const byParticipant = new Map<string, typeof fixations>();
    for (const f of fixations) {
      if (!byParticipant.has(f.participantId)) byParticipant.set(f.participantId, []);
      byParticipant.get(f.participantId)!.push(f);
    }
    const result: typeof fixations = [];
    for (const [, pFixations] of byParticipant) {
      const sorted = [...pFixations].sort((a, b) => a.timestamp - b.timestamp);
      result.push(...sorted.slice(0, count));
    }
    return result;
  }, [fixations, count]);

  const heatmapData = useMemo(
    () => firstFixations.map(f => ({ x: f.x, y: f.y, value: f.duration })),
    [firstFixations],
  );

  const participantCount = useMemo(
    () => new Set(fixations.map(f => f.participantId)).size,
    [fixations],
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <label className="text-xs text-gray-500">Show first</label>
        <select
          value={count}
          onChange={e => setCount(Number(e.target.value))}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
        >
          {[1, 2, 3, 5, 10].map(n => (
            <option key={n} value={n}>{n} fixation{n > 1 ? 's' : ''}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">
          per participant &middot; {participantCount} participants &middot; {firstFixations.length} points
        </span>
      </div>
      <HeatmapRenderer
        imageUrl={imageUrl}
        data={heatmapData}
        className="w-full"
      />
    </div>
  );
};
