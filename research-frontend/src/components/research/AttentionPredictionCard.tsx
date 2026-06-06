import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { cn } from '../../lib/utils';
import { HeatmapRenderer } from '../results/cognitive-task/components/HeatmapRenderer';
import { AttentionVideoPlayer } from '../results/cognitive-task/components/AttentionVideoPlayer';
import { researchService } from '../../services/research.service';
import { GazePathOverlay } from './GazePathOverlay';
import { AiAoiOverlay } from './AiAoiOverlay';
import { AoiRectEditor } from './AoiRectEditor';
import type { AiAnalysisResult } from '../../types/aiAnalysis.types';
import type { ManualAOI } from '../../types/attentionPrediction.types';
import {
    canRunAnalysisGate,
    canRunPredictionGate,
    clampAoiBounds,
    normalizeManualAois,
} from '../../utils/attentionPrediction.utils';

const ZoomControls = () => {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    return (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/90 rounded-lg shadow-sm border px-1.5 py-1">
            <button onClick={() => zoomOut()} className="px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100 rounded" title="Zoom out">−</button>
            <button onClick={() => zoomIn()} className="px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100 rounded" title="Zoom in">+</button>
            <button onClick={() => resetTransform()} className="px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-100 rounded" title="Reset zoom">↺</button>
        </div>
    );
};

/** Debounces a value — returns the latest value after `delay` ms of inactivity. */
const useDebouncedValue = <T,>(value: T, delay: number): T => {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
};

interface HeatmapPoint {
    x: number;
    y: number;
    value?: number;
}

interface AOIWithStats extends ManualAOI {
    percentage: number;
}

interface HeatmapSettings {
    blur: number;
    opacity: number;
    threshold: number;
    preset: string;
}

const DEFAULT_SETTINGS: HeatmapSettings = {
    blur: 15,
    opacity: 50,
    threshold: 40,
    preset: 'Balanced',
};

type TabId = 'original' | 'heatmap' | 'gaze-paths' | 'aoi-editor';

interface VideoFrameData {
    mediaId: string;
    timestamp: number;
    heatmapData?: HeatmapPoint[];
}

interface AttentionPredictionCardProps {
    imageUrl: string;
    title: string;
    heatmapData?: HeatmapPoint[];
    onDelete?: () => void;
    isDeleting?: boolean;
    className?: string;
    /** Research ID — needed for AOI persistence */
    researchId?: string;
    /** Stimulus media ID — needed for AOI persistence */
    stimulusMediaId?: string;
    /** True when the stimulus is a video */
    isVideo?: boolean;
    /** Per-frame predictions for video stimuli */
    videoFrames?: VideoFrameData[];
    /** AI analysis result (GPT-4o Vision) — used for Gaze Path tab */
    aiAnalysis?: AiAnalysisResult;
    /** AOIs to import from AI (set by parent when user clicks import in panel) */
    pendingImportAois?: AiAnalysisResult['autoAois'];
    /** Called after AOIs have been imported */
    onImportAoisDone?: () => void;
    /** Callback to add more stimuli */
    onAddMore?: () => void;
    /** Callback to run/re-run AI analysis */
    onRunAnalysis?: (manualAois: ManualAOI[]) => void;
    /** Callback to run TranSalNet heatmap prediction */
    onRunPrediction?: (manualAois: ManualAOI[]) => void;
    /** Whether heatmap prediction is in progress */
    isPredicting?: boolean;
    /** Elapsed seconds during current prediction */
    predictElapsed?: number;
    /** Prediction error message from backend */
    predictionError?: string;
    /** Initial tab for new stimuli (AOI-first flow) */
    initialTab?: TabId;
    /** Open analysis criteria drawer */
    onOpenCriteria?: () => void;
    /** Whether user skipped AOI definition */
    aoiSkipped?: boolean;
    /** Persist aoiSkipped flag */
    onAoiSkippedChange?: (skipped: boolean) => void;
    /** Notifies parent when the in-memory AOI list changes (for analyze without stale cache) */
    onAoiListChange?: (aois: ManualAOI[]) => void;
    /** Auto-presets from prediction (blur, opacity, threshold computed from map distribution) */
    autoPresets?: { blur: number; opacity: number; threshold: number };
    /** Gridded AOIs detected from saliency map */
    griddedAOIs?: Array<{ label: string; x: number; y: number; width: number; height: number; attention: number; rank: number }>;
    /** Whether AI analysis is in progress */
    isAnalyzing?: boolean;
    /** Elapsed seconds during current analysis */
    analyzeElapsed?: number;
    /** Extra content rendered in the header row (e.g. Criteria button) */
    headerExtra?: React.ReactNode;
    /** Callback to trigger video prediction pipeline */
    onProcessVideo?: () => void;
    /** Video prediction progress (shown inline in header) */
    videoProgress?: { phase: string; current: number; total: number; message: string } | null;
    /** Dismiss video progress */
    onDismissVideoProgress?: () => void;
}

const BASE_TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'original', label: 'Original', icon: 'image' },
    { id: 'heatmap', label: 'Heatmap', icon: 'eye' },
    { id: 'gaze-paths', label: 'Gaze Paths', icon: 'route' },
    { id: 'aoi-editor', label: 'AOI Editor', icon: 'aoi' },
];

const TAB_ICONS: Record<string, React.ReactNode> = {
    eye: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    video: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    image: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    settings: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    route: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /></svg>,
    aoi: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M3 9h18M9 3v18" /></svg>,
};

const DETAIL_PRESETS = ['Smooth', 'Balanced', 'Detailed'];

// User-saved heatmap presets — shared across all studies via localStorage
const HEATMAP_PRESETS_KEY = 'emotiox-heatmap-presets';
interface SavedHeatmapPreset { name: string; blur: number; opacity: number; threshold: number }
const loadHeatmapPresets = (): SavedHeatmapPreset[] => {
    try { return JSON.parse(localStorage.getItem(HEATMAP_PRESETS_KEY) || '[]'); } catch { return []; }
};
const persistHeatmapPresets = (presets: SavedHeatmapPreset[]) => {
    localStorage.setItem(HEATMAP_PRESETS_KEY, JSON.stringify(presets));
};

/** Each preset adjusts blur, threshold, and opacity for a different detail level. */
const PRESET_VALUES: Record<string, Pick<HeatmapSettings, 'blur' | 'threshold' | 'opacity'>> = {
    'Smooth':   { blur: 20, threshold: 50, opacity: 40 },
    'Balanced': { blur: 12, threshold: 35, opacity: 50 },
    'Detailed': { blur: 6,  threshold: 25, opacity: 65 },
};

