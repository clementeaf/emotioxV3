import { useState, useEffect, useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import { cn } from '../../lib/utils';
import { HeatmapRenderer } from '../results/cognitive-task/components/HeatmapRenderer';
import { SpotlightRenderer } from '../results/cognitive-task/components/SpotlightRenderer';
import { ColdMapRenderer } from '../results/cognitive-task/components/ColdMapRenderer';
import {
    ACTIVE_HEATMAP_MAP_MODES,
    getHeatmapMapModeLabel,
    resolveHeatmapVisualProfile,
    STIMULUS_MEDIA_FIT_CLASS,
    STIMULUS_VIEWPORT_MAX_HEIGHT_CLASS,
    type HeatmapMapMode,
    type SpotlightSettings,
    type ColdMapSettings,
} from '../../utils/attentionPrediction.utils';
import { PRESET_VALUES } from './MapModeControlBar';

/* ─── Types ─── */

export interface HeatmapPoint {
    x: number;
    y: number;
    value?: number;
}

export interface HeatmapSettings {
    blur: number;
    opacity: number;
    threshold: number;
    preset: string;
}

export const DEFAULT_SETTINGS: HeatmapSettings = {
    blur: 5,
    opacity: 45,
    threshold: 68,
    preset: 'Lab',
};

export interface HeatmapViewSettings {
    settings: HeatmapSettings;
    mapMode: HeatmapMapMode;
    spotlight: SpotlightSettings;
    cold: ColdMapSettings;
}

/* ─── Helpers ─── */

/** Debounces a value — returns the latest value after `delay` ms of inactivity. */
export const useDebouncedValue = <T,>(value: T, delay: number): T => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
};

const DETAIL_PRESETS = ['Lab', 'Precise', 'Balanced', 'Smooth'];

const TAB_ICONS: Record<string, React.ReactNode> = {
    eye: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    image: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
};

/* ─── Saved presets (localStorage) ─── */

const HEATMAP_PRESETS_KEY = 'emotiox-heatmap-presets';

interface SavedHeatmapPreset {
    name: string;
    blur: number;
    opacity: number;
    threshold: number;
}

const loadHeatmapPresets = (): SavedHeatmapPreset[] => {
    try { return JSON.parse(localStorage.getItem(HEATMAP_PRESETS_KEY) || '[]'); } catch { return []; }
};

const persistHeatmapPresets = (presets: SavedHeatmapPreset[]) => {
    localStorage.setItem(HEATMAP_PRESETS_KEY, JSON.stringify(presets));
};

/* ─── Component ─── */

