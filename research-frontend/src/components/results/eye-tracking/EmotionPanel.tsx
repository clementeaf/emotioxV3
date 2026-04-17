import { useMemo } from 'react';
import { SmilePlus } from 'lucide-react';
import type { EmotionAggregation, EkmanEmotion } from '../../../services/analytics.service';
import { EMOTION_COLORS, EMOTION_LABELS } from './shared';

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

export const EmotionPanel = ({ emotions }: { emotions: EmotionAggregation }) => {
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
