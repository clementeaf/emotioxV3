import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import { cn } from '../../lib/utils';
import { HeatmapRenderer } from '../results/cognitive-task/components/HeatmapRenderer';
import { AttentionVideoPlayer } from '../results/cognitive-task/components/AttentionVideoPlayer';
import { researchService } from '../../services/research.service';

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

interface AOI {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface AOIWithStats extends AOI {
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
    opacity: 72,
    threshold: 40,
    preset: 'Balanced',
};

type TabId = 'prediction' | 'attention-video' | 'image';

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
}

const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'prediction', label: 'Prediction', icon: 'eye' },
    { id: 'attention-video', label: 'Attention Video', icon: 'video' },
    { id: 'image', label: 'Image', icon: 'image' },
];

const TAB_ICONS: Record<string, React.ReactNode> = {
    eye: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    video: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    image: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    settings: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

const DETAIL_PRESETS = ['Smooth', 'Balanced', 'Detailed'];

/** Each preset adjusts blur, threshold, and opacity for a different detail level. */
const PRESET_VALUES: Record<string, Pick<HeatmapSettings, 'blur' | 'threshold' | 'opacity'>> = {
    'Smooth':   { blur: 20, threshold: 50, opacity: 60 },
    'Balanced': { blur: 12, threshold: 35, opacity: 72 },
    'Detailed': { blur: 6,  threshold: 25, opacity: 85 },
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
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─── Video Frame Scrubber ─── */
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
    const videoRef = useRef<HTMLVideoElement>(null);
    const activeFrame = frames[frameIdx] || frames[0];
    const frameData = activeFrame?.heatmapData || [];

    const handleSeek = (idx: number) => {
        setFrameIdx(idx);
        if (videoRef.current && frames[idx]) {
            videoRef.current.currentTime = frames[idx].timestamp;
        }
    };

    return (
        <div className="space-y-3">
            {/* Video + heatmap overlay side by side */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg overflow-hidden border bg-gray-100">
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className="w-full block"
                        muted
                    />
                    <p className="text-xs text-gray-400 text-center py-1">Original</p>
                </div>
                <div>
                    {frameData.length > 0 ? (
                        <HeatmapRenderer
                            imageUrl={videoUrl}
                            data={frameData}
                            blur={settings.blur}
                            opacity={settings.opacity}
                            threshold={settings.threshold}
                            className="w-full"
                        />
                    ) : (
                        <div className="rounded-lg border bg-gray-50 h-full flex items-center justify-center">
                            <p className="text-sm text-gray-400">No prediction for this frame</p>
                        </div>
                    )}
                    <p className="text-xs text-gray-400 text-center py-1">Prediction</p>
                </div>
            </div>

            {/* Frame scrubber */}
            <div className="flex items-center gap-3 px-2">
                <span className="text-xs text-gray-500 font-mono w-20">
                    Frame {frameIdx + 1}/{frames.length}
                </span>
                <input
                    type="range"
                    min={0}
                    max={frames.length - 1}
                    value={frameIdx}
                    onChange={e => handleSeek(Number(e.target.value))}
                    className="flex-1 accent-blue-600"
                />
                <span className="text-xs text-gray-500 font-mono w-12 text-right">
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
}: AttentionPredictionCardProps) => {
    const [activeTab, setActiveTab] = useState<TabId>('prediction');
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<HeatmapSettings>(DEFAULT_SETTINGS);
    const [aoiList, setAoiList] = useState<AOI[]>([]);
    const [drawingAoi, setDrawingAoi] = useState(false);
    const [aoiStart, setAoiStart] = useState<{ x: number; y: number } | null>(null);
    const [aoiCurrent, setAoiCurrent] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [isSavingAois, setIsSavingAois] = useState(false);
    const aoiContainerRef = useRef<HTMLDivElement>(null);
    const tabContentRef = useRef<HTMLDivElement>(null);

    // Load persisted AOIs from research settings
    useEffect(() => {
        if (!researchId || !stimulusMediaId) return;
        researchService.getById(researchId).then(res => {
            const s = (res.research.settings as Record<string, unknown>) || {};
            const stimuli = (s.stimuli as Array<Record<string, unknown>>) || [];
            const stimulus = stimuli.find(st => st.mediaId === stimulusMediaId);
            const savedAois = (stimulus?.aois as AOI[]) || [];
            if (savedAois.length > 0) setAoiList(savedAois);
        }).catch(() => { /* ignore load errors */ });
    }, [researchId, stimulusMediaId]);

    // Persist AOIs to research settings
    const persistAois = useCallback(async (aois: AOI[]) => {
        if (!researchId || !stimulusMediaId) return;
        setIsSavingAois(true);
        try {
            const res = await researchService.getById(researchId);
            const s = (res.research.settings as Record<string, unknown>) || {};
            const stimuli = (s.stimuli as Array<Record<string, unknown>>) || [];
            const updatedStimuli = stimuli.map(st => {
                if (st.mediaId === stimulusMediaId) {
                    return { ...st, aois };
                }
                return st;
            });
            await researchService.update(researchId, {
                settings: { ...s, stimuli: updatedStimuli },
            });
        } catch {
            // Best-effort persistence
        } finally {
            setIsSavingAois(false);
        }
    }, [researchId, stimulusMediaId]);

    const getMousePercent = (e: React.MouseEvent, el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
        };
    };

    const addAoi = (rect: { x: number; y: number; w: number; h: number }) => {
        const aoi: AOI = {
            id: `aoi_${crypto.randomUUID()}`,
            label: `AOI #${aoiList.length + 1}`,
            x: rect.x,
            y: rect.y,
            width: rect.w,
            height: rect.h,
        };
        const updated = [...aoiList, aoi];
        setAoiList(updated);
        void persistAois(updated);
    };

    const removeAoi = (aoiId: string) => {
        const updated = aoiList.filter(a => a.id !== aoiId);
        setAoiList(updated);
        void persistAois(updated);
    };

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
            <div className={cn('border rounded-lg overflow-hidden bg-white', className)}>
                {/* Title */}
                <div className="p-4 border-b flex items-start justify-between">
                    <div>
                        <h4 className="font-semibold text-base">{title}</h4>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Prediction of visual attention
                        </p>
                    </div>
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
                </div>

                {/* Tabs + Settings */}
                <div className="border-b bg-white">
                    <div className="flex items-center px-4">
                        <div className="flex gap-1 flex-1">
                            {TABS.map(tab => (
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

                {/* Content */}
                <div className="p-4" ref={tabContentRef}>
                    {/* Prediction Tab — Heatmap + AOI drawing */}
                    {activeTab === 'prediction' && (
                        <>
                            {/* AOI toolbar */}
                            <div className="flex items-center gap-3 mb-3">
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
                                    {drawingAoi ? 'Drawing AOI...' : '+ Add AOI'}
                                </button>
                                {computedAois.length > 0 && (
                                    <span className="text-xs text-gray-500">
                                        {computedAois.length} AOI defined
                                        {isSavingAois && ' — saving...'}
                                    </span>
                                )}
                            </div>

                            <div
                                ref={aoiContainerRef}
                                className={cn(
                                    'mb-4 rounded-lg overflow-hidden border bg-gray-100 relative w-fit mx-auto',
                                    drawingAoi && 'cursor-crosshair'
                                )}
                                onMouseDown={drawingAoi ? (e) => {
                                    const container = aoiContainerRef.current;
                                    if (!container) return;
                                    const pos = getMousePercent(e, container);
                                    setAoiStart(pos);
                                    setAoiCurrent({ x: pos.x, y: pos.y, w: 0, h: 0 });
                                } : undefined}
                                onMouseMove={drawingAoi && aoiStart ? (e) => {
                                    const container = aoiContainerRef.current;
                                    if (!container) return;
                                    const pos = getMousePercent(e, container);
                                    setAoiCurrent({
                                        x: Math.min(aoiStart.x, pos.x),
                                        y: Math.min(aoiStart.y, pos.y),
                                        w: Math.abs(pos.x - aoiStart.x),
                                        h: Math.abs(pos.y - aoiStart.y),
                                    });
                                } : undefined}
                                onMouseUp={drawingAoi && aoiCurrent && aoiCurrent.w > 1 && aoiCurrent.h > 1 ? () => {
                                    addAoi(aoiCurrent);
                                    setAoiStart(null);
                                    setAoiCurrent(null);
                                    setDrawingAoi(false);
                                } : () => { setAoiStart(null); setAoiCurrent(null); }}
                            >
                                <HeatmapRenderer
                                    imageUrl={imageUrl}
                                    data={heatmapData}
                                    blur={settings.blur}
                                    opacity={settings.opacity}
                                    threshold={settings.threshold}
                                    className="w-full"
                                />

                                {/* AOI overlays */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    {computedAois.map(aoi => (
                                        <g key={aoi.id}>
                                            <rect
                                                x={aoi.x} y={aoi.y} width={aoi.width} height={aoi.height}
                                                fill="rgba(59, 130, 246, 0.1)"
                                                stroke="#3B82F6"
                                                strokeWidth="0.4"
                                            />
                                            <text
                                                x={aoi.x + 0.5} y={aoi.y + 2.5}
                                                fill="#1D4ED8" fontSize="2.5" fontWeight="bold"
                                            >
                                                {aoi.label} — {aoi.percentage}%
                                            </text>
                                        </g>
                                    ))}
                                    {/* Drawing preview */}
                                    {aoiCurrent && aoiCurrent.w > 0 && (
                                        <rect
                                            x={aoiCurrent.x} y={aoiCurrent.y}
                                            width={aoiCurrent.w} height={aoiCurrent.h}
                                            fill="rgba(59, 130, 246, 0.15)"
                                            stroke="#3B82F6"
                                            strokeWidth="0.4"
                                            strokeDasharray="1,1"
                                        />
                                    )}
                                </svg>
                            </div>
                        </>
                    )}

                    {/* Attention Video Tab — per-frame heatmap or progressive scanpath */}
                    {activeTab === 'attention-video' && (
                        <div className="w-fit mx-auto">
                            {isVideo && videoFrames.length > 0 ? (
                                <VideoFrameScrubber
                                    videoUrl={imageUrl}
                                    frames={videoFrames}
                                    settings={settings}
                                />
                            ) : (
                                <AttentionVideoPlayer
                                    imageUrl={imageUrl}
                                    data={heatmapData}
                                    duration={5}
                                />
                            )}
                        </div>
                    )}

                    {/* Image Tab — Clean image only */}
                    {activeTab === 'image' && (
                        <div className="mb-4 rounded-lg overflow-hidden border bg-gray-100 w-fit mx-auto">
                            <img src={imageUrl} alt={title} className="max-h-[700px] w-auto block" />
                        </div>
                    )}

                    {/* AOI list */}
                    {computedAois.length > 0 && (
                        <div className="space-y-2 mt-4">
                            {computedAois.map(aoi => (
                                <div key={aoi.id} className="flex items-center gap-4 p-3 bg-white border rounded-lg">
                                    {/* Thumbnail */}
                                    <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 border bg-gray-50">
                                        <img
                                            src={imageUrl}
                                            alt={aoi.label}
                                            className="w-full h-full"
                                            style={{
                                                objectFit: 'cover',
                                                objectPosition: `${aoi.x + aoi.width / 2}% ${aoi.y + aoi.height / 2}%`,
                                            }}
                                        />
                                    </div>

                                    {/* Label */}
                                    <span className="text-sm font-medium text-gray-900 flex-1 min-w-0">
                                        {aoi.label}
                                    </span>

                                    {/* Percentage */}
                                    <span className="text-sm font-semibold text-green-600">{aoi.percentage}%</span>

                                    {/* Remove */}
                                    <button
                                        type="button"
                                        onClick={() => removeAoi(aoi.id)}
                                        className="text-sm text-red-600 hover:text-red-700 font-medium whitespace-nowrap"
                                    >
                                        Remove AOI
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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