interface HeatmapSettingsModalProps {
    imageUrl: string;
    heatmapData: HeatmapPoint[];
    settings: HeatmapSettings;
    mapMode: HeatmapMapMode;
    spotlightSettings: SpotlightSettings;
    coldSettings: ColdMapSettings;
    onLiveChange: (view: HeatmapViewSettings) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export const HeatmapSettingsModal = ({
    imageUrl,
    heatmapData,
    settings,
    mapMode,
    spotlightSettings,
    coldSettings,
    onLiveChange,
    onConfirm,
    onCancel,
}: HeatmapSettingsModalProps) => {
    const [local, setLocal] = useState<HeatmapSettings>({ ...settings });
    const [localMapMode, setLocalMapMode] = useState<HeatmapMapMode>(mapMode);
    const [localSpotlight, setLocalSpotlight] = useState<SpotlightSettings>({ ...spotlightSettings });
    const [localCold, setLocalCold] = useState<ColdMapSettings>({ ...coldSettings });
    const debouncedLocal = useDebouncedValue(local, 120);
    const debouncedSpotlight = useDebouncedValue(localSpotlight, 120);
    const debouncedCold = useDebouncedValue(localCold, 120);
    const debouncedMapMode = useDebouncedValue(localMapMode, 0);
    const [settingsTab, setSettingsTab] = useState<'heatmap' | 'original'>('heatmap');
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setLocal({ ...settings }); }, [settings]);
    useEffect(() => { setLocalMapMode(mapMode); }, [mapMode]);
    useEffect(() => { setLocalSpotlight({ ...spotlightSettings }); }, [spotlightSettings]);
    useEffect(() => { setLocalCold({ ...coldSettings }); }, [coldSettings]);

    useEffect(() => {
        onLiveChange({
            settings: debouncedLocal,
            mapMode: debouncedMapMode,
            spotlight: debouncedSpotlight,
            cold: debouncedCold,
        });
    }, [debouncedLocal, debouncedMapMode, debouncedSpotlight, debouncedCold, onLiveChange]);

    const [savedPresets, setSavedPresets] = useState<SavedHeatmapPreset[]>(loadHeatmapPresets);
    const [showSavePreset, setShowSavePreset] = useState(false);
    const [presetName, setPresetName] = useState('');

    const handleDownload = useCallback(async () => {
        const el = previewRef.current;
        if (!el) return;
        try {
            const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = 'attention-prediction-settings.png';
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            // Download failed silently
        }
    }, []);

    const savePreset = () => {
        if (!presetName.trim()) return;
        const updated = [
            ...savedPresets.filter(p => p.name !== presetName.trim()),
            { name: presetName.trim(), blur: local.blur, opacity: local.opacity, threshold: local.threshold },
        ];
        setSavedPresets(updated);
        persistHeatmapPresets(updated);
        setPresetName('');
        setShowSavePreset(false);
    };

    const deletePreset = (name: string) => {
        const updated = savedPresets.filter(sp => sp.name !== name);
        setSavedPresets(updated);
        persistHeatmapPresets(updated);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4"
            onClick={onCancel}
            role="presentation"
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="heatmap-settings-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h3 id="heatmap-settings-title" className="text-base font-semibold text-gray-900">
                            Heatmap Settings
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Vista ampliada y ajuste fino. Los cambios se aplican en vivo al visor principal.
                        </p>
                    </div>
                    <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
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
                            {(['heatmap', 'original'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setSettingsTab(tab)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors',
                                        settingsTab === tab
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                    )}
                                >
                                    {tab === 'heatmap' && TAB_ICONS.eye}
                                    {tab === 'original' && TAB_ICONS.image}
                                    {tab === 'heatmap' ? 'Heat map' : 'Original'}
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
                            <SettingsPreview
                                settingsTab={settingsTab}
                                imageUrl={imageUrl}
                                heatmapData={heatmapData}
                                mapMode={debouncedMapMode}
                                local={debouncedLocal}
                                spotlight={debouncedSpotlight}
                                cold={debouncedCold}
                            />
                        </div>
                    </div>

                    {/* Right: controls */}
                    <div className="w-72 flex-shrink-0 p-5 border-l space-y-5 overflow-y-auto max-h-[75vh]">
                        {settingsTab === 'heatmap' && (
                            <MapModeSelector mode={localMapMode} onChange={setLocalMapMode} />
                        )}

                        {settingsTab === 'heatmap' && localMapMode === 'classic' && (
                            <ClassicControls
                                local={local}
                                onLocalChange={setLocal}
                            />
                        )}

                        {settingsTab === 'heatmap' && localMapMode === 'spotlight' && (
                            <SpotlightControls
                                spotlight={localSpotlight}
                                threshold={local.threshold}
                                onSpotlightChange={setLocalSpotlight}
                                onThresholdChange={(t) => setLocal(prev => ({ ...prev, threshold: t, preset: 'Custom' }))}
                            />
                        )}

                        {settingsTab === 'heatmap' && localMapMode === 'cold' && (
                            <ColdControls cold={localCold} onChange={setLocalCold} />
                        )}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                            >
                                Listo
                            </button>
                        </div>

                        {/* Save / load user presets */}
                        <div className="pt-3 border-t border-gray-100 space-y-2">
                            {showSavePreset ? (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        value={presetName}
                                        onChange={e => setPresetName(e.target.value)}
                                        placeholder="Preset name..."
                                        className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') savePreset();
                                            if (e.key === 'Escape') setShowSavePreset(false);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        disabled={!presetName.trim()}
                                        onClick={savePreset}
                                        className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-40 transition-colors"
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowSavePreset(false)}
                                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowSavePreset(true)}
                                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    Save as preset
                                </button>
                            )}

                            {savedPresets.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {savedPresets.map(p => (
                                        <div key={p.name} className="flex items-center gap-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setLocal(prev => ({ ...prev, blur: p.blur, opacity: p.opacity, threshold: p.threshold, preset: p.name }))}
                                                className={cn(
                                                    'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                                                    local.preset === p.name
                                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                                                )}
                                            >
                                                {p.name}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deletePreset(p.name)}
                                                className="p-0.5 text-gray-300 hover:text-red-500 transition-colors"
                                                title="Delete preset"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─── Sub-components (private to this file) ─── */

const SettingsPreview = ({
    settingsTab,
    imageUrl,
    heatmapData,
    mapMode,
    local,
    spotlight,
    cold,
}: {
    settingsTab: 'heatmap' | 'original';
    imageUrl: string;
    heatmapData: HeatmapPoint[];
    mapMode: HeatmapMapMode;
    local: HeatmapSettings;
    spotlight: SpotlightSettings;
    cold: ColdMapSettings;
}) => {
    if (settingsTab === 'original') {
        return <img src={imageUrl} alt="Original" className={STIMULUS_MEDIA_FIT_CLASS} />;
    }
    if (mapMode === 'spotlight') {
        return (
            <SpotlightRenderer
                imageUrl={imageUrl}
                data={heatmapData}
                blur={spotlight.blur}
                reveal={spotlight.reveal}
                dim={spotlight.dim}
                threshold={local.threshold}
                className={`w-full ${STIMULUS_VIEWPORT_MAX_HEIGHT_CLASS}`}
            />
        );
    }
    if (mapMode === 'cold') {
        return (
            <ColdMapRenderer
                imageUrl={imageUrl}
                data={heatmapData}
                intensity={cold.intensity}
                blur={cold.blur}
                threshold={cold.threshold}
                className={`w-full ${STIMULUS_VIEWPORT_MAX_HEIGHT_CLASS}`}
            />
        );
    }
    return (
        <HeatmapRenderer
            imageUrl={imageUrl}
            data={heatmapData}
            blur={local.blur}
            opacity={local.opacity}
            threshold={local.threshold}
            granularity={local.preset === 'Smooth' ? 'smooth' : 'precise'}
            visualProfile={resolveHeatmapVisualProfile(local.preset)}
            className={`w-full ${STIMULUS_VIEWPORT_MAX_HEIGHT_CLASS}`}
        />
    );
};

const MapModeSelector = ({
    mode,
    onChange,
}: {
    mode: HeatmapMapMode;
    onChange: (m: HeatmapMapMode) => void;
}) => (
    <div>
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Map mode</label>
        <div className="flex gap-1">
            {ACTIVE_HEATMAP_MAP_MODES.map((m) => (
                <button
                    key={m}
                    type="button"
                    onClick={() => onChange(m)}
                    className={cn(
                        'flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors',
                        mode === m
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                    )}
                >
                    {getHeatmapMapModeLabel(m)}
                </button>
            ))}
        </div>
    </div>
);

const SliderControl = ({
    label,
    value,
    min,
    max,
    description,
    suffix,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    description?: string;
    suffix?: string;
    onChange: (v: number) => void;
}) => (
    <div>
        <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <span className="text-sm text-gray-500">{value}{suffix}</span>
        </div>
        {description && <p className="text-xs text-gray-400 mb-1.5">{description}</p>}
        <input
            type="range"
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            min={min}
            max={max}
            className="w-full accent-blue-600"
        />
    </div>
);

const ClassicControls = ({
    local,
    onLocalChange,
}: {
    local: HeatmapSettings;
    onLocalChange: React.Dispatch<React.SetStateAction<HeatmapSettings>>;
}) => (
    <>
        <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Detail preset</label>
            <div className="flex gap-1">
                {DETAIL_PRESETS.map(p => (
                    <button
                        key={p}
                        type="button"
                        onClick={() => onLocalChange(prev => ({ ...prev, preset: p, ...PRESET_VALUES[p] }))}
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

        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Blur</label>
                <input
                    type="number"
                    value={local.blur}
                    onChange={e => onLocalChange(prev => ({ ...prev, blur: Number(e.target.value), preset: 'Custom' }))}
                    className="w-14 px-2 py-1 text-sm border rounded text-right"
                    min={0}
                    max={50}
                />
            </div>
            <p className="text-xs text-gray-400 mb-1.5">Blur radius for the heatmap</p>
            <input
                type="range"
                value={local.blur}
                onChange={e => onLocalChange(prev => ({ ...prev, blur: Number(e.target.value), preset: 'Custom' }))}
                min={0}
                max={50}
                className="w-full accent-blue-600"
            />
        </div>

        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Opacity</label>
                <input
                    type="number"
                    value={local.opacity}
                    onChange={e => onLocalChange(prev => ({ ...prev, opacity: Number(e.target.value), preset: 'Custom' }))}
                    className="w-14 px-2 py-1 text-sm border rounded text-right"
                    min={0}
                    max={100}
                />
            </div>
            <p className="text-xs text-gray-400 mb-1.5">Heatmap intensity (%)</p>
            <input
                type="range"
                value={local.opacity}
                onChange={e => onLocalChange(prev => ({ ...prev, opacity: Number(e.target.value), preset: 'Custom' }))}
                min={0}
                max={100}
                className="w-full accent-blue-600"
            />
        </div>

        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Threshold</label>
                <input
                    type="number"
                    value={local.threshold}
                    onChange={e => onLocalChange(prev => ({ ...prev, threshold: Number(e.target.value), preset: 'Custom' }))}
                    className="w-14 px-2 py-1 text-sm border rounded text-right"
                    min={0}
                    max={100}
                />
            </div>
            <p className="text-xs text-gray-400 mb-1.5">Minimum saliency value to display</p>
            <input
                type="range"
                value={local.threshold}
                onChange={e => onLocalChange(prev => ({ ...prev, threshold: Number(e.target.value), preset: 'Custom' }))}
                min={0}
                max={100}
                className="w-full accent-blue-600"
            />
        </div>
    </>
);

const SpotlightControls = ({
    spotlight,
    threshold,
    onSpotlightChange,
    onThresholdChange,
}: {
    spotlight: SpotlightSettings;
    threshold: number;
    onSpotlightChange: React.Dispatch<React.SetStateAction<SpotlightSettings>>;
    onThresholdChange: (v: number) => void;
}) => (
    <>
        <SliderControl label="Background blur" value={spotlight.blur} min={5} max={50} suffix="px"
            onChange={v => onSpotlightChange(prev => ({ ...prev, blur: v }))} />
        <SliderControl label="Reveal radius" value={spotlight.reveal} min={10} max={100} suffix="%"
            onChange={v => onSpotlightChange(prev => ({ ...prev, reveal: v }))} />
        <SliderControl label="Dim overlay" value={spotlight.dim} min={20} max={70} suffix="%"
            onChange={v => onSpotlightChange(prev => ({ ...prev, dim: v }))} />
        <SliderControl label="Threshold" value={threshold} min={0} max={100}
            onChange={onThresholdChange} />
    </>
);

const ColdControls = ({
    cold,
    onChange,
}: {
    cold: ColdMapSettings;
    onChange: React.Dispatch<React.SetStateAction<ColdMapSettings>>;
}) => (
    <>
        <SliderControl label="Cold intensity" value={cold.intensity} min={20} max={100} suffix="%"
            onChange={v => onChange(prev => ({ ...prev, intensity: v }))} />
        <SliderControl label="Blur" value={cold.blur} min={4} max={40} suffix="px"
            onChange={v => onChange(prev => ({ ...prev, blur: v }))} />
        <SliderControl label="Threshold" value={cold.threshold} min={0} max={80}
            description="Minimum ignored-zone weight to display"
            onChange={v => onChange(prev => ({ ...prev, threshold: v }))} />
    </>
);
