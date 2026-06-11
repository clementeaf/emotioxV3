import { useState, useMemo, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { useViewportHeight } from '../../hooks/useViewportHeight';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { cn } from '../../lib/utils';
import { HeatmapRenderer } from '../results/cognitive-task/components/HeatmapRenderer';
import { SpotlightRenderer } from '../results/cognitive-task/components/SpotlightRenderer';
import { ColdMapRenderer } from '../results/cognitive-task/components/ColdMapRenderer';
import { loadCachedStimulusImage } from '../../utils/stimulusImageCache';
import { GazeScanpathPlayer } from './GazeScanpathPlayer';
import { VideoAccumulatedHeatmapOverlay } from './VideoAccumulatedHeatmapOverlay';
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
    DEFAULT_COLD_MAP_SETTINGS,
    DEFAULT_SPOTLIGHT_SETTINGS,
    formatHeatmapViewSummary,
    isLegacyDenseHeatmap,
    normalizeManualAois,
    reconcileAutoAoisWithManual,
    computeAoiAttentionShare,
    estimateExposureTime,
    anchorGazePathToHeatmap,
    anchorGazeRoutesToHeatmap,
    buildAttentionLayerPreset,
    shouldBlockAoiKeyboardDelete,
    resolveHeatmapVisualProfile,
    type AttentionLayerContext,
    type AttentionPredictionTabId,
    STIMULUS_MEDIA_FIT_FLEX_CLASS,
    type ColdMapSettings,
    type HeatmapMapMode,
    type SpotlightSettings,
} from '../../utils/attentionPrediction.utils';

import { StimulusOverlayFrame, ZoomControls, STIMULUS_TRANSFORM_CONTENT_STYLE } from './StimulusOverlayFrame';
import { HeatmapSettingsModal, DEFAULT_SETTINGS, type HeatmapPoint, type HeatmapSettings, type HeatmapViewSettings } from './HeatmapSettingsModal';
import { MapModeControlBar } from './MapModeControlBar';
import { VideoFrameScrubber, type VideoFrameData } from './VideoFrameScrubber';

/* ─── Constants ─── */

const ROUTE_COLORS: Record<string, string> = {
    'typical-scan': '#3B82F6',
    'group-scan': '#10B981',
    'novelty-search': '#F59E0B',
};

const GAZE_ROUTE_LEGEND: Array<{ id: string; color: string; label: string }> = [
    { id: 'typical-scan', color: ROUTE_COLORS['typical-scan'], label: 'Typical Scan (Vertical Flow)' },
    { id: 'group-scan', color: ROUTE_COLORS['group-scan'], label: 'Group/Area Scan' },
    { id: 'novelty-search', color: ROUTE_COLORS['novelty-search'], label: 'Novelty/Differentiation Search' },
];

const AOI_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'];

const TAB_ICONS: Record<string, ReactNode> = {
    eye: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    video: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    image: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    settings: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    route: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /></svg>,
    aoi: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M3 9h18M9 3v18" /></svg>,
};

/* ─── Types ─── */

interface AOIWithStats extends ManualAOI {
    percentage: number;
}

type TabId = AttentionPredictionTabId;

interface StimulusLayers {
    heatmap: boolean;
    aiAois: boolean;
    manualAois: boolean;
    gaze: boolean;
}

const BASE_TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'original', label: 'Original', icon: 'image' },
    { id: 'heatmap', label: 'Heatmap', icon: 'eye' },
    { id: 'gaze-paths', label: 'Gaze Paths', icon: 'route' },
    { id: 'aoi-editor', label: 'AOI Editor', icon: 'aoi' },
];

/* ─── Video overlay — replaces deep ternary chain ─── */

const VideoOverlayContent = ({
    videoFrames,
    imageUrl,
    heatmapData,
    settings,
    mapMode,
    spotlightSettings,
    coldSettings,
    videoProgress,
    onProcessVideo,
    onDismissVideoProgress,
}: {
    videoFrames: VideoFrameData[];
    imageUrl: string;
    heatmapData: HeatmapPoint[];
    settings: HeatmapSettings;
    mapMode: HeatmapMapMode;
    spotlightSettings: SpotlightSettings;
    coldSettings: ColdMapSettings;
    videoProgress?: { phase: string; current: number; total: number; message: string } | null;
    onProcessVideo?: () => void;
    onDismissVideoProgress?: () => void;
}) => {
    if (videoFrames.length > 0) {
        return (
            <VideoFrameScrubber
                videoUrl={imageUrl}
                frames={videoFrames}
                settings={settings}
                mapMode={mapMode}
                spotlightSettings={spotlightSettings}
                coldSettings={coldSettings}
            />
        );
    }

    if (heatmapData.length > 0) {
        return (
            <VideoAccumulatedHeatmapOverlay
                videoUrl={imageUrl}
                heatmapData={heatmapData}
                settings={settings}
                mapMode={mapMode}
                spotlightSettings={spotlightSettings}
                coldSettings={coldSettings}
            />
        );
    }

    // No heatmap yet — show progress, error, or process button
    if (videoProgress && videoProgress.phase !== 'error' && videoProgress.phase !== 'complete') {
        return (
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
        );
    }

    if (videoProgress?.phase === 'error') {
        return (
            <div className="flex flex-col items-center gap-2 px-6 py-4 bg-red-900/70 rounded-xl">
                <p className="text-red-200 text-sm font-medium">{videoProgress.message}</p>
                {onProcessVideo && (
                    <button onClick={onProcessVideo} className="text-xs text-white underline">Retry</button>
                )}
                {onDismissVideoProgress && (
                    <button onClick={onDismissVideoProgress} className="text-xs text-red-300">Dismiss</button>
                )}
            </div>
        );
    }

    if (onProcessVideo) {
        return (
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
        );
    }

    return null;
};

/* ─── Props ─── */

