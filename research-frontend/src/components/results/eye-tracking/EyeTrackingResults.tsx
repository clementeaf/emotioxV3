import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Eye, Users, Clock, Crosshair, Image, Download, SmilePlus, Sparkles, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { ResultsStateHandler } from '../shared/ResultsStateHandler';
import { HeatmapRenderer } from '../cognitive-task/components/HeatmapRenderer';
import { Filters } from '../smart-voc/components/Filters';
import { useResultsFilter } from '../../../hooks/useResultsFilter';
import { mediaService } from '../../../services/media.service';
import * as analyticsService from '../../../services/analytics.service';
import type { EyeTrackingStimulus, EyeTrackingAOI, EmotionAggregation, EkmanEmotion } from '../../../services/analytics.service';

interface EyeTrackingResultsProps {
  researchId: string;
  className?: string;
}

type ViewMode = 'heatmap' | 'image' | 'emotions' | 'prediction' | 'video' | 'scanpath' | 'firstlook' | 'transparency' | 'sequence';

/** Resolve stimulusUrl: may be a clean URL or a JSON array string from the backend. */
const resolveStimulusUrl = (raw: string): string => {
  if (!raw || !raw.startsWith('[')) return raw;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0].url || parsed[0].s3Key || '';
    }
  } catch { /* not JSON */ }
  return raw;
};

// ==========================================
// STIMULUS CARD
// ==========================================

/** 3×3 zone grid overlay — mirrors HYBRID_AOI_GRID layout (row-major: r0c0..r2c2). */
const ZONE_GRID = [
  { id: 'r0c0', col: 0, row: 0 }, { id: 'r0c1', col: 1, row: 0 }, { id: 'r0c2', col: 2, row: 0 },
  { id: 'r1c0', col: 0, row: 1 }, { id: 'r1c1', col: 1, row: 1 }, { id: 'r1c2', col: 2, row: 1 },
  { id: 'r2c0', col: 0, row: 2 }, { id: 'r2c1', col: 1, row: 2 }, { id: 'r2c2', col: 2, row: 2 },
];

