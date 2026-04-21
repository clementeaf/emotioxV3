import { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { HeatmapRenderer } from '../cognitive-task/components/HeatmapRenderer';
import { cn } from '../../../lib/utils';

// ---------------------------------------------------------------------------
// Types & presets (shared with AttentionPredictionCard)
// ---------------------------------------------------------------------------

export interface HeatmapSettings {
  blur: number;
  opacity: number;
  threshold: number;
  preset: string;
}

export const DEFAULT_HEATMAP_SETTINGS: HeatmapSettings = {
  blur: 12,
  opacity: 72,
  threshold: 35,
  preset: 'Balanced',
};

const DETAIL_PRESETS = ['Smooth', 'Balanced', 'Detailed'] as const;

const PRESET_VALUES: Record<string, Pick<HeatmapSettings, 'blur' | 'threshold' | 'opacity'>> = {
  Smooth:   { blur: 20, threshold: 50, opacity: 60 },
  Balanced: { blur: 12, threshold: 35, opacity: 72 },
  Detailed: { blur: 6,  threshold: 25, opacity: 85 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface HeatmapSettingsModalProps {
  imageUrl: string;
  heatmapData: Array<{ x: number; y: number; value?: number }>;
  settings: HeatmapSettings;
  coordSystem?: 'pixel' | 'percent' | 'normalized';
  onApply: (s: HeatmapSettings) => void;
  onClose: () => void;
}

export const HeatmapSettingsModal = ({
  imageUrl,
  heatmapData,
  settings,
  coordSystem,
  onApply,
  onClose,
}: HeatmapSettingsModalProps) => {
  const [local, setLocal] = useState<HeatmapSettings>({ ...settings });
  const [tab, setTab] = useState<'heatmap' | 'original'>('heatmap');
  const previewRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    const el = previewRef.current;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'heatmap-export.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Heatmap Settings</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex gap-0 overflow-auto">
          {/* Left: preview */}
          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              {(['heatmap', 'original'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded transition-colors',
                    tab === t ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {t === 'heatmap' ? 'Heat map' : 'Original'}
                </button>
              ))}
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => void handleDownload()}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                Download Image
              </button>
            </div>

            <div ref={previewRef} className="rounded-lg overflow-hidden border bg-gray-100">
              {tab === 'original' ? (
                <img src={imageUrl} alt="Original" className="w-full block" />
              ) : (
                <HeatmapRenderer
                  imageUrl={imageUrl}
                  data={heatmapData}
                  blur={local.blur}
                  opacity={local.opacity}
                  threshold={local.threshold}
                  coordSystem={coordSystem}
                  className="w-full"
                />
              )}
            </div>
          </div>

          {/* Right: controls */}
          <div className="w-72 flex-shrink-0 p-5 border-l space-y-5 overflow-y-auto max-h-[75vh]">
            {/* Detail preset */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Detail preset</label>
              <div className="flex gap-1">
                {DETAIL_PRESETS.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      const vals = PRESET_VALUES[p];
                      setLocal(prev => ({ ...prev, preset: p, ...vals }));
                    }}
                    className={cn(
                      'flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors',
                      local.preset === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Adjusts blur, threshold, and opacity together</p>
            </div>

            {/* Blur */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Blur</label>
                <input
                  type="number"
                  value={local.blur}
                  onChange={e => setLocal(prev => ({ ...prev, blur: Number(e.target.value), preset: 'Custom' }))}
                  className="w-14 px-2 py-1 text-sm border rounded text-right"
                  min={0} max={50}
                />
              </div>
              <p className="text-xs text-gray-400 mb-1.5">Blur radius for the heatmap</p>
              <input
                type="range" value={local.blur}
                onChange={e => setLocal(prev => ({ ...prev, blur: Number(e.target.value), preset: 'Custom' }))}
                min={0} max={50} className="w-full accent-blue-600"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Opacity</label>
                <input
                  type="number"
                  value={local.opacity}
                  onChange={e => setLocal(prev => ({ ...prev, opacity: Number(e.target.value), preset: 'Custom' }))}
                  className="w-14 px-2 py-1 text-sm border rounded text-right"
                  min={0} max={100}
                />
              </div>
              <p className="text-xs text-gray-400 mb-1.5">Heatmap intensity (%)</p>
              <input
                type="range" value={local.opacity}
                onChange={e => setLocal(prev => ({ ...prev, opacity: Number(e.target.value), preset: 'Custom' }))}
                min={0} max={100} className="w-full accent-blue-600"
              />
            </div>

            {/* Threshold */}
            {tab === 'heatmap' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Threshold</label>
                  <input
                    type="number"
                    value={local.threshold}
                    onChange={e => setLocal(prev => ({ ...prev, threshold: Number(e.target.value), preset: 'Custom' }))}
                    className="w-14 px-2 py-1 text-sm border rounded text-right"
                    min={0} max={100}
                  />
                </div>
                <p className="text-xs text-gray-400 mb-1.5">Minimum value to display</p>
                <input
                  type="range" value={local.threshold}
                  onChange={e => setLocal(prev => ({ ...prev, threshold: Number(e.target.value), preset: 'Custom' }))}
                  min={0} max={100} className="w-full accent-blue-600"
                />
              </div>
            )}

            {/* Apply */}
            <button
              type="button"
              onClick={() => { onApply(local); onClose(); }}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Apply Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