interface AttentionPredictionCardProps {
    imageUrl: string;
    title: string;
    heatmapData?: HeatmapPoint[];
    onDelete?: () => void;
    isDeleting?: boolean;
    className?: string;
    researchId?: string;
    stimulusMediaId?: string;
    isVideo?: boolean;
    videoFrames?: VideoFrameData[];
    aiAnalysis?: AiAnalysisResult;
    pendingImportAois?: AiAnalysisResult['autoAois'];
    onImportAoisDone?: () => void;
    onAddMore?: () => void;
    onRunAnalysis?: (manualAois: ManualAOI[]) => void;
    onRunPrediction?: (manualAois: ManualAOI[]) => void;
    isPredicting?: boolean;
    predictElapsed?: number;
    predictionError?: string;
    initialTab?: TabId;
    workflowFocusTab?: TabId;
    onWorkflowFocusTabHandled?: () => void;
    onOpenCriteria?: () => void;
    isCriteriaDrawerOpen?: boolean;
    aoiSkipped?: boolean;
    onAoiSkippedChange?: (skipped: boolean) => void;
    onAoiListChange?: (aois: ManualAOI[]) => void;
    autoPresets?: { blur: number; opacity: number; threshold: number };
    griddedAOIs?: Array<{ label: string; x: number; y: number; width: number; height: number; attention: number; rank: number }>;
    isAnalyzing?: boolean;
    analyzeElapsed?: number;
    headerExtra?: ReactNode;
    onProcessVideo?: () => void;
    videoProgress?: { phase: string; current: number; total: number; message: string } | null;
    onDismissVideoProgress?: () => void;
}

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
    workflowFocusTab,
    onWorkflowFocusTabHandled,
    isCriteriaDrawerOpen = false,
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
    /* ── Tab & layer state ── */
    const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? 'original');
    const [layers, setLayers] = useState<StimulusLayers>({
        heatmap: false, aiAois: false, manualAois: false, gaze: false,
    });
    const layerContextRef = useRef<AttentionLayerContext>({
        hasHeatmap: false, hasGazeRoutes: false, hasManualAois: false, hasAutoAois: false,
    });
    const overlayAvailabilityRef = useRef({ heatmap: false, gaze: false });
    const loadedAoiCountRef = useRef(0);

    /* ── AOI drawing state ── */
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [skipConfirmAction, setSkipConfirmAction] = useState<'gate-only' | 'predict'>('gate-only');
    const [showNameModal, setShowNameModal] = useState(false);
    const [pendingRect, setPendingRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [pendingLabel, setPendingLabel] = useState('');
    const [selectedAoiId, setSelectedAoiId] = useState<string | null>(null);
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const [editingLabelValue, setEditingLabelValue] = useState('');
    const [drawingAoi, setDrawingAoi] = useState(false);
    const [aoiStart, setAoiStart] = useState<{ x: number; y: number } | null>(null);
    const [aoiCurrent, setAoiCurrent] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const [aoiList, setAoiList] = useState<ManualAOI[]>([]);
    const [isSavingAois, setIsSavingAois] = useState(false);
    const aoiContainerRef = useRef<HTMLDivElement>(null);

    /** Track AOI count at last predict to detect staleness */
    const aoiCountAtPredict = useRef<number | null>(null);

    /* ── Heatmap settings state ── */
    const [showSettings, setShowSettings] = useState(false);
    const heatmapViewSnapshotRef = useRef<HeatmapViewSettings | null>(null);
    const [settings, setSettings] = useState<HeatmapSettings>(() => {
        if (autoPresets) {
            return { blur: autoPresets.blur, opacity: autoPresets.opacity, threshold: autoPresets.threshold, preset: 'Precise' };
        }
        return { ...DEFAULT_SETTINGS };
    });
    const [mapMode, setMapMode] = useState<HeatmapMapMode>('classic');
    const [spotlightSettings, setSpotlightSettings] = useState<SpotlightSettings>({ ...DEFAULT_SPOTLIGHT_SETTINGS });
    const [coldSettings, setColdSettings] = useState<ColdMapSettings>({ ...DEFAULT_COLD_MAP_SETTINGS });

    /* ── Gaze state ── */
    const [visibleRoutes, setVisibleRoutes] = useState<Set<string>>(new Set(['typical-scan', 'group-scan', 'novelty-search']));
    const [gazeMode, setGazeMode] = useState<'static' | 'animated'>('static');

    /* ── Refs ── */
    const tabContentRef = useRef<HTMLDivElement>(null);

    /** Reactive viewport height — tracks window resize with debounce */
    const stableMaxHeight = useViewportHeight();

    /* ── Tab management ── */

    const applyTabLayers = useCallback((tabId: TabId, context: AttentionLayerContext): void => {
        setLayers(buildAttentionLayerPreset(tabId, context));
    }, []);

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
            applyTabLayers(initialTab, layerContextRef.current);
        }
    }, [initialTab, applyTabLayers]);

    const handleTabChange = useCallback((tabId: TabId): void => {
        setActiveTab(tabId);
        applyTabLayers(tabId, layerContextRef.current);
    }, [applyTabLayers]);

    useEffect(() => {
        if (!workflowFocusTab) return;
        handleTabChange(workflowFocusTab);
        onWorkflowFocusTabHandled?.();
    }, [workflowFocusTab, handleTabChange, onWorkflowFocusTabHandled]);

    const toggleLayer = useCallback((key: keyof StimulusLayers): void => {
        setLayers(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const applyCompositeLayers = useCallback((): void => {
        applyTabLayers(activeTab, layerContextRef.current);
    }, [activeTab, applyTabLayers]);

    /* ── Stimulus image cache ── */
    useEffect(() => {
        if (!imageUrl || isVideo) return;
        void loadCachedStimulusImage(imageUrl);
    }, [imageUrl, isVideo]);

    /* ── Tabs filter ── */
    const tabs = useMemo(() => {
        return BASE_TABS.filter(tab => {
            if (tab.id === 'gaze-paths') return aiAnalysis?.gazePath && aiAnalysis.gazePath.length > 0;
            if (tab.id === 'aoi-editor') return !isVideo;
            return true;
        });
    }, [aiAnalysis, isVideo]);

    /* ── Auto-presets sync ── */
    useEffect(() => {
        if (autoPresets) {
            setSettings({ blur: autoPresets.blur, opacity: autoPresets.opacity, threshold: autoPresets.threshold, preset: 'Precise' });
        }
    }, [autoPresets]);

    /* ── AOI: global mouse handlers for drawing ── */
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
                    setSelectedAoiId(null);
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

    /* ── AOI: load persisted ── */
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

    /* ── AOI: persist ── */
    const pendingAoisRef = useRef<ManualAOI[] | null>(null);
    const saveInFlightRef = useRef(false);

    const persistAois = useCallback(async (aois: ManualAOI[]) => {
        if (!researchId || !stimulusMediaId) return;
        pendingAoisRef.current = aois;
        if (saveInFlightRef.current) return;
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
                    if (st.mediaId === stimulusMediaId) return { ...st, aois: toSave };
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

    /* ── AOI: CRUD ── */

    const confirmPendingAoi = useCallback(() => {
        if (!pendingRect) return;
        const label = pendingLabel.trim() || `Zona ${aoiList.length + 1}`;
        const aoi: ManualAOI = clampAoiBounds({
            id: `aoi_${crypto.randomUUID()}`,
            label,
            x: pendingRect.x, y: pendingRect.y,
            width: pendingRect.w, height: pendingRect.h,
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

    const removeAoi = useCallback((aoiId: string): void => {
        setAoiList((prev) => {
            const updated = prev.filter(a => a.id !== aoiId);
            void persistAois(updated);
            return updated;
        });
        setSelectedAoiId((prev) => (prev === aoiId ? null : prev));
    }, [persistAois]);

    /* ── AOI: keyboard delete ── */
    useEffect(() => {
        if (!selectedAoiId) return;
        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            if (shouldBlockAoiKeyboardDelete({
                showNameModal, editingLabelId,
                criteriaDrawerOpen: isCriteriaDrawerOpen,
                target: e.target,
            })) return;
            removeAoi(selectedAoiId);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [selectedAoiId, showNameModal, editingLabelId, isCriteriaDrawerOpen, removeAoi]);

    useEffect(() => {
        if (isCriteriaDrawerOpen) setSelectedAoiId(null);
    }, [isCriteriaDrawerOpen]);

    /* ── Gates ── */
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
        aoiCountAtPredict.current = aoiList.length;
        onRunPrediction(aoiList);
    };

    const handleAnalysisClick = (): void => {
        if (!onRunAnalysis || !analysisGateOpen) return;
        onRunAnalysis(aoiList);
    };

    /* ── Auto-switch to heatmap after prediction completes ── */
    const wasPredicting = useRef(false);
    useEffect(() => {
        const justFinished = wasPredicting.current && !isPredicting && hasHeatmap;
        wasPredicting.current = isPredicting;
        if (justFinished) handleTabChange('heatmap');
    }, [isPredicting, hasHeatmap, handleTabChange]);

    /* ── AOI import ── */
    const importedAiLabels = useMemo(
        () => new Set(aoiList.filter(a => a.source === 'imported-ai').map(a => a.label)),
        [aoiList],
    );

    const handleImportAois = useCallback((aiAois: AiAnalysisResult['autoAois']) => {
        const existingLabels = new Set(aoiList.map(a => a.label));
        const newAois: ManualAOI[] = aiAois
            .filter(a => !existingLabels.has(a.label))
            .map(a => ({
                id: `aoi_${crypto.randomUUID()}`,
                label: a.label,
                x: a.x, y: a.y, width: a.width, height: a.height,
                source: 'imported-ai' as const,
            }));
        if (newAois.length > 0) {
            const updated = [...aoiList, ...newAois];
            setAoiList(updated);
            void persistAois(updated);
        }
    }, [aoiList, persistAois]);

    useEffect(() => {
        if (!pendingImportAois || pendingImportAois.length === 0) return;
        handleImportAois(pendingImportAois);
        onImportAoisDone?.();
    }, [pendingImportAois]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Computed data ── */
    const computedAois: AOIWithStats[] = useMemo(() => {
        const saliencyPoints = heatmapData.map(p => ({ x: p.x, y: p.y, value: p.value ?? 0 }));
        return aoiList.map(aoi => ({
            ...aoi,
            percentage: computeAoiAttentionShare(aoi, saliencyPoints),
        }));
    }, [aoiList, heatmapData]);

    const displayAutoAois = useMemo(
        () => isPredicting ? [] : reconcileAutoAoisWithManual(aoiList, aiAnalysis?.autoAois ?? []),
        [aoiList, aiAnalysis?.autoAois, isPredicting],
    );

    const anchoredHeatmapData = useMemo(
        () => heatmapData.map((point) => ({ x: point.x, y: point.y, value: point.value ?? 0 })),
        [heatmapData],
    );

    const gazeRoutes = useMemo(() => {
        if (!aiAnalysis?.gazePath?.length) return [];

        const anchorFixations = (fixations: AiAnalysisResult['gazePath']): AiAnalysisResult['gazePath'] => (
            anchoredHeatmapData.length > 0
                ? anchorGazePathToHeatmap(fixations, anchoredHeatmapData)
                : fixations
        );

        if (aiAnalysis.gazePathRoutes?.length) {
            return anchoredHeatmapData.length > 0
                ? anchorGazeRoutesToHeatmap(aiAnalysis.gazePathRoutes, anchoredHeatmapData)
                : aiAnalysis.gazePathRoutes;
        }

        return [{
            id: 'typical-scan',
            name: 'Typical Scan',
            description: 'Default predicted path',
            fixations: anchorFixations(aiAnalysis.gazePath),
        }];
    }, [aiAnalysis, anchoredHeatmapData]);

    /* ── Layer context sync ── */
    const layerContext = useMemo<AttentionLayerContext>(() => ({
        hasHeatmap,
        hasGazeRoutes: gazeRoutes.length > 0,
        hasManualAois: computedAois.length > 0,
        hasAutoAois: displayAutoAois.length > 0,
    }), [hasHeatmap, gazeRoutes.length, computedAois.length, displayAutoAois.length]);

    layerContextRef.current = layerContext;

    useEffect(() => {
        if (!stimulusMediaId) return;
        overlayAvailabilityRef.current = { heatmap: false, gaze: false };
        loadedAoiCountRef.current = 0;
        const tab = initialTab ?? 'original';
        const context: AttentionLayerContext = {
            hasHeatmap: heatmapData.length > 0,
            hasGazeRoutes: Boolean(aiAnalysis?.gazePath?.length),
            hasManualAois: false,
            hasAutoAois: (aiAnalysis?.autoAois?.length ?? 0) > 0,
        };
        setActiveTab(tab);
        applyTabLayers(tab, context);
        setGazeMode('static');
        setVisibleRoutes(new Set(['typical-scan', 'group-scan', 'novelty-search']));
    }, [stimulusMediaId, initialTab, applyTabLayers]);

    useEffect(() => {
        const prev = overlayAvailabilityRef.current;
        const gainedOverlay = (!prev.heatmap && layerContext.hasHeatmap) || (!prev.gaze && layerContext.hasGazeRoutes);
        overlayAvailabilityRef.current = { heatmap: layerContext.hasHeatmap, gaze: layerContext.hasGazeRoutes };
        if (!gainedOverlay) return;
        if (activeTab === 'original' || activeTab === 'gaze-paths' || activeTab === 'heatmap') {
            applyTabLayers(activeTab, layerContext);
        }
    }, [layerContext, activeTab, applyTabLayers]);

    useEffect(() => {
        if (aoiList.length === 0) { loadedAoiCountRef.current = 0; return; }
        if (loadedAoiCountRef.current > 0) { loadedAoiCountRef.current = aoiList.length; return; }
        loadedAoiCountRef.current = aoiList.length;
        if (activeTab === 'original' || activeTab === 'gaze-paths') {
            applyTabLayers(activeTab, layerContextRef.current);
        }
    }, [aoiList.length, activeTab, applyTabLayers]);

    const primaryGazeRoute = useMemo(
        () => gazeRoutes.find((route) => visibleRoutes.has(route.id)) ?? gazeRoutes[0],
        [gazeRoutes, visibleRoutes],
    );

    const animatedGazePath = useMemo(
        () => primaryGazeRoute?.fixations ?? [],
        [primaryGazeRoute],
    );

    const toggleGazeRoute = useCallback((id: string): void => {
        setVisibleRoutes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    /* ── Derived flags ── */
    const showHeatmapLayer = layers.heatmap && hasHeatmap;
    const showBaseImage = !showHeatmapLayer;
    const isAoiEditMode = activeTab === 'aoi-editor';
    const showMapModeControls = hasHeatmap && (layers.heatmap || activeTab === 'heatmap');
    const heatmapBlur = isAoiEditMode ? Math.max(settings.blur, 10) : settings.blur;
    const heatmapOpacity = isAoiEditMode ? Math.max(settings.opacity, 40) : settings.opacity;
    const heatmapThreshold = isAoiEditMode ? Math.min(settings.threshold, 20) : settings.threshold;
    const heatmapGranularity: 'precise' | 'smooth' = settings.preset === 'Smooth' ? 'smooth' : 'precise';
    const heatmapVisualProfile = resolveHeatmapVisualProfile(settings.preset);
    const effectiveMapMode: HeatmapMapMode = isAoiEditMode ? 'classic' : mapMode;
    const showLegacyHeatmapBanner = hasHeatmap && isLegacyDenseHeatmap(heatmapData.length);

    /* ── Heatmap settings management ── */
    const applyHeatmapViewSettings = useCallback((view: HeatmapViewSettings): void => {
        setSettings(view.settings);
        setMapMode(view.mapMode);
        setSpotlightSettings(view.spotlight);
        setColdSettings(view.cold);
    }, []);

    const openHeatmapSettings = useCallback((): void => {
        heatmapViewSnapshotRef.current = {
            settings: { ...settings }, mapMode,
            spotlight: { ...spotlightSettings }, cold: { ...coldSettings },
        };
        setShowSettings(true);
    }, [settings, mapMode, spotlightSettings, coldSettings]);

    const cancelHeatmapSettings = useCallback((): void => {
        const snapshot = heatmapViewSnapshotRef.current;
        if (snapshot) applyHeatmapViewSettings(snapshot);
        heatmapViewSnapshotRef.current = null;
        setShowSettings(false);
    }, [applyHeatmapViewSettings]);

    const confirmHeatmapSettings = useCallback((): void => {
        heatmapViewSnapshotRef.current = null;
        setShowSettings(false);
    }, []);

    const heatmapViewSummary = useMemo(
        () => formatHeatmapViewSummary({ mapMode, settings, spotlight: spotlightSettings, cold: coldSettings }),
        [mapMode, settings, spotlightSettings, coldSettings],
    );

    const handleMapModeChange = useCallback((mode: HeatmapMapMode): void => {
        if (isAoiEditMode && mode !== 'classic') return;
        setMapMode(mode);
        if (!layers.heatmap) setLayers((prev) => ({ ...prev, heatmap: true }));
    }, [isAoiEditMode, layers.heatmap]);

    const handlePresetChange = useCallback((preset: string, values: Pick<HeatmapSettings, 'blur' | 'threshold' | 'opacity'>): void => {
        setSettings(prev => ({ ...prev, preset, ...values }));
    }, []);

    const handleDownloadImage = useCallback(async () => {
        const el = tabContentRef.current;
        if (!el) return;
        try {
            const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `attention-prediction-${activeTab}-${effectiveMapMode}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            // Download failed silently
        }
    }, [activeTab, effectiveMapMode]);

    /* ── Empty state ── */
    if (!imageUrl) {
        return (
            <div className="bg-gray-100 h-64 flex items-center justify-center rounded-lg">
                <span className="text-gray-400">No image available</span>
            </div>
        );
    }

    /* ── Render ── */
    return (
        <>
            <div className={cn('flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-white', className)}>
                {/* Title + actions */}
                <CardHeader
                    title={title}
                    onAddMore={onAddMore}
                    onDelete={onDelete}
                    isDeleting={isDeleting}
                    headerExtra={headerExtra}
                    onRunPrediction={onRunPrediction}
                    isVideo={isVideo}
                    isPredicting={isPredicting}
                    predictElapsed={predictElapsed}
                    hasHeatmap={hasHeatmap}
                    predictionGateOpen={predictionGateOpen}
                    onPredictClick={handlePredictClick}
                    heatmapStale={hasHeatmap && aoiCountAtPredict.current !== null && aoiList.length !== aoiCountAtPredict.current}
                    onRunAnalysis={onRunAnalysis}
                    isAnalyzing={isAnalyzing}
                    analyzeElapsed={analyzeElapsed}
                    analysisGateOpen={analysisGateOpen}
                    aiAnalysis={aiAnalysis}
                    onAnalysisClick={handleAnalysisClick}
                />

                {showLegacyHeatmapBanner && (
                    <div className="mx-4 mt-3 px-3 py-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
                        Datos de heatmap antiguos — usa «Regenerar heatmap» para obtener un mapa fino con hotspots precisos.
                    </div>
                )}

                {predictionError && (
                    <div className="mx-4 mt-3 px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md flex items-center justify-between gap-2">
                        <span>Error al generar heatmap: {predictionError}</span>
                        {onRunPrediction && (
                            <button type="button" onClick={handlePredictClick} className="text-red-800 underline font-medium shrink-0">
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
                                    onClick={() => handleTabChange(tab.id)}
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
                        <button
                            type="button"
                            onClick={() => void handleDownloadImage()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors mr-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={openHeatmapSettings}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                                showSettings ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900',
                            )}
                        >
                            {TAB_ICONS.settings}
                            Settings
                        </button>
                    </div>
                </div>

                {/* Layer toggles — only on Heatmap and Gaze Paths tabs */}
                {!isVideo && (activeTab === 'heatmap' || activeTab === 'gaze-paths') && (
                    <LayerToggles
                        layers={layers}
                        hasHeatmap={hasHeatmap}
                        displayAutoAois={displayAutoAois}
                        computedAois={computedAois}
                        gazeRoutes={gazeRoutes}
                        onToggleLayer={toggleLayer}
                        onApplyComposite={applyCompositeLayers}
                    />
                )}

                {/* Map mode control bar — unified for image and video */}
                {showMapModeControls && activeTab === 'heatmap' && (
                    <MapModeControlBar
                        mapMode={mapMode}
                        settings={settings}
                        isAoiEditMode={!isVideo && isAoiEditMode}
                        heatmapViewSummary={heatmapViewSummary}
                        onMapModeChange={handleMapModeChange}
                        onPresetChange={handlePresetChange}
                        onOpenSettings={openHeatmapSettings}
                    />
                )}

                {/* Gaze route toggles */}
                {!isVideo && layers.gaze && gazeRoutes.length > 0 && activeTab === 'gaze-paths' && (
                    <GazeRouteBar
                        gazeRoutes={gazeRoutes}
                        gazeMode={gazeMode}
                        visibleRoutes={visibleRoutes}
                        hasHeatmap={hasHeatmap}
                        onGazeModeChange={setGazeMode}
                        onToggleRoute={toggleGazeRoute}
                    />
                )}

                {/* AOI Editor toolbar */}
                {!isVideo && isAoiEditMode && (
                    <AoiEditorToolbar
                        drawingAoi={drawingAoi}
                        onToggleDrawing={() => setDrawingAoi(prev => !prev)}
                        aoiSkipped={aoiSkipped}
                        aoiList={aoiList}
                        onAoiSkippedChange={onAoiSkippedChange}
                        onShowSkipConfirm={() => { setSkipConfirmAction('gate-only'); setShowSkipConfirm(true); }}
                        griddedAOIs={griddedAOIs}
                        computedAois={computedAois}
                        isSavingAois={isSavingAois}
                        onImportGridded={(imported) => { setAoiList(imported); void persistAois(imported); }}
                    />
                )}

                {/* Content — flex viewport */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4" ref={tabContentRef}>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        {/* Video layout */}
                        {isVideo && (
                            <div className="relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border bg-black">
                                <video
                                    src={imageUrl}
                                    controls={activeTab === 'original'}
                                    muted
                                    className="max-w-full max-h-full block"
                                    style={{ display: (activeTab === 'heatmap' && videoFrames.length > 0) ? 'none' : 'block' }}
                                />
                                {activeTab === 'heatmap' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <VideoOverlayContent
                                            videoFrames={videoFrames}
                                            imageUrl={imageUrl}
                                            heatmapData={heatmapData}
                                            settings={settings}
                                            mapMode={mapMode}
                                            spotlightSettings={spotlightSettings}
                                            coldSettings={coldSettings}
                                            videoProgress={videoProgress}
                                            onProcessVideo={onProcessVideo}
                                            onDismissVideoProgress={onDismissVideoProgress}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Image layout — unified viewport */}
                        {!isVideo && (
                            <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden">
                                <TransformWrapper
                                    minScale={1}
                                    maxScale={5}
                                    wheel={{ step: 0.15 }}
                                    centerOnInit
                                    limitToBounds
                                    panning={{ disabled: isAoiEditMode && drawingAoi }}
                                >
                                    <div className={cn(
                                        'rounded-lg border overflow-hidden relative',
                                        layers.gaze ? 'bg-gray-900' : 'bg-gray-100',
                                    )}>
                                        <ZoomControls />
                                        <TransformComponent
                                            wrapperStyle={{ width: '100%' }}
                                            contentStyle={STIMULUS_TRANSFORM_CONTENT_STYLE}
                                        >
                                            <StimulusOverlayFrame
                                                containerRef={isAoiEditMode ? aoiContainerRef : undefined}
                                                maxDisplayHeightPx={stableMaxHeight}
                                                onMouseDown={isAoiEditMode && drawingAoi ? (e) => {
                                                    e.preventDefault();
                                                    const container = aoiContainerRef.current;
                                                    if (!container) return;
                                                    const pos = getMousePercent(e, container);
                                                    setAoiStart(pos);
                                                    setAoiCurrent({ x: pos.x, y: pos.y, w: 0, h: 0 });
                                                } : undefined}
                                                className={isAoiEditMode && drawingAoi ? 'cursor-crosshair' : undefined}
                                                dimOverlay={layers.gaze && gazeMode === 'static'}
                                            >
                                                {showBaseImage && (
                                                    <>
                                                        <img src={imageUrl} alt={title} className={STIMULUS_MEDIA_FIT_FLEX_CLASS} />
                                                        {isPredicting && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none animate-pulse">
                                                                <p className="text-white text-sm bg-black/60 px-4 py-2 rounded-lg">
                                                                    Generando heatmap… {predictElapsed}s
                                                                </p>
                                                            </div>
                                                        )}
                                                        {!isPredicting && layers.heatmap && !hasHeatmap && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                                                <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg">
                                                                    Genera el heatmap para ver la predicción TranSalNet
                                                                </p>
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {hasHeatmap && (
                                                    <div
                                                        key={effectiveMapMode}
                                                        className={showHeatmapLayer ? 'block' : 'hidden'}
                                                        aria-hidden={!showHeatmapLayer}
                                                    >
                                                        {effectiveMapMode === 'spotlight' ? (
                                                            <SpotlightRenderer
                                                                imageUrl={imageUrl} data={heatmapData}
                                                                blur={spotlightSettings.blur} reveal={spotlightSettings.reveal}
                                                                dim={spotlightSettings.dim} threshold={heatmapThreshold}
                                                                borderless fitMaxHeightPx={stableMaxHeight}
                                                                canvasClassName={STIMULUS_MEDIA_FIT_FLEX_CLASS}
                                                            />
                                                        ) : effectiveMapMode === 'cold' ? (
                                                            <ColdMapRenderer
                                                                imageUrl={imageUrl} data={heatmapData}
                                                                intensity={coldSettings.intensity} blur={coldSettings.blur}
                                                                threshold={coldSettings.threshold}
                                                                borderless fitMaxHeightPx={stableMaxHeight}
                                                                canvasClassName={STIMULUS_MEDIA_FIT_FLEX_CLASS}
                                                            />
                                                        ) : (
                                                            <HeatmapRenderer
                                                                imageUrl={imageUrl} data={heatmapData}
                                                                blur={heatmapBlur} opacity={heatmapOpacity}
                                                                threshold={heatmapThreshold}
                                                                granularity={heatmapGranularity}
                                                                visualProfile={heatmapVisualProfile}
                                                                borderless fitMaxHeightPx={stableMaxHeight}
                                                                canvasClassName={STIMULUS_MEDIA_FIT_FLEX_CLASS}
                                                            />
                                                        )}
                                                    </div>
                                                )}

                                                {layers.aiAois && displayAutoAois.length > 0 && (
                                                    <AiAoiOverlay autoAois={displayAutoAois} importedLabels={importedAiLabels} />
                                                )}

                                                {layers.manualAois && computedAois.map((aoi, i) => {
                                                    const color = AOI_COLORS[i % AOI_COLORS.length];
                                                    if (isAoiEditMode) {
                                                        return (
                                                            <AoiRectEditor
                                                                key={aoi.id} aoi={aoi} color={color}
                                                                percentage={aoi.percentage}
                                                                selected={selectedAoiId === aoi.id}
                                                                onSelect={() => setSelectedAoiId(aoi.id)}
                                                                onChange={updateAoi}
                                                                containerRef={aoiContainerRef}
                                                            />
                                                        );
                                                    }
                                                    return (
                                                        <div
                                                            key={aoi.id}
                                                            className="absolute pointer-events-none border-2 rounded-sm"
                                                            style={{
                                                                left: `${aoi.x}%`, top: `${aoi.y}%`,
                                                                width: `${aoi.width}%`, height: `${aoi.height}%`,
                                                                borderColor: color, backgroundColor: `${color}22`,
                                                            }}
                                                        />
                                                    );
                                                })}

                                                {isAoiEditMode && aoiCurrent && aoiCurrent.w > 0 && (
                                                    <div
                                                        className="absolute pointer-events-none border-2 border-dashed border-blue-500"
                                                        style={{
                                                            left: `${aoiCurrent.x}%`, top: `${aoiCurrent.y}%`,
                                                            width: `${aoiCurrent.w}%`, height: `${aoiCurrent.h}%`,
                                                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                                        }}
                                                    />
                                                )}

                                                {layers.gaze && gazeMode === 'static' && gazeRoutes.map(route => (
                                                    <GazePathOverlay
                                                        key={route.id}
                                                        gazePath={route.fixations}
                                                        visible={visibleRoutes.has(route.id)}
                                                        routeColor={ROUTE_COLORS[route.id] ?? '#8B5CF6'}
                                                        markerId={route.id}
                                                    />
                                                ))}

                                                {layers.gaze && gazeMode === 'animated' && animatedGazePath.length > 0 && (
                                                    <GazeScanpathPlayer
                                                        imageUrl={imageUrl}
                                                        gazePath={animatedGazePath}
                                                        duration={5}
                                                        routeColor={ROUTE_COLORS[primaryGazeRoute?.id ?? 'typical-scan']}
                                                        className="absolute inset-0 w-full h-full"
                                                        transparent
                                                    />
                                                )}
                                            </StimulusOverlayFrame>
                                        </TransformComponent>
                                    </div>
                                </TransformWrapper>
                            </div>
                        )}
                    </div>

                    {isAoiEditMode && isPredicting && (
                        <p className="mt-2 shrink-0 text-xs text-indigo-600">
                            Regenerando heatmap ({predictElapsed}s). Los % se actualizan al mover zonas; el mapa se refrescará al terminar.
                        </p>
                    )}
                    {isAoiEditMode && computedAois.length > 0 && (
                        <AoiChipList
                            computedAois={computedAois}
                            selectedAoiId={selectedAoiId}
                            editingLabelId={editingLabelId}
                            editingLabelValue={editingLabelValue}
                            onSelect={setSelectedAoiId}
                            onStartEdit={(id, label) => { setEditingLabelId(id); setEditingLabelValue(label); }}
                            onEditChange={setEditingLabelValue}
                            onCommitEdit={updateAoiLabel}
                            onCancelEdit={() => setEditingLabelId(null)}
                            onRemove={removeAoi}
                        />
                    )}
                </div>
            </div>

            {showNameModal && createPortal(
                <AoiNameModal
                    label={pendingLabel}
                    onLabelChange={setPendingLabel}
                    onConfirm={confirmPendingAoi}
                    onCancel={() => { setShowNameModal(false); setPendingRect(null); }}
                />,
                document.body,
            )}

            {showSkipConfirm && createPortal(
                <SkipAoiConfirmModal
                    onCancel={() => setShowSkipConfirm(false)}
                    onConfirm={() => {
                        setShowSkipConfirm(false);
                        onAoiSkippedChange?.(true);
                        if (skipConfirmAction === 'predict') onRunPrediction?.(aoiList);
                    }}
                />,
                document.body,
            )}

            {showSettings && createPortal(
                <HeatmapSettingsModal
                    imageUrl={imageUrl}
                    heatmapData={heatmapData}
                    settings={settings}
                    mapMode={mapMode}
                    spotlightSettings={spotlightSettings}
                    coldSettings={coldSettings}
                    onLiveChange={applyHeatmapViewSettings}
                    onConfirm={confirmHeatmapSettings}
                    onCancel={cancelHeatmapSettings}
                />,
                document.body,
            )}
        </>
    );
};

/* ═══════════════════════════════════════════════════════════════
   Private sub-components — extracted to flatten the main render
   ═══════════════════════════════════════════════════════════════ */

const CardHeader = ({
    title, onAddMore, onDelete, isDeleting, headerExtra,
    onRunPrediction, isVideo, isPredicting, predictElapsed, hasHeatmap,
    predictionGateOpen, onPredictClick, heatmapStale,
    onRunAnalysis, isAnalyzing, analyzeElapsed, analysisGateOpen, aiAnalysis, onAnalysisClick,
}: {
    title: string;
    onAddMore?: () => void;
    onDelete?: () => void;
    isDeleting: boolean;
    headerExtra?: ReactNode;
    onRunPrediction?: (aois: ManualAOI[]) => void;
    isVideo: boolean;
    isPredicting: boolean;
    predictElapsed: number;
    hasHeatmap: boolean;
    predictionGateOpen: boolean;
    onPredictClick: () => void;
    heatmapStale: boolean;
    onRunAnalysis?: (aois: ManualAOI[]) => void;
    isAnalyzing: boolean;
    analyzeElapsed: number;
    analysisGateOpen: boolean;
    aiAnalysis?: AiAnalysisResult;
    onAnalysisClick: () => void;
}) => (
    <div className="p-4 border-b flex items-start justify-between">
        <div>
            <h4 className="font-semibold text-base">{title}</h4>
            <p className="text-sm text-gray-500 mt-0.5">Prediction of visual attention</p>
        </div>
        <div className="flex items-center gap-1">
            {onAddMore && (
                <button type="button" onClick={onAddMore} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Add more images or videos">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            )}
            {onDelete && (
                <button type="button" onClick={onDelete} disabled={isDeleting} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50" title="Remove stimulus">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
            {headerExtra}
            {onRunPrediction && !isVideo && (
                <button
                    type="button"
                    onClick={onPredictClick}
                    disabled={isPredicting}
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                        heatmapStale
                            ? 'text-white bg-amber-500 hover:bg-amber-600'
                            : hasHeatmap ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' : 'text-white bg-indigo-600 hover:bg-indigo-700',
                        isPredicting && 'opacity-50 cursor-not-allowed',
                    )}
                    title={!predictionGateOpen ? 'Define al menos una zona o continúa sin zonas' : hasHeatmap ? 'Regenerar heatmap TranSalNet' : 'Generar heatmap TranSalNet'}
                >
                    {isPredicting
                        ? `Generando heatmap... ${predictElapsed}s`
                        : heatmapStale
                            ? 'Recalcular con zonas actuales'
                            : hasHeatmap ? 'Regenerar heatmap' : 'Generar heatmap'}
                </button>
            )}
            {onRunAnalysis && (
                <button
                    type="button"
                    onClick={onAnalysisClick}
                    disabled={isAnalyzing || !analysisGateOpen}
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                        aiAnalysis ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' : 'text-white bg-blue-600 hover:bg-blue-700',
                        (isAnalyzing || !analysisGateOpen) && 'opacity-50 cursor-not-allowed',
                    )}
                    title={!analysisGateOpen ? (!hasHeatmap ? 'Genera el heatmap antes del análisis IA' : 'Define al menos una zona o continúa sin zonas') : aiAnalysis ? 'Re-ejecutar análisis IA' : 'Ejecutar análisis IA'}
                >
                    <svg className={cn("h-3.5 w-3.5", isAnalyzing && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        {isAnalyzing
                            ? <><circle className="opacity-25" cx="12" cy="12" r="10" /><path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" stroke="none" /></>
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        }
                    </svg>
                    {isAnalyzing ? `Analizando... ${analyzeElapsed}s` : aiAnalysis ? 'Re-analizar' : 'Análisis IA'}
                </button>
            )}
        </div>
    </div>
);

const LayerToggles = ({
    layers, hasHeatmap, displayAutoAois, computedAois, gazeRoutes,
    onToggleLayer, onApplyComposite,
}: {
    layers: StimulusLayers;
    hasHeatmap: boolean;
    displayAutoAois: unknown[];
    computedAois: unknown[];
    gazeRoutes: unknown[];
    onToggleLayer: (key: keyof StimulusLayers) => void;
    onApplyComposite: () => void;
}) => (
    <div className="px-4 py-2 border-b bg-white flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mr-1">Capas</span>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={layers.heatmap} disabled={!hasHeatmap} onChange={() => onToggleLayer('heatmap')} className="rounded border-gray-300" />
            Heatmap
        </label>
        {displayAutoAois.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={layers.aiAois} onChange={() => onToggleLayer('aiAois')} className="rounded border-gray-300" />
                Zonas IA
            </label>
        )}
        {computedAois.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={layers.manualAois} onChange={() => onToggleLayer('manualAois')} className="rounded border-gray-300" />
                Zonas manuales
            </label>
        )}
        {gazeRoutes.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={layers.gaze} onChange={() => onToggleLayer('gaze')} className="rounded border-gray-300" />
                Rutas de mirada
            </label>
        )}
        {(hasHeatmap || gazeRoutes.length > 0) && (
            <button type="button" onClick={onApplyComposite} className="ml-1 px-2 py-0.5 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
                Vista completa
            </button>
        )}
    </div>
);

const GazeRouteBar = ({
    gazeRoutes, gazeMode, visibleRoutes, hasHeatmap,
    onGazeModeChange, onToggleRoute,
}: {
    gazeRoutes: Array<{ id: string; name: string; description: string; fixations: unknown[] }>;
    gazeMode: 'static' | 'animated';
    visibleRoutes: Set<string>;
    hasHeatmap: boolean;
    onGazeModeChange: (m: 'static' | 'animated') => void;
    onToggleRoute: (id: string) => void;
}) => (
    <div className="px-4 py-2 border-b bg-slate-50 flex items-center gap-2 flex-wrap">
        {hasHeatmap && (
            <div className="flex items-center gap-1 mr-2">
                {(['static', 'animated'] as const).map(m => (
                    <button
                        key={m} type="button"
                        onClick={() => onGazeModeChange(m)}
                        className={cn(
                            'px-2.5 py-1 text-xs font-medium rounded transition-colors capitalize',
                            gazeMode === m ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
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
                {gazeRoutes.map(route => {
                    const color = ROUTE_COLORS[route.id] ?? '#8B5CF6';
                    const active = visibleRoutes.has(route.id);
                    return (
                        <button
                            key={route.id} type="button"
                            onClick={() => onToggleRoute(route.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-all',
                                active ? 'text-white' : 'bg-white text-gray-500 border-gray-200 opacity-50',
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
        {gazeMode === 'static' && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 w-full sm:w-auto">
                {GAZE_ROUTE_LEGEND.filter(item => gazeRoutes.some(r => r.id === item.id)).map(item => (
                    <span key={item.id} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        {item.label}
                    </span>
                ))}
            </div>
        )}
    </div>
);

const AoiEditorToolbar = ({
    drawingAoi, onToggleDrawing, aoiSkipped, aoiList, onAoiSkippedChange,
    onShowSkipConfirm, griddedAOIs, computedAois, isSavingAois, onImportGridded,
}: {
    drawingAoi: boolean;
    onToggleDrawing: () => void;
    aoiSkipped: boolean;
    aoiList: ManualAOI[];
    onAoiSkippedChange?: (v: boolean) => void;
    onShowSkipConfirm: () => void;
    griddedAOIs?: Array<{ label: string; x: number; y: number; width: number; height: number; attention: number; rank: number }>;
    computedAois: AOIWithStats[];
    isSavingAois: boolean;
    onImportGridded: (imported: ManualAOI[]) => void;
}) => (
    <div className="px-4 py-3 border-b bg-slate-50 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
            <button
                type="button"
                onClick={onToggleDrawing}
                className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                    drawingAoi ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                )}
            >
                {drawingAoi ? 'Dibujando zona...' : '+ Crear zona manual'}
            </button>
            {!aoiSkipped && aoiList.length === 0 && onAoiSkippedChange && (
                <button type="button" onClick={onShowSkipConfirm}
                    className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors">
                    Continuar sin zonas
                </button>
            )}
            {aoiSkipped && (
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">Sin zonas definidas</span>
            )}
            {griddedAOIs && griddedAOIs.length > 0 && computedAois.length === 0 && (
                <button
                    type="button"
                    onClick={() => {
                        const imported: ManualAOI[] = griddedAOIs.map((g, i) => ({
                            id: `grid-${Date.now()}-${i}`,
                            label: g.label, x: g.x, y: g.y, width: g.width, height: g.height,
                            source: 'imported-grid' as const,
                        }));
                        onImportGridded(imported);
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
    </div>
);

const AoiChipList = ({
    computedAois, selectedAoiId, editingLabelId, editingLabelValue,
    onSelect, onStartEdit, onEditChange, onCommitEdit, onCancelEdit, onRemove,
}: {
    computedAois: AOIWithStats[];
    selectedAoiId: string | null;
    editingLabelId: string | null;
    editingLabelValue: string;
    onSelect: (id: string) => void;
    onStartEdit: (id: string, label: string) => void;
    onEditChange: (v: string) => void;
    onCommitEdit: (id: string, label: string) => void;
    onCancelEdit: () => void;
    onRemove: (id: string) => void;
}) => (
    <div className="mt-2 flex shrink-0 flex-wrap gap-2">
        {computedAois.map((aoi, i) => {
            const color = AOI_COLORS[i % AOI_COLORS.length];
            const isEditing = editingLabelId === aoi.id;
            return (
                <div
                    key={aoi.id}
                    className={cn(
                        'flex items-center gap-2 px-2.5 py-1.5 bg-white border rounded-lg text-xs',
                        selectedAoiId === aoi.id && 'ring-2 ring-blue-400',
                    )}
                    onClick={() => onSelect(aoi.id)}
                >
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    {isEditing ? (
                        <input
                            value={editingLabelValue}
                            onChange={(e) => onEditChange(e.target.value)}
                            onBlur={() => onCommitEdit(aoi.id, editingLabelValue)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onCommitEdit(aoi.id, editingLabelValue);
                                if (e.key === 'Escape') onCancelEdit();
                                if (e.key === 'Backspace' || e.key === 'Delete') e.stopPropagation();
                            }}
                            className="w-24 px-1 py-0.5 border rounded text-xs"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            className="font-medium text-gray-700 cursor-text"
                            onDoubleClick={(e) => { e.stopPropagation(); onStartEdit(aoi.id, aoi.label); }}
                        >
                            {aoi.label}
                        </span>
                    )}
                    <span className="font-semibold" style={{ color }} title={`~${estimateExposureTime(aoi.percentage)} exposición estimada`}>
                        {aoi.percentage}%
                    </span>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(aoi.id); }}
                        className="text-gray-400 hover:text-red-500 ml-0.5"
                    >
                        ×
                    </button>
                </div>
            );
        })}
    </div>
);

const AoiNameModal = ({
    label, onLabelChange, onConfirm, onCancel,
}: {
    label: string;
    onLabelChange: (v: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Nombre de la zona</h3>
            <input
                value={label}
                onChange={(e) => onLabelChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onConfirm();
                    if (e.key === 'Escape') onCancel();
                    if (e.key === 'Backspace' || e.key === 'Delete') e.stopPropagation();
                }}
            />
            <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancelar</button>
                <button type="button" onClick={onConfirm} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">Guardar zona</button>
            </div>
        </div>
    </div>
);

const SkipAoiConfirmModal = ({
    onCancel, onConfirm,
}: {
    onCancel: () => void;
    onConfirm: () => void;
}) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Continuar sin zonas</h3>
            <p className="text-sm text-gray-600 mb-4">
                No has definido AOIs. Puedes generar el heatmap igualmente, pero el análisis IA tendrá menos contexto espacial.
            </p>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancelar</button>
                <button type="button" onClick={onConfirm} className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md">Continuar sin zonas</button>
            </div>
        </div>
    </div>
);