const ZoneHeatmapOverlay = ({ imageUrl, zoneMass }: { imageUrl: string; zoneMass: Record<string, number> }) => {
  const maxMass = Math.max(...Object.values(zoneMass), 1);

  return (
    <div className="relative rounded-lg overflow-hidden border bg-gray-100 w-fit mx-auto">
      <img src={imageUrl} alt="Eye tracking stimulus" className="max-h-[60vh] w-auto block" draggable={false} />
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
        {ZONE_GRID.map(zone => {
          const mass = zoneMass[zone.id] || 0;
          const intensity = mass / maxMass;
          // Green → yellow → red gradient based on intensity
          const r = Math.round(intensity > 0.5 ? 255 : intensity * 2 * 255);
          const g = Math.round(intensity < 0.5 ? 255 : (1 - intensity) * 2 * 255);
          const alpha = Math.max(0.05, intensity * 0.65);
          return (
            <div
              key={zone.id}
              className="border border-white/10"
              style={{ backgroundColor: `rgba(${r}, ${g}, 0, ${alpha})` }}
              title={`${zone.id}: ${Math.round(intensity * 100)}%`}
            />
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// EMOTION VISUALIZATION
// ==========================================

const EMOTION_COLORS: Record<EkmanEmotion, { bg: string; text: string; bar: string }> = {
  joy:      { bg: 'bg-green-50',  text: 'text-green-700',  bar: 'bg-green-400' },
  surprise: { bg: 'bg-amber-50',  text: 'text-amber-700',  bar: 'bg-amber-400' },
  neutral:  { bg: 'bg-gray-50',   text: 'text-gray-600',   bar: 'bg-gray-400' },
  fear:     { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-400' },
  sadness:  { bg: 'bg-blue-50',   text: 'text-blue-700',   bar: 'bg-blue-400' },
  anger:    { bg: 'bg-red-50',    text: 'text-red-700',    bar: 'bg-red-400' },
  disgust:  { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-400' },
};

const EMOTION_LABELS: Record<EkmanEmotion, string> = {
  joy: 'Joy', sadness: 'Sadness', surprise: 'Surprise',
  anger: 'Anger', disgust: 'Disgust', fear: 'Fear', neutral: 'Neutral',
};

const EmotionDistributionChart = ({ distribution }: { distribution: Record<EkmanEmotion, number> }) => {
  const sorted = useMemo(() =>
    (Object.entries(distribution) as [EkmanEmotion, number][])
      .sort((a, b) => b[1] - a[1]),
    [distribution],
  );
  const maxPct = Math.max(...sorted.map(([, v]) => v), 1);

  return (
    <div className="space-y-2">
      {sorted.map(([emotion, pct]) => {
        const colors = EMOTION_COLORS[emotion];
        return (
          <div key={emotion} className="flex items-center gap-3">
            <span className={`text-xs font-medium w-16 text-right ${colors.text}`}>
              {EMOTION_LABELS[emotion]}
            </span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${colors.bar}`}
                style={{ width: `${(pct / maxPct) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-12">{pct.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
};

const EmotionTimeline = ({ timeline }: { timeline: EmotionAggregation['timeline'] }) => {
  if (timeline.length === 0) return null;

  const maxTs = timeline[timeline.length - 1].timestamp;
  const cellWidth = Math.max(100 / timeline.length, 2);

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Emotion Timeline</h4>
      <div className="flex gap-px rounded-lg overflow-hidden border border-gray-200">
        {timeline.map((sample, i) => {
          const colors = EMOTION_COLORS[sample.emotion];
          return (
            <div
              key={i}
              className={`h-8 ${colors.bar}`}
              style={{ width: `${cellWidth}%`, opacity: Math.max(0.3, sample.confidence) }}
              title={`${(sample.timestamp / 1000).toFixed(1)}s — ${EMOTION_LABELS[sample.emotion]} (${(sample.confidence * 100).toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-400">0s</span>
        <span className="text-[10px] text-gray-400">{(maxTs / 1000).toFixed(1)}s</span>
      </div>
    </div>
  );
};

const EmotionPanel = ({ emotions }: { emotions: EmotionAggregation }) => {
  if (!emotions.enabled) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <SmilePlus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Emotion recognition was not enabled for this stimulus.</p>
      </div>
    );
  }

  if (emotions.totalSamples === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <SmilePlus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No emotion data collected yet.</p>
      </div>
    );
  }

  const dominantColors = EMOTION_COLORS[emotions.dominantEmotion];

  return (
    <div className="space-y-5">
      {/* Dominant emotion + confidence */}
      <div className="flex items-center gap-4">
        <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${dominantColors.bg} ${dominantColors.text}`}>
          {EMOTION_LABELS[emotions.dominantEmotion]}
        </div>
        <span className="text-xs text-gray-500">
          Dominant emotion &middot; {emotions.totalSamples.toLocaleString()} samples &middot; {(emotions.avgConfidence * 100).toFixed(0)}% avg confidence
        </span>
      </div>

      {/* Distribution bars */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Emotion Distribution</h4>
        <EmotionDistributionChart distribution={emotions.distribution} />
      </div>

      {/* Timeline */}
      <EmotionTimeline timeline={emotions.timeline} />

      {/* Per-participant table */}
      {emotions.perParticipant.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Per Participant</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Participant</th>
                  <th className="text-left px-3 py-2 font-medium">Dominant</th>
                  <th className="text-right px-3 py-2 font-medium">Samples</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {emotions.perParticipant.map(p => {
                  const pColors = EMOTION_COLORS[p.dominantEmotion];
                  return (
                    <tr key={p.participantId}>
                      <td className="px-3 py-2 text-gray-700 font-mono text-xs">{p.participantId}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${pColors.bg} ${pColors.text}`}>
                          {EMOTION_LABELS[p.dominantEmotion]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">{p.sampleCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// SEQUENCE COMPARISON
// ==========================================

const SEQUENCE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

const SequencePanel = ({
  sequenceAnalysis,
}: {
  sequenceAnalysis: NonNullable<EyeTrackingStimulus['sequenceAnalysis']>;
}) => {
  const { participantSequences, transitionMatrix, aoiLabels } = sequenceAnalysis;
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    aoiLabels.forEach((label, i) => { map[label] = SEQUENCE_COLORS[i % SEQUENCE_COLORS.length]; });
    return map;
  }, [aoiLabels]);

  return (
    <div className="space-y-6">
      {/* Transition Matrix */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Transition Probabilities</h4>
        <p className="text-xs text-gray-400 mb-2">
          Rows = "from" AOI, columns = "to" AOI. Values = % of transitions.
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="px-2 py-1.5 text-left text-gray-500 font-medium">From \ To</th>
                {aoiLabels.map(label => (
                  <th key={label} className="px-2 py-1.5 text-center font-medium" style={{ color: colorMap[label] }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aoiLabels.map(from => (
                <tr key={from}>
                  <td className="px-2 py-1.5 font-medium" style={{ color: colorMap[from] }}>{from}</td>
                  {aoiLabels.map(to => {
                    const pct = transitionMatrix[from]?.[to] ?? 0;
                    const intensity = pct / 100;
                    const bgAlpha = Math.max(0.03, intensity * 0.6);
                    return (
                      <td
                        key={to}
                        className="px-2 py-1.5 text-center border border-gray-100"
                        style={{
                          backgroundColor: from === to
                            ? `rgba(156, 163, 175, ${bgAlpha})`
                            : `rgba(59, 130, 246, ${bgAlpha})`,
                        }}
                      >
                        <span className={`font-semibold ${pct > 30 ? 'text-blue-800' : pct > 10 ? 'text-gray-700' : 'text-gray-400'}`}>
                          {pct > 0 ? `${pct}%` : '—'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-participant sequences */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Exploration Sequences ({participantSequences.length} participants)
        </h4>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {participantSequences.map(ps => (
            <div key={ps.participantId} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-400 w-24 truncate shrink-0" title={ps.participantId}>
                {ps.participantId}
              </span>
              <div className="flex items-center gap-0.5 flex-wrap">
                {ps.sequence.map((aoi, i) => (
                  <span key={i} className="flex items-center gap-0.5">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                      style={{ backgroundColor: colorMap[aoi] || '#6B7280' }}
                    >
                      {aoi}
                    </span>
                    {i < ps.sequence.length - 1 && (
                      <span className="text-[10px] text-gray-300">→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most common sequence */}
      {participantSequences.length >= 3 && (() => {
        const seqStrings = participantSequences.map(ps => ps.sequence.join('→'));
        const counts: Record<string, number> = {};
        for (const s of seqStrings) counts[s] = (counts[s] || 0) + 1;
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const top3 = sorted.slice(0, 3);
        if (top3.length === 0) return null;
        return (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Most Common Patterns</h4>
            <div className="space-y-1">
              {top3.map(([seq, count], i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-500 w-6">#{i + 1}</span>
                  <div className="flex items-center gap-0.5">
                    {seq.split('→').map((aoi, j) => (
                      <span key={j} className="flex items-center gap-0.5">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                          style={{ backgroundColor: colorMap[aoi] || '#6B7280' }}
                        >
                          {aoi}
                        </span>
                        {j < seq.split('→').length - 1 && <span className="text-[10px] text-gray-300">→</span>}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">
                    {count} participant{count !== 1 ? 's' : ''} ({Math.round((count / participantSequences.length) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ==========================================
// TRANSPARENCY MAP
// ==========================================

const TransparencyMap = ({
  imageUrl,
  fixations,
}: {
  imageUrl: string;
  fixations: EyeTrackingStimulus['fixations'];
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blurAmount, setBlurAmount] = useState(20);
  const [revealRadius, setRevealRadius] = useState(40);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      renderTransparency(img);
    };
    img.src = imageUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  useEffect(() => {
    if (imgRef.current) renderTransparency(imgRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixations, blurAmount, revealRadius]);

  const renderTransparency = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw blurred image as base
    ctx.filter = `blur(${blurAmount}px)`;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = 'none';

    // Dark overlay on blurred
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    // Create reveal mask: draw sharp image, masked by fixation circles
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    // Draw sharp image
    offCtx.drawImage(img, 0, 0, w, h);

    // Create circular mask
    const mask = document.createElement('canvas');
    mask.width = w;
    mask.height = h;
    const maskCtx = mask.getContext('2d');
    if (!maskCtx) return;

    const maxDur = Math.max(...fixations.map(f => f.duration), 1);

    for (const fix of fixations) {
      // Radius proportional to duration
      const baseR = (revealRadius / 100) * Math.min(w, h) * 0.1;
      const durScale = 0.5 + (fix.duration / maxDur) * 0.5;
      const r = baseR * durScale;

      const gradient = maskCtx.createRadialGradient(fix.x, fix.y, 0, fix.x, fix.y, r);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.7, 'rgba(255,255,255,0.6)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      maskCtx.fillStyle = gradient;
      maskCtx.fillRect(fix.x - r, fix.y - r, r * 2, r * 2);
    }

    // Apply mask to sharp image
    offCtx.globalCompositeOperation = 'destination-in';
    offCtx.drawImage(mask, 0, 0);

    // Composite revealed areas onto blurred base
    ctx.drawImage(offscreen, 0, 0);
  }, [fixations, blurAmount, revealRadius]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <label className="text-xs text-gray-500 flex items-center gap-2">
          Blur
          <input
            type="range"
            min={5}
            max={50}
            value={blurAmount}
            onChange={e => setBlurAmount(Number(e.target.value))}
            className="w-20 h-1 accent-blue-600"
          />
          <span className="text-xs text-gray-400 w-8">{blurAmount}px</span>
        </label>
        <label className="text-xs text-gray-500 flex items-center gap-2">
          Reveal
          <input
            type="range"
            min={10}
            max={100}
            value={revealRadius}
            onChange={e => setRevealRadius(Number(e.target.value))}
            className="w-20 h-1 accent-blue-600"
          />
          <span className="text-xs text-gray-400 w-8">{revealRadius}%</span>
        </label>
        <span className="text-xs text-gray-400">{fixations.length} fixations</span>
      </div>
      <div className="rounded-lg overflow-hidden border bg-gray-100 w-fit mx-auto">
        <canvas
          ref={canvasRef}
          className="max-h-[60vh] w-auto block"
        />
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Sharp areas = where participants looked. Blurred = unseen.
      </p>
    </div>
  );
};

// ==========================================
// FIRST LOOK MAP
// ==========================================

const FirstLookOverlay = ({
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

// ==========================================
// SCANPATH VISUALIZATION
// ==========================================

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

const ScanpathOverlay = ({
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

// ==========================================
// VIDEO GAZE PLAYER
// ==========================================

const VideoGazePlayer = ({
  videoUrl,
  gazeTimeline,
}: {
  videoUrl: string;
  gazeTimeline: NonNullable<EyeTrackingStimulus['gazeTimeline']>;
}) => {
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentGazePoints, setCurrentGazePoints] = useState<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    const video = videoPlayerRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const vt = video.currentTime;
      // Show gaze points within ±0.25s of current video time
      const windowMs = 0.25;
      const visible = gazeTimeline
        .filter(p => p.videoTime != null && Math.abs(p.videoTime - vt) < windowMs)
        .map(p => {
          // Convert viewport coords to percentage of video
          const rect = video.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return null;
          return {
            x: ((p.x - rect.left) / rect.width) * 100,
            y: ((p.y - rect.top) / rect.height) * 100,
          };
        })
        .filter((p): p is { x: number; y: number } => p !== null && p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100);

      setCurrentGazePoints(visible);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [gazeTimeline]);

  return (
    <div>
      <div ref={containerRef} className="relative rounded-lg overflow-hidden border bg-gray-100 w-fit mx-auto">
        <video
          ref={videoPlayerRef}
          src={videoUrl}
          controls
          className="max-h-[60vh] w-auto block"
          playsInline
        />
        {/* Gaze overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {currentGazePoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="1.2"
              fill="rgba(59, 130, 246, 0.5)"
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth="0.3"
            />
          ))}
        </svg>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        {gazeTimeline.length.toLocaleString()} gaze points synced to video timeline
      </p>
    </div>
  );
};

// ==========================================
// PREDICTION PANEL
// ==========================================

const PredictionPanel = ({
  stimulus,
  researchId,
  onPredictionComplete,
}: {
  stimulus: EyeTrackingStimulus & { stimulusUrl: string };
  researchId: string;
  onPredictionComplete: () => void;
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunPrediction = useCallback(async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await mediaService.predictModuleAttention(researchId, stimulus.moduleId);
      onPredictionComplete();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setIsProcessing(false);
    }
  }, [researchId, stimulus.moduleId, onPredictionComplete]);

  if (stimulus.predictionHeatmap && stimulus.predictionHeatmap.length > 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">
            {stimulus.predictionHeatmap.length.toLocaleString()} saliency points
            {stimulus.predictionProcessedAt && ` \u00b7 ${new Date(stimulus.predictionProcessedAt).toLocaleDateString()}`}
          </p>
          <button
            onClick={handleRunPrediction}
            disabled={isProcessing}
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Re-run prediction'}
          </button>
        </div>
        <HeatmapRenderer
          imageUrl={stimulus.stimulusUrl}
          data={stimulus.predictionHeatmap.map(p => ({ x: p.x, y: p.y, value: p.value }))}
          className="w-full"
        />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-600 mb-4">
        Run TranSalNet attention prediction to see where viewers are likely to look.
      </p>
      <button
        onClick={handleRunPrediction}
        disabled={isProcessing || !stimulus.stimulusUrl}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Run Prediction
          </>
        )}
      </button>
      {errorMsg && (
        <p className="text-xs text-red-500 mt-3">{errorMsg}</p>
      )}
    </div>
  );
};

const StimulusCard = ({ stimulus: rawStimulus, researchId, onRefresh }: { stimulus: EyeTrackingStimulus; researchId: string; onRefresh: () => void }) => {
  const stimulus = { ...rawStimulus, stimulusUrl: resolveStimulusUrl(rawStimulus.stimulusUrl) };
  const hasZoneMass = stimulus.zoneMass && Object.values(stimulus.zoneMass).some(v => v > 0);
  const hasHeatData = hasZoneMass || stimulus.heatmapData.length > 0;
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [imageContainerRef, setImageContainerRef] = useState<HTMLDivElement | null>(null);

  const handleDownload = useCallback(async () => {
    if (!imageContainerRef) return;
    try {
      const dataUrl = await toPng(imageContainerRef);
      const link = document.createElement('a');
      link.download = `eye-tracking-${stimulus.moduleName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch { /* ignore download errors */ }
  }, [imageContainerRef, stimulus.moduleName]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Toolbar */}

      {/* Metrics bar */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-100">
        <MetricBadge
          icon={<Users className="h-4 w-4" />}
          label="Participants"
          value={stimulus.uniqueParticipants}
        />
        <MetricBadge
          icon={<Eye className="h-4 w-4" />}
          label="Responses"
          value={stimulus.totalResponses}
        />
        <MetricBadge
          icon={<Clock className="h-4 w-4" />}
          label="Avg Dwell Time"
          value={stimulus.avgDwellTime > 0 ? `${(stimulus.avgDwellTime / 1000).toFixed(1)}s` : '—'}
        />
        <MetricBadge
          icon={<Crosshair className="h-4 w-4" />}
          label="Avg Fixations"
          value={stimulus.avgFixationCount || '—'}
        />
      </div>

      {/* View mode tabs + Download */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex gap-2">
          <ViewModeTab
            active={viewMode === 'heatmap'}
            onClick={() => setViewMode('heatmap')}
            icon={<Eye className="h-4 w-4" />}
            label="Heat map"
          />
          <ViewModeTab
            active={viewMode === 'scanpath'}
            onClick={() => setViewMode('scanpath')}
            icon={<Crosshair className="h-4 w-4" />}
            label="Scan Path"
          />
          <ViewModeTab
            active={viewMode === 'firstlook'}
            onClick={() => setViewMode('firstlook')}
            icon={<Eye className="h-4 w-4" />}
            label="First Look"
          />
          <ViewModeTab
            active={viewMode === 'transparency'}
            onClick={() => setViewMode('transparency')}
            icon={<Eye className="h-4 w-4" />}
            label="Transparency"
          />
          {stimulus.sequenceAnalysis && (
            <ViewModeTab
              active={viewMode === 'sequence'}
              onClick={() => setViewMode('sequence')}
              icon={<Crosshair className="h-4 w-4" />}
              label="Sequence"
            />
          )}
          <ViewModeTab
            active={viewMode === 'image'}
            onClick={() => setViewMode('image')}
            icon={<Image className="h-4 w-4" />}
            label="Image"
          />
          {stimulus.emotions?.enabled && (
            <ViewModeTab
              active={viewMode === 'emotions'}
              onClick={() => setViewMode('emotions')}
              icon={<SmilePlus className="h-4 w-4" />}
              label="Emotions"
            />
          )}
          <ViewModeTab
            active={viewMode === 'prediction'}
            onClick={() => setViewMode('prediction')}
            icon={<Sparkles className="h-4 w-4" />}
            label="Prediction"
          />
          {stimulus.stimulusType === 'video' && stimulus.gazeTimeline && stimulus.gazeTimeline.length > 0 && (
            <ViewModeTab
              active={viewMode === 'video'}
              onClick={() => setViewMode('video')}
              icon={<Eye className="h-4 w-4" />}
              label="Video Gaze"
            />
          )}
        </div>
        {stimulus.stimulusUrl && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download image
          </button>
        )}
      </div>

      {/* Stimulus image / heatmap / emotions / prediction */}
      <div className="px-5 pb-4">
        {viewMode === 'sequence' && stimulus.sequenceAnalysis ? (
          <SequencePanel sequenceAnalysis={stimulus.sequenceAnalysis} />
        ) : viewMode === 'transparency' && stimulus.stimulusUrl ? (
          <TransparencyMap imageUrl={stimulus.stimulusUrl} fixations={stimulus.fixations} />
        ) : viewMode === 'firstlook' && stimulus.stimulusUrl ? (
          <FirstLookOverlay imageUrl={stimulus.stimulusUrl} fixations={stimulus.fixations} />
        ) : viewMode === 'scanpath' && stimulus.stimulusUrl ? (
          <ScanpathOverlay
            imageUrl={stimulus.stimulusUrl}
            fixations={stimulus.fixations}
          />
        ) : viewMode === 'video' && stimulus.gazeTimeline ? (
          <VideoGazePlayer videoUrl={stimulus.stimulusUrl} gazeTimeline={stimulus.gazeTimeline} />
        ) : viewMode === 'emotions' ? (
          <EmotionPanel emotions={stimulus.emotions} />
        ) : viewMode === 'prediction' ? (
          <PredictionPanel stimulus={stimulus} researchId={researchId} onPredictionComplete={onRefresh} />
        ) : stimulus.stimulusUrl ? (
          <div ref={setImageContainerRef} className="w-fit mx-auto">
            {viewMode === 'heatmap' && hasHeatData ? (
              hasZoneMass ? (
                <ZoneHeatmapOverlay imageUrl={stimulus.stimulusUrl} zoneMass={stimulus.zoneMass!} />
              ) : (
                <HeatmapRenderer
                  imageUrl={stimulus.stimulusUrl}
                  data={stimulus.heatmapData.map(p => ({ x: p.x, y: p.y, value: p.duration }))}
                  className="w-full"
                />
              )
            ) : (
              <div className="rounded-lg overflow-hidden border bg-gray-100 w-fit mx-auto">
                <img
                  src={stimulus.stimulusUrl}
                  alt={stimulus.moduleName}
                  className="max-h-[60vh] w-auto block"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-gray-100 border border-gray-200 h-64 flex items-center justify-center">
            <div className="text-center">
              <Image className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No stimulus image configured</p>
            </div>
          </div>
        )}
      </div>

      {/* AOI list */}
      {stimulus.aois.length > 0 && (
        <div className="px-5 pb-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Areas of Interest</h4>
          <div className="space-y-2">
            {stimulus.aois.map((aoi, idx) => (
              <AOIRow key={aoi.id} aoi={aoi} index={idx} stimulusUrl={stimulus.stimulusUrl} />
            ))}
          </div>
        </div>
      )}

      {/* No data message */}
      {stimulus.totalResponses === 0 && (
        <div className="px-5 pb-5">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">
              No responses yet. Data will appear here once participants complete this eye tracking test.
            </p>
          </div>
        </div>
      )}

      {/* Response count footer */}
      {stimulus.totalResponses > 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-400 text-right">
            {stimulus.totalResponses} response{stimulus.totalResponses !== 1 ? 's' : ''} from {stimulus.uniqueParticipants} participant{stimulus.uniqueParticipants !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

// ==========================================
// HELPER COMPONENTS
// ==========================================

const MetricBadge = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <div className="text-center">
    <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
      {icon}
      <span className="text-xs">{label}</span>
    </div>
    <p className="text-lg font-semibold text-gray-900">{value}</p>
  </div>
);

const ViewModeTab = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors
      ${active
        ? 'bg-blue-100 text-blue-700 font-medium'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }
    `}
  >
    {icon}
    {label}
  </button>
);

const AOIRow = ({ aoi, index, stimulusUrl }: { aoi: EyeTrackingAOI; index: number; stimulusUrl: string }) => (
  <div className="flex items-center gap-4 p-3 bg-white border rounded-lg">
    {/* Thumbnail: cropped preview of the AOI region */}
    {stimulusUrl && (
      <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 border bg-gray-50">
        <img
          src={stimulusUrl}
          alt={`AOI ${index + 1}`}
          className="w-full h-full"
          style={{
            objectFit: 'cover',
            objectPosition: `${aoi.x + aoi.width / 2}% ${aoi.y + aoi.height / 2}%`,
          }}
        />
      </div>
    )}

    {/* Label + index */}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">
        {aoi.label || `Area of Interest (AOI)`}
      </p>
      <p className="text-xs text-gray-400">#{index + 1}</p>
    </div>

    {/* Stats */}
    <div className="flex items-center gap-6 text-sm">
      <div className="text-center">
        <p className="font-semibold text-blue-600">{aoi.dwellTimePercent}%</p>
        <p className="text-xs text-gray-400">Dwell</p>
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-700">
          <Crosshair className="h-3.5 w-3.5 inline-block mr-0.5 -mt-0.5" />
          {aoi.fixationCount}
        </p>
        <p className="text-xs text-gray-400">Fixations</p>
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-700">
          {aoi.avgDuration > 0 ? `${(aoi.avgDuration / 1000).toFixed(1)}s` : '—'}
        </p>
        <p className="text-xs text-gray-400">Duration</p>
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-700">
          <Users className="h-3.5 w-3.5 inline-block mr-0.5 -mt-0.5" />
          {aoi.participantCount}
        </p>
        <p className="text-xs text-gray-400">Viewers</p>
      </div>
      {aoi.avgTTFF != null && aoi.avgTTFF > 0 && (
        <div className="text-center">
          <p className="font-semibold text-purple-600">
            {aoi.avgTTFF < 1000 ? `${aoi.avgTTFF}ms` : `${(aoi.avgTTFF / 1000).toFixed(1)}s`}
          </p>
          <p className="text-xs text-gray-400">TTFF</p>
        </div>
      )}
      {aoi.noticeRate != null && (
        <div className="text-center">
          <p className="font-semibold text-green-600">{aoi.noticeRate}%</p>
          <p className="text-xs text-gray-400">Noticed</p>
        </div>
      )}
      {aoi.dominantEmotion && aoi.dominantEmotion !== 'neutral' && (
        <div className="text-center">
          <p className={`text-xs font-semibold px-2 py-0.5 rounded ${EMOTION_COLORS[aoi.dominantEmotion]?.bg || 'bg-gray-50'} ${EMOTION_COLORS[aoi.dominantEmotion]?.text || 'text-gray-600'}`}>
            {EMOTION_LABELS[aoi.dominantEmotion] || aoi.dominantEmotion}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Emotion</p>
        </div>
      )}
    </div>
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

export const EyeTrackingResults = ({ researchId, className }: EyeTrackingResultsProps) => {
  const [data, setData] = useState<analyticsService.EyeTrackingResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    demographicData,
    demographicFilters,
    setDemographicFilters,
    userIdFilter,
    setUserIdFilter,
    filteredParticipantIds,
  } = useResultsFilter(researchId);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await analyticsService.getEyeTrackingResults(researchId);
      setData(results);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load eye tracking results'));
    } finally {
      setIsLoading(false);
    }
  }, [researchId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter stimulus data by participant IDs
  const filteredStimuli = useMemo(() => {
    if (!data?.stimuli || !filteredParticipantIds) return data?.stimuli ?? [];
    return data.stimuli.map(stimulus => ({
      ...stimulus,
      fixations: stimulus.fixations.filter(f => filteredParticipantIds.has(f.participantId)),
      participants: stimulus.participants.filter(p => filteredParticipantIds.has(p.participantId)),
      uniqueParticipants: stimulus.participants.filter(p => filteredParticipantIds.has(p.participantId)).length,
      emotions: {
        ...stimulus.emotions,
        perParticipant: stimulus.emotions.perParticipant.filter(p => filteredParticipantIds.has(p.participantId)),
      },
    }));
  }, [data?.stimuli, filteredParticipantIds]);

  const loadingSkeleton = (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-96 bg-gray-200 rounded-xl" />
      <div className="h-96 bg-gray-200 rounded-xl" />
    </div>
  );

  return (
    <ResultsStateHandler
      isLoading={isLoading}
      error={error}
      onRetry={fetchData}
      loadingSkeleton={loadingSkeleton}
    >
      {data && (
        <div className={`flex gap-6 ${className ?? ''}`}>
          <div className="flex-1 min-w-0">
            {filteredStimuli.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <Eye className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-lg font-medium text-gray-900 mb-2">No Eye Tracking modules found</p>
                <p className="text-sm text-gray-500">
                  This research does not have Eye Tracking stimuli configured.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {filteredStimuli.map(stimulus => (
                  <StimulusCard key={stimulus.moduleId} stimulus={stimulus} researchId={researchId} onRefresh={fetchData} />
                ))}
              </div>
            )}
          </div>
          <div className="w-80 shrink-0 sticky top-4 self-start max-h-[700px] overflow-y-auto">
            <Filters
              researchId={researchId}
              demographicData={demographicData}
              selectedFilters={demographicFilters}
              onFilterChange={setDemographicFilters}
              userIdFilter={userIdFilter}
              onUserIdFilterChange={setUserIdFilter}
            />
          </div>
        </div>
      )}
    </ResultsStateHandler>
  );
};
