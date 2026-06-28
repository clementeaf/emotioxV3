/**
 * ZoneMetricsPanel — V2 zone-based attention metrics.
 *
 * Displays:
 *   - Dwell time bar chart per zone
 *   - First zone badge
 *   - Exploration order timeline
 *   - Average confidence badge
 *
 * Renders only when V2 zone data is available.
 */

import { useMemo } from 'react';
import {
  buildDwellBars,
  buildAttentionSummary,
  explorationOrder,
  formatDwellTime,
  formatPercent,
  type V2ZoneMetrics,
  type V2ZoneDefinition,
} from '../../../utils/eyeTrackingV2';

interface ZoneMetricsPanelProps {
  readonly metrics: Record<string, V2ZoneMetrics>;
  readonly zones: readonly V2ZoneDefinition[];
}

export function ZoneMetricsPanel({ metrics, zones }: ZoneMetricsPanelProps) {
  const bars = useMemo(() => buildDwellBars(metrics, zones), [metrics, zones]);
  const summary = useMemo(() => buildAttentionSummary(metrics, zones), [metrics, zones]);
  const order = useMemo(() => explorationOrder(metrics, zones), [metrics, zones]);
  const maxDwell = bars[0]?.dwellMs ?? 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        <Badge label="Zonas visitadas" value={`${summary.visitedZones}/${summary.totalZones}`} />
        <Badge label="Tiempo total" value={formatDwellTime(summary.totalDwellMs)} />
        <Badge label="Fijaciones" value={String(summary.totalFixations)} />
        <Badge label="Confianza promedio" value={formatPercent(summary.avgConfidence * 100)} />
        {summary.firstZone && (
          <Badge label="Primera zona" value={summary.firstZone.label} accent />
        )}
      </div>

      {/* Dwell time bars */}
      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Tiempo por zona
        </h4>
        {bars.map((bar) => (
          <div key={bar.zoneId} className="flex items-center gap-2">
            <span className="w-28 text-xs text-slate-600 truncate" title={bar.label}>
              {bar.label}
            </span>
            <div className="flex-1 h-5 bg-slate-100 rounded-sm overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-sm transition-all"
                style={{ width: `${(bar.dwellMs / maxDwell) * 100}%` }}
              />
            </div>
            <span className="w-16 text-xs text-slate-500 text-right">
              {formatDwellTime(bar.dwellMs)}
            </span>
            <span className="w-12 text-xs text-slate-400 text-right">
              {formatPercent(bar.dwellPercent)}
            </span>
          </div>
        ))}
      </div>

      {/* Exploration order */}
      {order.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Orden de exploracion
          </h4>
          <div className="flex items-center gap-1 flex-wrap">
            {order.map((entry, i) => (
              <div key={entry.zoneId} className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-700">
                  <span className="font-semibold text-blue-600">{i + 1}</span>
                  {entry.label}
                </span>
                {i < order.length - 1 && (
                  <span className="text-slate-300 text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge sub-component
// ---------------------------------------------------------------------------

function Badge({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`
      flex flex-col items-center px-3 py-1.5 rounded-lg
      ${accent ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'}
    `}>
      <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-semibold ${accent ? 'text-blue-700' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  );
}