/* ─── Settings Modal ─── */
const SettingsModal = ({
    imageUrl,
    heatmapData,
    settings,
    onApply,
    onClose,
}: {
    imageUrl: string;
    heatmapData: HeatmapPoint[];
    settings: HeatmapSettings;
    onApply: (s: HeatmapSettings) => void;
    onClose: () => void;
}) => {
    const [local, setLocal] = useState<HeatmapSettings>({ ...settings });
    const debouncedLocal = useDebouncedValue(local, 150);
    const [settingsTab, setSettingsTab] = useState<'heatmap' | 'original'>('heatmap');
    const previewRef = useRef<HTMLDivElement>(null);

    // User-saved presets
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
                        {/* Tabs inside modal */}
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
                            {settingsTab === 'original' ? (
                                <img src={imageUrl} alt="Original" className="w-full block" />
                            ) : (
                                <HeatmapRenderer
                                    imageUrl={imageUrl}
                                    data={heatmapData}
                                    blur={debouncedLocal.blur}
                                    opacity={debouncedLocal.opacity}
                                    threshold={debouncedLocal.threshold}
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
                                    min={0}
                                    max={50}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mb-1.5">Blur radius for the heatmap</p>
                            <input
                                type="range"
                                value={local.blur}
                                onChange={e => setLocal(prev => ({ ...prev, blur: Number(e.target.value), preset: 'Custom' }))}
                                min={0}
                                max={50}
                                className="w-full accent-blue-600"
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
                                    min={0}
                                    max={100}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mb-1.5">Heatmap intensity (%)</p>
                            <input
                                type="range"
                                value={local.opacity}
                                onChange={e => setLocal(prev => ({ ...prev, opacity: Number(e.target.value), preset: 'Custom' }))}
                                min={0}
                                max={100}
                                className="w-full accent-blue-600"
                            />
                        </div>

                        {/* Threshold */}
                        {settingsTab === 'heatmap' && (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-sm font-medium text-gray-700">Threshold</label>
                                    <input
                                        type="number"
                                        value={local.threshold}
                                        onChange={e => setLocal(prev => ({ ...prev, threshold: Number(e.target.value), preset: 'Custom' }))}
                                        className="w-14 px-2 py-1 text-sm border rounded text-right"
                                        min={0}
                                        max={100}
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mb-1.5">Minimum saliency value to display</p>
                                <input
                                    type="range"
                                    value={local.threshold}
                                    onChange={e => setLocal(prev => ({ ...prev, threshold: Number(e.target.value), preset: 'Custom' }))}
                                    min={0}
                                    max={100}
                                    className="w-full accent-blue-600"
                                />
                            </div>
                        )}

                        {/* Apply button */}
                        <button
                            type="button"
                            onClick={() => { onApply(local); onClose(); }}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                        >
                            Apply Settings
                        </button>

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
                                            if (e.key === 'Enter' && presetName.trim()) {
                                                const updated = [...savedPresets.filter(p => p.name !== presetName.trim()), { name: presetName.trim(), blur: local.blur, opacity: local.opacity, threshold: local.threshold }];
                                                setSavedPresets(updated);
                                                persistHeatmapPresets(updated);
                                                setPresetName('');
                                                setShowSavePreset(false);
                                            }
                                            if (e.key === 'Escape') setShowSavePreset(false);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        disabled={!presetName.trim()}
                                        onClick={() => {
                                            const updated = [...savedPresets.filter(p => p.name !== presetName.trim()), { name: presetName.trim(), blur: local.blur, opacity: local.opacity, threshold: local.threshold }];
                                            setSavedPresets(updated);
                                            persistHeatmapPresets(updated);
                                            setPresetName('');
                                            setShowSavePreset(false);
                                        }}
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
                                                onClick={() => {
                                                    const updated = savedPresets.filter(sp => sp.name !== p.name);
                                                    setSavedPresets(updated);
                                                    persistHeatmapPresets(updated);
                                                }}
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

/* ─── Compute NxM grid attention percentages from heatmap points ─── */
const computeGridPercentages = (data: HeatmapPoint[], cols: number, rows: number): number[] => {
    const cells = new Array(cols * rows).fill(0);
    let total = 0;
    for (const p of data) {
        const col = Math.min(Math.floor((p.x / 100) * cols), cols - 1);
        const row = Math.min(Math.floor((p.y / 100) * rows), rows - 1);
        const val = p.value ?? 1;
        cells[row * cols + col] += val;
        total += val;
    }
    if (total === 0) return cells;
    return cells.map(v => Math.round((v / total) * 1000) / 10);
};

const GRID_OPTIONS = [
    { label: '2×2', cols: 2, rows: 2 },
    { label: '3×3', cols: 3, rows: 3 },
    { label: '4×4', cols: 4, rows: 4 },
    { label: '5×5', cols: 5, rows: 5 },
];

/* ─── Video Heatmap Player — single video with split heatmap overlay + 3×3 grid ─── */
const VideoFrameScrubber = ({
    videoUrl,
    frames,
    settings,
}: {
    videoUrl: string;
    frames: VideoFrameData[];
    settings: HeatmapSettings;
}) => {
    const [frameIdx, setFrameIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [splitPct, setSplitPct] = useState(50); // divider position 0-100
    const [gridSize, setGridSize] = useState(1); // index into GRID_OPTIONS (default 3×3)
    const [dragging, setDragging] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const heatCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<number | null>(null);
    const lastIdxRef = useRef(0);
    const activeFrame = frames[frameIdx] || frames[0];
    const frameData = useMemo(() => activeFrame?.heatmapData || [], [activeFrame]);
    const { cols, rows } = GRID_OPTIONS[gridSize];
    const gridPcts = useMemo(() => computeGridPercentages(frameData, cols, rows), [frameData, cols, rows]);

    // Divider drag
    const handleDividerDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setDragging(true);
    }, []);

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent) => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const pct = Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
            setSplitPct(pct);
        };
        const onUp = () => setDragging(false);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragging]);

    // Find closest frame index for a given time
    const findFrameIdx = useCallback((time: number) => {
        let best = 0;
        let bestDist = Math.abs(frames[0]?.timestamp - time);
        for (let i = 1; i < frames.length; i++) {
            const dist = Math.abs(frames[i].timestamp - time);
            if (dist < bestDist) { best = i; bestDist = dist; }
        }
        return best;
    }, [frames]);

    // Draw heatmap on canvas using simpleheat-style gradient
    const drawHeatmap = useCallback((data: HeatmapPoint[], canvasW: number, canvasH: number) => {
        const canvas = heatCanvasRef.current;
        if (!canvas) return;
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvasW, canvasH);
        if (data.length === 0) return;

        // Draw each point as radial gradient
        const radius = Math.max(canvasW, canvasH) * (settings.blur / 100) * 0.8;
        for (const p of data) {
            const x = (p.x / 100) * canvasW;
            const y = (p.y / 100) * canvasH;
            const val = p.value ?? 0.5;
            if (val < settings.threshold / 100) continue;

            const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grad.addColorStop(0, `rgba(255, 0, 0, ${val * 0.4})`);
            grad.addColorStop(0.4, `rgba(255, 165, 0, ${val * 0.25})`);
            grad.addColorStop(0.7, `rgba(255, 255, 0, ${val * 0.12})`);
            grad.addColorStop(1, 'rgba(0, 0, 255, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvasW, canvasH);
        }
    }, [settings.blur, settings.threshold]);

    // Sync loop — use ref to avoid circular dependency
    const syncLoopRef = useRef<() => void>(() => {});
    useEffect(() => {
        syncLoopRef.current = () => {
            const video = videoRef.current;
            if (!video || video.paused) return;
            const idx = findFrameIdx(video.currentTime);
            if (idx !== lastIdxRef.current) {
                lastIdxRef.current = idx;
                setFrameIdx(idx);
                const fd = frames[idx]?.heatmapData || [];
                drawHeatmap(fd, video.videoWidth, video.videoHeight);
            }
            animRef.current = requestAnimationFrame(() => syncLoopRef.current());
        };
    }, [findFrameIdx, frames, drawHeatmap]);

    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
            setPlaying(true);
            animRef.current = requestAnimationFrame(() => syncLoopRef.current());
        } else {
            video.pause();
            setPlaying(false);
            if (animRef.current) cancelAnimationFrame(animRef.current);
        }
    }, []);

    useEffect(() => {
        return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, []);

    const handleSeek = (idx: number) => {
        setFrameIdx(idx);
        lastIdxRef.current = idx;
        const t = frames[idx]?.timestamp ?? 0;
        if (videoRef.current) videoRef.current.currentTime = t;
        const fd = frames[idx]?.heatmapData || [];
        if (videoRef.current) drawHeatmap(fd, videoRef.current.videoWidth, videoRef.current.videoHeight);
    };

    // Draw initial heatmap when video loads
    const handleLoaded = () => {
        const video = videoRef.current;
        if (!video) return;
        const fd = frames[0]?.heatmapData || [];
        drawHeatmap(fd, video.videoWidth, video.videoHeight);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Video with heatmap overlay clipped by draggable divider */}
            <div ref={containerRef} className="flex-1 min-h-0 relative bg-black flex items-center justify-center select-none">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="max-w-full max-h-full block"
                    muted
                    playsInline
                    onLoadedData={handleLoaded}
                    onEnded={() => setPlaying(false)}
                />

                {/* Heatmap overlay — clipped from divider to right edge */}
                <canvas
                    ref={heatCanvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{
                        clipPath: `inset(0 0 0 ${splitPct}%)`,
                        opacity: settings.opacity / 100,
                        mixBlendMode: 'screen',
                    }}
                />

                {/* Dynamic grid — covers right side from divider */}
                <div
                    className="absolute top-0 bottom-0 pointer-events-none"
                    style={{
                        left: `${splitPct}%`,
                        right: 0,
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                        gridTemplateRows: `repeat(${rows}, 1fr)`,
                    }}
                >
                    {gridPcts.map((pct, i) => (
                        <div key={i} className="border border-white/30 flex items-end justify-center pb-1">
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                                style={{
                                    color: '#00ff00',
                                    textShadow: '0 0 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.7)',
                                }}
                            >
                                Q{i + 1}: {pct}%
                            </span>
                        </div>
                    ))}
                </div>

                {/* Draggable divider */}
                <div
                    className="absolute top-0 bottom-0 z-10 flex items-center"
                    style={{ left: `${splitPct}%`, transform: 'translateX(-50%)' }}
                >
                    <div
                        className="w-5 h-full cursor-col-resize flex items-center justify-center group"
                        onMouseDown={handleDividerDown}
                    >
                        <div className="w-0.5 h-full bg-white/70 group-hover:bg-white transition-colors" />
                        {/* Handle grip */}
                        <div className="absolute w-6 h-10 rounded-full bg-white/80 border-2 border-gray-400 flex items-center justify-center shadow-lg cursor-col-resize">
                            <svg className="w-3 h-3 text-gray-500" viewBox="0 0 6 10" fill="currentColor">
                                <circle cx="1" cy="2" r="0.8" /><circle cx="1" cy="5" r="0.8" /><circle cx="1" cy="8" r="0.8" />
                                <circle cx="5" cy="2" r="0.8" /><circle cx="5" cy="5" r="0.8" /><circle cx="5" cy="8" r="0.8" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls bar */}
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-900 rounded-b-lg">
                <button
                    onClick={togglePlay}
                    className="text-white hover:text-blue-400 transition-colors flex-shrink-0"
                    title={playing ? 'Pause' : 'Play'}
                >
                    {playing ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                </button>
                <input
                    type="range"
                    min={0}
                    max={frames.length - 1}
                    value={frameIdx}
                    onChange={e => handleSeek(Number(e.target.value))}
                    className="flex-1 accent-blue-500 h-1"
                />
                {/* Grid size selector */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {GRID_OPTIONS.map((opt, i) => (
                        <button
                            key={opt.label}
                            onClick={() => setGridSize(i)}
                            className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                                i === gridSize ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <span className="text-xs text-gray-400 font-mono w-12 text-right flex-shrink-0">
                    {activeFrame ? `${activeFrame.timestamp.toFixed(1)}s` : '—'}
                </span>
            </div>
        </div>
    );
};

/* ─── Main Card ─── */
export const AttentionPredictionCard = ({
    imageUrl,
    title,
    heatmapData = [],
    onDelete,
    isDeleting = false,
    className,
    researchId,
    stimulusMediaId,
    isVideo = false,
    videoFrames = [],
    aiAnalysis,
    pendingImportAois,
    onImportAoisDone,
    onAddMore,
    onRunAnalysis,
    onRunPrediction,
    isPredicting = false,
    predictElapsed = 0,
    predictionError,
    initialTab,
    onOpenCriteria,
    aoiSkipped = false,
    onAoiSkippedChange,
    onAoiListChange,
    autoPresets,
    griddedAOIs,
    isAnalyzing = false,
    analyzeElapsed = 0,
    headerExtra,
    onProcessVideo,
    videoProgress,
    onDismissVideoProgress,
}: AttentionPredictionCardProps) => {
    const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? 'original');
    const [showAiAoiOverlay, setShowAiAoiOverlay] = useState(false);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [skipConfirmAction, setSkipConfirmAction] = useState<'gate-only' | 'predict'>('gate-only');
    const [showNameModal, setShowNameModal] = useState(false);
    const [pendingRect, setPendingRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [pendingLabel, setPendingLabel] = useState('');
    const [selectedAoiId, setSelectedAoiId] = useState<string | null>(null);
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [editingLabelValue, setEditingLabelValue] = useState('');

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    // Filter tabs: show Gaze Paths only when AI analysis has gaze data
    const tabs = useMemo(() => {
        return BASE_TABS.filter(tab => {
            if (tab.id === 'gaze-paths') return aiAnalysis?.gazePath && aiAnalysis.gazePath.length > 0;
            if (tab.id === 'aoi-editor') return !isVideo;
            return true;
        });
    }, [aiAnalysis, isVideo]);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<HeatmapSettings>(() => {
        if (autoPresets) {
            return {
                blur: autoPresets.blur,
                opacity: autoPresets.opacity,
                threshold: autoPresets.threshold,
                preset: 'Auto',
            };
        }
        return { ...DEFAULT_SETTINGS };
    });

    // Update settings when autoPresets change (new prediction)
    useEffect(() => {
        if (autoPresets) {
            setSettings({
                blur: autoPresets.blur,
                opacity: autoPresets.opacity,
                threshold: autoPresets.threshold,
                preset: 'Auto',
            });
        }
    }, [autoPresets]);
    const [visibleRoutes, setVisibleRoutes] = useState<Set<string>>(new Set(['typical-scan', 'group-scan', 'novelty-search']));
    const [gazeMode, setGazeMode] = useState<'static' | 'animated'>('static');
    const [aoiList, setAoiList] = useState<ManualAOI[]>([]);
    const [drawingAoi, setDrawingAoi] = useState(false);
    const [aoiStart, setAoiStart] = useState<{ x: number; y: number } | null>(null);
    const [aoiCurrent, setAoiCurrent] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [isSavingAois, setIsSavingAois] = useState(false);
    const aoiContainerRef = useRef<HTMLDivElement>(null);
    const tabContentRef = useRef<HTMLDivElement>(null);

    // Global mouse handlers for AOI drawing — works even when mouse leaves the container
    useEffect(() => {
        if (!drawingAoi || !aoiStart) return;
        const container = aoiContainerRef.current;
        if (!container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const pos = getMousePercent(e, container);
            setAoiCurrent({
                x: Math.min(aoiStart.x, pos.x),
                y: Math.min(aoiStart.y, pos.y),
                w: Math.abs(pos.x - aoiStart.x),
                h: Math.abs(pos.y - aoiStart.y),
            });
        };

        const handleMouseUp = () => {
            setAoiCurrent(prev => {
                if (prev && prev.w > 1 && prev.h > 1) {
                    setPendingRect(prev);
                    setPendingLabel(`Zona ${aoiList.length + 1}`);
                    setShowNameModal(true);
                }
                return null;
            });
            setAoiStart(null);
            setDrawingAoi(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [drawingAoi, aoiStart]); // eslint-disable-line react-hooks/exhaustive-deps


    // Load persisted AOIs from research settings
    useEffect(() => {
        if (!researchId || !stimulusMediaId) return;
        researchService.getById(researchId).then(res => {
            const s = (res.research.settings as Record<string, unknown>) || {};
            const stimuli = (s.stimuli as Array<Record<string, unknown>>) || [];
            const stimulus = stimuli.find(st => st.mediaId === stimulusMediaId);
            const savedAois = normalizeManualAois(stimulus?.aois);
            setAoiList(savedAois);
        }).catch(() => { /* ignore load errors */ });
    }, [researchId, stimulusMediaId]);

    useEffect(() => {
        onAoiListChange?.(aoiList);
    }, [aoiList, onAoiListChange]);

    // Persist AOIs to research settings (debounced to prevent race conditions)
    const pendingAoisRef = useRef<ManualAOI[] | null>(null);
    const saveInFlightRef = useRef(false);

    const persistAois = useCallback(async (aois: ManualAOI[]) => {
        if (!researchId || !stimulusMediaId) return;
        pendingAoisRef.current = aois;
        if (saveInFlightRef.current) return; // will be picked up after current save
        saveInFlightRef.current = true;
        setIsSavingAois(true);
        try {
            while (pendingAoisRef.current !== null) {
                const toSave = pendingAoisRef.current;
                pendingAoisRef.current = null;
                const res = await researchService.getById(researchId);
                const s = (res.research.settings as Record<string, unknown>) || {};
                const stimuli = (s.stimuli as Array<Record<string, unknown>>) || [];
                const updatedStimuli = stimuli.map(st => {
                    if (st.mediaId === stimulusMediaId) {
                        return { ...st, aois: toSave };
                    }
                    return st;
                });
                await researchService.update(researchId, {
                    settings: { ...s, stimuli: updatedStimuli },
                });
            }
        } catch {
            // Best-effort persistence
        } finally {
            saveInFlightRef.current = false;
            setIsSavingAois(false);
        }
    }, [researchId, stimulusMediaId]);

    const getMousePercent = (e: React.MouseEvent | MouseEvent, el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        return {
            x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
            y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
        };
    };

    const confirmPendingAoi = useCallback(() => {
        if (!pendingRect) return;
        const label = pendingLabel.trim() || `Zona ${aoiList.length + 1}`;
        const aoi: ManualAOI = clampAoiBounds({
            id: `aoi_${crypto.randomUUID()}`,
            label,
            x: pendingRect.x,
            y: pendingRect.y,
            width: pendingRect.w,
            height: pendingRect.h,
            source: 'manual',
        });
        const updated = [...aoiList, aoi];
        setAoiList(updated);
        void persistAois(updated);
        setShowNameModal(false);
        setPendingRect(null);
        setPendingLabel('');
        setSelectedAoiId(aoi.id);
    }, [aoiList, pendingLabel, pendingRect, persistAois]);

    const updateAoi = useCallback((updated: ManualAOI) => {
        setAoiList(prev => {
            const next = prev.map(a => (a.id === updated.id ? updated : a));
            void persistAois(next);
            return next;
        });
    }, [persistAois]);

    const updateAoiLabel = useCallback((aoiId: string, label: string) => {
        const trimmed = label.trim() || 'Zona sin nombre';
        setAoiList(prev => {
            const next = prev.map(a => (a.id === aoiId ? { ...a, label: trimmed } : a));
            void persistAois(next);
            return next;
        });
        setEditingLabelId(null);
    }, [persistAois]);

    const removeAoi = (aoiId: string) => {
        const updated = aoiList.filter(a => a.id !== aoiId);
        setAoiList(updated);
        if (selectedAoiId === aoiId) setSelectedAoiId(null);
        void persistAois(updated);
    };

    useEffect(() => {
        if (!selectedAoiId) return;
        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                removeAoi(selectedAoiId);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [selectedAoiId]); // eslint-disable-line react-hooks/exhaustive-deps

    const predictionGateOpen = canRunPredictionGate(aoiList.length, aoiSkipped);
    const analysisGateOpen = canRunAnalysisGate(heatmapData.length, aoiList.length, aoiSkipped);
    const hasHeatmap = heatmapData.length > 0;

    const handlePredictClick = (): void => {
        if (!onRunPrediction) return;
        if (!predictionGateOpen) {
            setSkipConfirmAction('predict');
            setShowSkipConfirm(true);
            return;
        }
        onRunPrediction(aoiList);
    };

    const handleAnalysisClick = (): void => {
        if (!onRunAnalysis || !analysisGateOpen) return;
        onRunAnalysis(aoiList);
    };

    const importedAiLabels = useMemo(
        () => new Set(aoiList.filter(a => a.source === 'imported-ai').map(a => a.label)),
        [aoiList],
    );

    // Process pending AOI imports from the external AI panel
    useEffect(() => {
        if (!pendingImportAois || pendingImportAois.length === 0) return;
        handleImportAois(pendingImportAois);
        onImportAoisDone?.();
    }, [pendingImportAois]); // eslint-disable-line react-hooks/exhaustive-deps

    const computedAois: AOIWithStats[] = useMemo(() => {
        const total = heatmapData.length;
        return aoiList.map(aoi => {
            const inside = heatmapData.filter(p => {
                const px = p.x > 1 ? p.x : p.x * 100;
                const py = p.y > 1 ? p.y : p.y * 100;
                return px >= aoi.x && px <= aoi.x + aoi.width &&
                       py >= aoi.y && py <= aoi.y + aoi.height;
            }).length;
            return {
                ...aoi,
                percentage: total > 0 ? Math.round((inside / total) * 100) : 0,
            };
        });
    }, [aoiList, heatmapData]);

    const handleImportAois = useCallback((aiAois: AiAnalysisResult['autoAois']) => {
        const existingLabels = new Set(aoiList.map(a => a.label));
        const newAois: ManualAOI[] = aiAois
            .filter(a => !existingLabels.has(a.label))
            .map(a => ({
                id: `aoi_${crypto.randomUUID()}`,
                label: a.label,
                x: a.x,
                y: a.y,
                width: a.width,
                height: a.height,
                source: 'imported-ai' as const,
            }));
        if (newAois.length > 0) {
            const updated = [...aoiList, ...newAois];
            setAoiList(updated);
            void persistAois(updated);
        }
    }, [aoiList, persistAois]);

    const handleDownloadImage = useCallback(async () => {
        const el = tabContentRef.current;
        if (!el) return;
        try {
            const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `attention-prediction-${activeTab}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            // Download failed silently
        }
    }, [activeTab]);

    if (!imageUrl) {
        return (
            <div className="bg-gray-100 h-64 flex items-center justify-center rounded-lg">
                <span className="text-gray-400">No image available</span>
            </div>
        );
    }

    return (
        <>
            <div className={cn('border rounded-lg overflow-hidden bg-white max-h-[calc(100vh-120px)] flex flex-col', className)}>
                {/* Title */}
                <div className="p-4 border-b flex items-start justify-between">
                    <div>
                        <h4 className="font-semibold text-base">{title}</h4>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Prediction of visual attention
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        {onAddMore && (
                            <button
                                type="button"
                                onClick={onAddMore}
                                className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Add more images or videos"
                            >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                title="Remove stimulus"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                        {headerExtra}
                        {onRunPrediction && !isVideo && (
                            <button
                                type="button"
                                onClick={handlePredictClick}
                                disabled={isPredicting}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                                    hasHeatmap
                                        ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                        : 'text-white bg-indigo-600 hover:bg-indigo-700',
                                    isPredicting && 'opacity-50 cursor-not-allowed',
                                )}
                                title={
                                    !predictionGateOpen
                                        ? 'Define al menos una zona o continúa sin zonas'
                                        : hasHeatmap
                                            ? 'Regenerar heatmap TranSalNet'
                                            : 'Generar heatmap TranSalNet'
                                }
                            >
                                {isPredicting
                                    ? `Generando heatmap... ${predictElapsed}s`
                                    : hasHeatmap
                                        ? 'Regenerar heatmap'
                                        : 'Generar heatmap'}
                            </button>
                        )}
                        {onRunAnalysis && (
                            <button
                                type="button"
                                onClick={handleAnalysisClick}
                                disabled={isAnalyzing || !analysisGateOpen}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                                    aiAnalysis
                                        ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                                        : 'text-white bg-blue-600 hover:bg-blue-700',
                                    (isAnalyzing || !analysisGateOpen) && 'opacity-50 cursor-not-allowed'
                                )}
                                title={
                                    !analysisGateOpen
                                        ? !hasHeatmap
                                            ? 'Genera el heatmap antes del análisis IA'
                                            : 'Define al menos una zona o continúa sin zonas'
                                        : aiAnalysis
                                            ? 'Re-ejecutar análisis IA'
                                            : 'Ejecutar análisis IA'
                                }
                            >
                                <svg className={cn("h-3.5 w-3.5", isAnalyzing && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    {isAnalyzing
                                        ? <><circle className="opacity-25" cx="12" cy="12" r="10" /><path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" stroke="none" /></>
                                        : <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                    }
                                </svg>
                                {isAnalyzing
                                    ? `Analizando... ${analyzeElapsed}s`
                                    : aiAnalysis ? 'Re-analizar' : 'Análisis IA'}
                            </button>
                        )}
                    </div>
                </div>

                {predictionError && (
                    <div className="mx-4 mt-3 px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md flex items-center justify-between gap-2">
                        <span>Error al generar heatmap: {predictionError}</span>
                        {onRunPrediction && (
                            <button
                                type="button"
                                onClick={handlePredictClick}
                                className="text-red-800 underline font-medium shrink-0"
                            >
                                Reintentar
                            </button>
                        )}
                    </div>
                )}

                {/* Tabs + Settings */}
                <div className="border-b bg-white">
                    <div className="flex items-center px-4">
                        <div className="flex gap-1 flex-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                                        activeTab === tab.id
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-600 hover:text-gray-900'
                                    )}
                                >
                                    {TAB_ICONS[tab.icon]}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        {/* Download */}
                        <button
                            type="button"
                            onClick={() => void handleDownloadImage()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors mr-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                        {/* Settings — opens modal */}
                        <button
                            onClick={() => setShowSettings(true)}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            {TAB_ICONS.settings}
                            Settings
                        </button>
                    </div>
                </div>

                {/* Inline heatmap controls — visible on Prediction tab */}
                {activeTab === 'heatmap' && heatmapData.length > 0 && (
                    <div className="px-4 py-2.5 border-b bg-slate-50 flex items-center gap-4 flex-wrap">
                        <div className="flex gap-1">
                            {DETAIL_PRESETS.map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => {
                                        const vals = PRESET_VALUES[p];
                                        setSettings(prev => ({ ...prev, preset: p, ...vals }));
                                    }}
                                    className={cn(
                                        'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                                        settings.preset === p
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <label className="text-xs text-gray-500 w-10">Blur</label>
                            <input
                                type="range" min={0} max={50} value={settings.blur}
                                onChange={e => setSettings(prev => ({ ...prev, blur: Number(e.target.value), preset: 'Custom' }))}
                                className="w-20 accent-blue-600"
                            />
                            <span className="text-xs text-gray-500 w-6 text-right">{settings.blur}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <label className="text-xs text-gray-500 w-14">Opacity</label>
                            <input
                                type="range" min={0} max={100} value={settings.opacity}
                                onChange={e => setSettings(prev => ({ ...prev, opacity: Number(e.target.value), preset: 'Custom' }))}
                                className="w-20 accent-blue-600"
                            />
                            <span className="text-xs text-gray-500 w-6 text-right">{settings.opacity}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <label className="text-xs text-gray-500 w-16">Threshold</label>
                            <input
                                type="range" min={0} max={100} value={settings.threshold}
                                onChange={e => setSettings(prev => ({ ...prev, threshold: Number(e.target.value), preset: 'Custom' }))}
                                className="w-20 accent-blue-600"
                            />
                            <span className="text-xs text-gray-500 w-6 text-right">{settings.threshold}</span>
                        </div>
                        {aiAnalysis?.autoAois?.length ? (
                            <label className="flex items-center gap-2 text-xs text-gray-600 ml-auto cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showAiAoiOverlay}
                                    onChange={(e) => setShowAiAoiOverlay(e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                Mostrar zonas IA
                            </label>
                        ) : null}
                    </div>
                )}

                {/* Content */}
                <div className={cn('p-4 flex-1 min-h-0 flex flex-col', !isVideo && 'overflow-auto')} ref={tabContentRef}>

                        {/* ─── Video layout: single <video> always mounted, overlays per tab ─── */}
                        {isVideo && (
                            <div className="rounded-lg border bg-black relative flex items-center justify-center overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
                                {/* Persistent video — hidden when VideoFrameScrubber is active (it has its own video) */}
                                <video
                                    src={imageUrl}
                                    controls={activeTab === 'original'}
                                    muted
                                    className="max-w-full max-h-full block"
                                    style={{ display: (activeTab === 'heatmap' && videoFrames.length > 0) ? 'none' : 'block' }}
                                />

                                {/* Heatmap overlay */}
                                {activeTab === 'heatmap' && (
                                    videoFrames.length > 0 ? (
                                        <VideoFrameScrubber
                                            videoUrl={imageUrl}
                                            frames={videoFrames}
                                            settings={settings}
                                        />
                                    ) : !heatmapData.length ? (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            {videoProgress && videoProgress.phase !== 'error' && videoProgress.phase !== 'complete' ? (
                                                <div className="flex flex-col items-center gap-3 px-6 py-4 bg-black/60 rounded-xl">
                                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <p className="text-white text-sm font-medium">{videoProgress.message}</p>
                                                    {videoProgress.total > 0 && (
                                                        <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-white rounded-full transition-all duration-300"
                                                                style={{ width: `${(videoProgress.current / videoProgress.total) * 100}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : videoProgress?.phase === 'error' ? (
                                                <div className="flex flex-col items-center gap-2 px-6 py-4 bg-red-900/70 rounded-xl">
                                                    <p className="text-red-200 text-sm font-medium">{videoProgress.message}</p>
                                                    {onProcessVideo && (
                                                        <button onClick={onProcessVideo} className="text-xs text-white underline">Retry</button>
                                                    )}
                                                    {onDismissVideoProgress && (
                                                        <button onClick={onDismissVideoProgress} className="text-xs text-red-300">Dismiss</button>
                                                    )}
                                                </div>
                                            ) : onProcessVideo ? (
                                                <button
                                                    onClick={onProcessVideo}
                                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Process Video
                                                </button>
                                            ) : null}
                                        </div>
                                    ) : null
                                )}

                                {/* AOI overlay */}
                                {activeTab === 'aoi-editor' && (
                                    <div className="absolute inset-0 pointer-events-none">
                                        {/* AOI rectangles rendered here via the AOI editor section below */}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── Image layout: hidden/shown via display, never unmounted ─── */}
                        {!isVideo && (
                            <>
                                <div style={{ display: activeTab === 'original' ? 'block' : 'none' }}>
                                    <TransformWrapper minScale={1} maxScale={5} wheel={{ step: 0.15 }}>
                                        <div className="rounded-lg border bg-gray-100 overflow-hidden relative">
                                            <ZoomControls />
                                            <TransformComponent wrapperStyle={{ width: '100%' }} contentStyle={{ width: '100%' }}>
                                                <img src={imageUrl} alt={title} className="w-full block" />
                                            </TransformComponent>
                                        </div>
                                    </TransformWrapper>
                                </div>

                                <div style={{ display: activeTab === 'heatmap' ? 'block' : 'none' }}>
                                    <TransformWrapper minScale={1} maxScale={5} wheel={{ step: 0.15 }}>
                                        <div className="rounded-lg border bg-gray-100 overflow-hidden relative">
                                            <ZoomControls />
                                            <TransformComponent wrapperStyle={{ width: '100%' }} contentStyle={{ width: '100%' }}>
                                                {heatmapData.length > 0 ? (
                                                    <div className="relative">
                                                        <HeatmapRenderer
                                                            imageUrl={imageUrl}
                                                            data={heatmapData}
                                                            blur={settings.blur}
                                                            opacity={settings.opacity}
                                                            threshold={settings.threshold}
                                                            className="w-full"
                                                        />
                                                        {showAiAoiOverlay && aiAnalysis?.autoAois && (
                                                            <AiAoiOverlay
                                                                autoAois={aiAnalysis.autoAois}
                                                                importedLabels={importedAiLabels}
                                                            />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <img src={imageUrl} alt={title} className="w-full block" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                            <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg">
                                                                Genera el heatmap para ver la predicción TranSalNet
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </TransformComponent>
                                        </div>
                                    </TransformWrapper>
                                </div>
                            </>
                        )}

                        {/* Gaze Paths Tab — dark alpha background, toggleable routes */}
                        {activeTab === 'gaze-paths' && aiAnalysis?.gazePath && (() => {
                            const ROUTE_COLORS: Record<string, string> = {
                                'typical-scan': '#3B82F6',    // blue
                                'group-scan': '#10B981',      // green
                                'novelty-search': '#F59E0B',  // amber
                            };
                            const routes = aiAnalysis.gazePathRoutes || [
                                { id: 'typical-scan', name: 'Typical Scan', description: 'Default predicted path', fixations: aiAnalysis.gazePath },
                            ];
                            const toggleRoute = (id: string) => {
                                setVisibleRoutes(prev => {
                                    const next = new Set(prev);
                                    if (next.has(id)) next.delete(id); else next.add(id);
                                    return next;
                                });
                            };

                            const hasVideo = heatmapData.length > 0 && !isVideo;
                            return (
                            <div>
                                {/* Sub-tabs: Static routes vs Animated scanpath */}
                                <div className="flex items-center gap-2 mb-3">
                                    {hasVideo && (
                                        <div className="flex items-center gap-1 mr-3">
                                            {(['static', 'animated'] as const).map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setGazeMode(m)}
                                                    className={cn(
                                                        'px-2.5 py-1 text-xs font-medium rounded transition-colors capitalize',
                                                        gazeMode === m
                                                            ? 'bg-gray-900 text-white'
                                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                                    )}
                                                >
                                                    {m === 'static' ? 'Routes' : 'Scanpath'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {gazeMode === 'static' && (
                                        <>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wider mr-1">Routes:</span>
                                            {routes.map(route => {
                                                const color = ROUTE_COLORS[route.id] || '#8B5CF6';
                                                const active = visibleRoutes.has(route.id);
                                                return (
                                                    <button
                                                        key={route.id}
                                                        onClick={() => toggleRoute(route.id)}
                                                        className={cn(
                                                            'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-all',
                                                            active ? 'text-white' : 'bg-white text-gray-500 border-gray-200 opacity-50'
                                                        )}
                                                        style={active ? { backgroundColor: color, borderColor: color } : undefined}
                                                        title={route.description}
                                                    >
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? '#fff' : color }} />
                                                        {route.name}
                                                    </button>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>

                                {gazeMode === 'static' && (
                                    <TransformWrapper minScale={1} maxScale={5} wheel={{ step: 0.15 }}>
                                        <div className="rounded-lg border bg-gray-900 overflow-hidden relative" style={{ maxHeight: '60vh' }}>
                                            <ZoomControls />
                                            <TransformComponent wrapperStyle={{ width: '100%' }} contentStyle={{ width: '100%' }}>
                                                <div className="relative">
                                                    <img src={imageUrl} alt={title} className="w-full block" />
                                                    <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                                                    {routes.map(route => (
                                                        <GazePathOverlay
                                                            key={route.id}
                                                            gazePath={route.fixations}
                                                            visible={visibleRoutes.has(route.id)}
                                                            routeColor={ROUTE_COLORS[route.id] || '#8B5CF6'}
                                                            markerId={route.id}
                                                        />
                                                    ))}
                                                </div>
                                            </TransformComponent>
                                        </div>
                                    </TransformWrapper>
                                )}

                                {gazeMode === 'animated' && hasVideo && (
                                    <div className="rounded-lg border overflow-hidden" style={{ maxHeight: '60vh' }}>
                                        <AttentionVideoPlayer
                                            imageUrl={imageUrl}
                                            data={heatmapData}
                                            duration={5}
                                        />
                                    </div>
                                )}
                            </div>
                        );})()}

                        {/* AOI Editor Tab */}
                        {!isVideo && activeTab === 'aoi-editor' && (
                            <>
                                <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className={cn('px-2 py-1 rounded font-medium', aoiList.length > 0 || aoiSkipped ? 'bg-green-100 text-green-800' : 'bg-white text-gray-600 border')}>
                                            1. Definir zonas
                                        </span>
                                        <span className="text-gray-400">→</span>
                                        <button
                                            type="button"
                                            onClick={() => onOpenCriteria?.()}
                                            className="px-2 py-1 rounded font-medium bg-white text-gray-600 border hover:bg-gray-50"
                                        >
                                            2. Criterio de análisis
                                        </button>
                                        <span className="text-gray-400">→</span>
                                        <span className={cn('px-2 py-1 rounded font-medium', hasHeatmap ? 'bg-green-100 text-green-800' : 'bg-white text-gray-600 border')}>
                                            3. Generar heatmap
                                        </span>
                                    </div>
                                </div>

                                {/* AOI toolbar */}
                                <div className="flex items-center gap-3 mb-3 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => setDrawingAoi(prev => !prev)}
                                        className={cn(
                                            'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                                            drawingAoi
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        )}
                                    >
                                        {drawingAoi ? 'Dibujando zona...' : '+ Crear zona manual'}
                                    </button>
                                    {!aoiSkipped && aoiList.length === 0 && onAoiSkippedChange && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSkipConfirmAction('gate-only');
                                                setShowSkipConfirm(true);
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors"
                                        >
                                            Continuar sin zonas
                                        </button>
                                    )}
                                    {aoiSkipped && (
                                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                            Sin zonas definidas
                                        </span>
                                    )}
                                    {griddedAOIs && griddedAOIs.length > 0 && computedAois.length === 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const imported: ManualAOI[] = griddedAOIs.map((g, i) => ({
                                                    id: `grid-${Date.now()}-${i}`,
                                                    label: g.label,
                                                    x: g.x,
                                                    y: g.y,
                                                    width: g.width,
                                                    height: g.height,
                                                    source: 'imported-grid' as const,
                                                }));
                                                setAoiList(imported);
                                                void persistAois(imported);
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded transition-colors"
                                        >
                                            Importar zonas detectadas ({griddedAOIs.length})
                                        </button>
                                    )}
                                    {computedAois.length > 0 && (
                                        <span className="text-xs text-gray-500">
                                            {computedAois.length} zonas definidas
                                            {isSavingAois && ' — guardando...'}
                                        </span>
                                    )}
                                </div>

                                <div
                                    ref={aoiContainerRef}
                                    className={cn(
                                        'rounded-lg border bg-gray-100 relative',
                                        drawingAoi && 'cursor-crosshair'
                                    )}
                                    onMouseDown={drawingAoi ? (e) => {
                                        e.preventDefault();
                                        const container = aoiContainerRef.current;
                                        if (!container) return;
                                        const pos = getMousePercent(e, container);
                                        setAoiStart(pos);
                                        setAoiCurrent({ x: pos.x, y: pos.y, w: 0, h: 0 });
                                    } : undefined}
                                >
                                    {/* Heatmap as background so user sees where to draw */}
                                    {heatmapData.length > 0 ? (
                                        <HeatmapRenderer
                                            imageUrl={imageUrl}
                                            data={heatmapData}
                                            blur={Math.max(settings.blur, 10)}
                                            opacity={Math.max(settings.opacity, 40)}
                                            threshold={Math.min(settings.threshold, 20)}
                                            className="w-full block"
                                        />
                                    ) : isVideo ? (
                                        <video src={imageUrl} muted className="max-w-full max-h-full block mx-auto" />
                                    ) : (
                                        <img src={imageUrl} alt={title} className="w-full block" />
                                    )}

                                    {aiAnalysis?.autoAois && (
                                        <AiAoiOverlay
                                            autoAois={aiAnalysis.autoAois}
                                            importedLabels={importedAiLabels}
                                        />
                                    )}

                                    {computedAois.map((aoi, i) => {
                                        const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'];
                                        const color = colors[i % colors.length];
                                        return (
                                            <AoiRectEditor
                                                key={aoi.id}
                                                aoi={aoi}
                                                color={color}
                                                percentage={aoi.percentage}
                                                selected={selectedAoiId === aoi.id}
                                                onSelect={() => setSelectedAoiId(aoi.id)}
                                                onChange={updateAoi}
                                                containerRef={aoiContainerRef}
                                            />
                                        );
                                    })}
                                    {aoiCurrent && aoiCurrent.w > 0 && (
                                        <div
                                            className="absolute pointer-events-none border-2 border-dashed border-blue-500"
                                            style={{
                                                left: `${aoiCurrent.x}%`,
                                                top: `${aoiCurrent.y}%`,
                                                width: `${aoiCurrent.w}%`,
                                                height: `${aoiCurrent.h}%`,
                                                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                            }}
                                        />
                                    )}
                                </div>

                                {/* AOI list — compact horizontal chips below image */}
                                {computedAois.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {computedAois.map((aoi, i) => {
                                            const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'];
                                            const color = colors[i % colors.length];
                                            const isEditing = editingLabelId === aoi.id;
                                            return (
                                                <div
                                                    key={aoi.id}
                                                    className={cn(
                                                        'flex items-center gap-2 px-2.5 py-1.5 bg-white border rounded-lg text-xs',
                                                        selectedAoiId === aoi.id && 'ring-2 ring-blue-400',
                                                    )}
                                                    onClick={() => setSelectedAoiId(aoi.id)}
                                                >
                                                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                                                    {isEditing ? (
                                                        <input
                                                            value={editingLabelValue}
                                                            onChange={(e) => setEditingLabelValue(e.target.value)}
                                                            onBlur={() => updateAoiLabel(aoi.id, editingLabelValue)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') updateAoiLabel(aoi.id, editingLabelValue);
                                                                if (e.key === 'Escape') setEditingLabelId(null);
                                                            }}
                                                            className="w-24 px-1 py-0.5 border rounded text-xs"
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="font-medium text-gray-700 cursor-text"
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingLabelId(aoi.id);
                                                                setEditingLabelValue(aoi.label);
                                                            }}
                                                        >
                                                            {aoi.label}
                                                        </span>
                                                    )}
                                                    <span className="font-semibold" style={{ color }}>{aoi.percentage}%</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removeAoi(aoi.id); }}
                                                        className="text-gray-400 hover:text-red-500 ml-0.5"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                </div>
            </div>

            {showNameModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Nombre de la zona</h3>
                        <input
                            value={pendingLabel}
                            onChange={(e) => setPendingLabel(e.target.value)}
                            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmPendingAoi();
                                if (e.key === 'Escape') {
                                    setShowNameModal(false);
                                    setPendingRect(null);
                                }
                            }}
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => { setShowNameModal(false); setPendingRect(null); }}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmPendingAoi}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                            >
                                Guardar zona
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {showSkipConfirm && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Continuar sin zonas</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            No has definido AOIs. Puedes generar el heatmap igualmente, pero el análisis IA tendrá menos contexto espacial.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowSkipConfirm(false)}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSkipConfirm(false);
                                    onAoiSkippedChange?.(true);
                                    if (skipConfirmAction === 'predict') {
                                        onRunPrediction?.(aoiList);
                                    }
                                }}
                                className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md"
                            >
                                Continuar sin zonas
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {/* Settings Modal — portal to body to avoid ancestor transform/overflow breaking fixed positioning */}
            {showSettings && createPortal(
                <SettingsModal
                    imageUrl={imageUrl}
                    heatmapData={heatmapData}
                    settings={settings}
                    onApply={setSettings}
                    onClose={() => setShowSettings(false)}
                />,
                document.body
            )}
        </>
    );
};
