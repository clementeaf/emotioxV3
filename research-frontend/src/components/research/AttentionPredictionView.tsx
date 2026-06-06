import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PanelRightOpen, PanelRightClose, Sparkles, Settings2, RotateCw } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { type Research, researchService } from '../../services/research.service';
import { researchKeys } from '../../hooks/useResearchQuery';
import { FileUploadAdvanced, type UploadedFile } from '../ui/FileUploadAdvanced';
import { AttentionPredictionCard } from './AttentionPredictionCard';
import { Save, Trash2 } from 'lucide-react';
import { AiAnalysisPanel } from './AiAnalysisPanel';
import { mediaService, resolveMediaUrl } from '../../services/media.service';
import { extractVideoFrames } from '../../utils/extractVideoFrames';
import type { AiAnalysisResult } from '../../types/aiAnalysis.types';
import type { ManualAOI } from '../../types/attentionPrediction.types';
import { isNewAttentionStimulus } from '../../utils/attentionPrediction.utils';
import {
    CRITERIA_PRESETS_KEY,
    DEFAULT_ATTENTION_CRITERIA,
    DEFAULT_CRITERIA_PRESETS,
    LEGACY_PROMPT_PRESETS_KEY,
    RECOMMENDED_CRITERIA_TEMPLATE,
} from '../../constants/attentionPredictionCriteria';

interface VideoFrame {
    mediaId: string;
    timestamp: number;
    heatmapData?: Array<{ x: number; y: number; value: number }>;
}

interface StimulusItem {
    url: string;
    mediaId: string;
    name: string;
    heatmapData?: Array<{ x: number; y: number; value: number }>;
    processedAt?: string;
    predictionError?: string;
    predictionErrorAt?: string;
    /** Video stimulus: true when the original file is a video */
    isVideo?: boolean;
    /** Per-frame predictions for video stimuli */
    frames?: VideoFrame[];
    /** AI analysis result from GPT-4o Vision */
    aiAnalysis?: Record<string, unknown>;
    aiAnalysisError?: string;
    /** Auto-presets from prediction pipeline */
    autoPresets?: { blur: number; opacity: number; threshold: number };
    /** Gridded AOIs detected from saliency map */
    griddedAOIs?: Array<{ label: string; x: number; y: number; width: number; height: number; attention: number; rank: number }>;
    /** Temporal grid — per-cell attention time series for video */
    temporalGrid?: Array<{ label: string; row: number; col: number; timeSeries: number[] }>;
    /** Video prediction metadata */
    videoPredictionMeta?: { totalFrames: number; failedFrames: number; processingTimeMs: number; fps: number };
    /** Manual AOIs drawn by researcher */
    aois?: ManualAOI[];
    aoiSkipped?: boolean;
}

interface AttentionPredictionViewProps {
    research: Research;
    stimulusId: string;
}

const DEFAULT_ATTENTION_PROMPT = DEFAULT_ATTENTION_CRITERIA;

/**
 * View for Attention Prediction — upload stimuli, define AOIs, predict heatmap, optional AI analysis.
 */
export const AttentionPredictionView = ({ research, stimulusId }: AttentionPredictionViewProps) => {
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPredicting, setIsPredicting] = useState(false);
    const [analyzeElapsed, setAnalyzeElapsed] = useState(0);
    const [predictElapsed, setPredictElapsed] = useState(0);
    const analyzeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const predictTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [aiPanelOpen, setAiPanelOpen] = useState(true);
    const [pendingImportAois, setPendingImportAois] = useState<AiAnalysisResult['autoAois'] | undefined>(undefined);

    // Video prediction state
    const [videoProgress, setVideoProgress] = useState<{
        phase: 'extracting' | 'uploading' | 'predicting' | 'accumulating' | 'hybrid' | 'complete' | 'error';
        current: number;
        total: number;
        message: string;
    } | null>(null);
    const videoSSERef = useRef<EventSource | null>(null);

    // Cleanup SSE on unmount
    useEffect(() => {
        return () => { videoSSERef.current?.close(); };
    }, []);

    // Prompt editor state
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [promptDraft, setPromptDraft] = useState('');
    const [isSavingPrompt, setIsSavingPrompt] = useState(false);

    const savedPrompt = useMemo(() => {
        const settings = research.settings as Record<string, unknown> | undefined;
        return (typeof settings?.attentionPrompt === 'string' ? settings.attentionPrompt : '') as string;
    }, [research.settings]);

    useEffect(() => {
        setPromptDraft(savedPrompt || DEFAULT_ATTENTION_PROMPT);
    }, [savedPrompt]);

    const handleSavePrompt = useCallback(async () => {
        setIsSavingPrompt(true);
        try {
            const value = promptDraft.trim() === DEFAULT_ATTENTION_PROMPT.trim() ? '' : promptDraft.trim();
            await researchService.update(research.id, {
                settings: { ...(research.settings as Record<string, unknown> || {}), attentionPrompt: value },
            });
            queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
        } finally {
            setIsSavingPrompt(false);
        }
    }, [promptDraft, research.id, research.settings, queryClient]);

    const isPromptModified = promptDraft.trim() !== (savedPrompt || DEFAULT_ATTENTION_PROMPT).trim();

    // Prompt presets — stored in localStorage, shared across all studies
    const [presets, setPresets] = useState<Array<{ name: string; prompt: string }>>(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(CRITERIA_PRESETS_KEY) || '[]') as Array<{ name: string; prompt: string }>;
            if (stored.length > 0) return stored;
            const legacy = JSON.parse(localStorage.getItem(LEGACY_PROMPT_PRESETS_KEY) || '[]') as Array<{ name: string; prompt: string }>;
            if (legacy.length > 0) {
                localStorage.setItem(CRITERIA_PRESETS_KEY, JSON.stringify(legacy));
                return legacy;
            }
            return DEFAULT_CRITERIA_PRESETS;
        } catch {
            return DEFAULT_CRITERIA_PRESETS;
        }
    });
    const [newPresetName, setNewPresetName] = useState('');
    const [showSavePreset, setShowSavePreset] = useState(false);

    const savePreset = useCallback((name: string, prompt: string) => {
        const updated = [...presets.filter(p => p.name !== name), { name, prompt }];
        setPresets(updated);
        localStorage.setItem(CRITERIA_PRESETS_KEY, JSON.stringify(updated));
        setNewPresetName('');
        setShowSavePreset(false);
    }, [presets]);

    const deletePreset = useCallback((name: string) => {
        const updated = presets.filter(p => p.name !== name);
        setPresets(updated);
        localStorage.setItem(CRITERIA_PRESETS_KEY, JSON.stringify(updated));
    }, [presets]);

    const stimuli = useMemo(() => {
        const settings = (research.settings as { stimuli?: StimulusItem[] }) || {};
        return settings.stimuli || [];
    }, [research.settings]);

    const rawActiveStimulus = stimuli.find(s => s.mediaId === stimulusId) || stimuli[0];
    // Derive isVideo from name if not explicitly set (backwards compat for stimuli saved before v0.76.0)
    const activeStimulus = rawActiveStimulus ? {
        ...rawActiveStimulus,
        isVideo: rawActiveStimulus.isVideo ?? /\.(mp4|webm|mov|quicktime)$/i.test(rawActiveStimulus.name),
    } : undefined;
    const aiAnalysis = activeStimulus?.aiAnalysis as AiAnalysisResult | undefined;
    const hasAnalysis = Boolean(aiAnalysis);

    const persistStimuli = useCallback(async (updated: StimulusItem[]) => {
        await researchService.update(research.id, {
            settings: {
                ...(research.settings as Record<string, unknown> || {}),
                stimuli: updated,
                stimulusUrl: updated[0]?.url,
                stimulusMediaId: updated[0]?.mediaId,
            },
        });
        queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
    }, [research.id, research.settings, queryClient]);

    const startAnalyzeTimer = useCallback(() => {
        setAnalyzeElapsed(0);
        if (analyzeTimerRef.current) clearInterval(analyzeTimerRef.current);
        analyzeTimerRef.current = setInterval(() => setAnalyzeElapsed(prev => prev + 1), 1000);
    }, []);

    const stopAnalyzeTimer = useCallback(() => {
        if (analyzeTimerRef.current) {
            clearInterval(analyzeTimerRef.current);
            analyzeTimerRef.current = null;
        }
    }, []);

    const startPredictTimer = useCallback(() => {
        setPredictElapsed(0);
        if (predictTimerRef.current) clearInterval(predictTimerRef.current);
        predictTimerRef.current = setInterval(() => setPredictElapsed(prev => prev + 1), 1000);
    }, []);

    const stopPredictTimer = useCallback(() => {
        if (predictTimerRef.current) {
            clearInterval(predictTimerRef.current);
            predictTimerRef.current = null;
        }
    }, []);

    const runPrediction = useCallback(async (mediaId: string) => {
        setIsPredicting(true);
        startPredictTimer();
        try {
            await mediaService.predictAttention(research.id, mediaId);
            queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
        } catch {
            // Error persisted on stimulus by backend; user can retry
        } finally {
            stopPredictTimer();
            setIsPredicting(false);
        }
    }, [research.id, queryClient, startPredictTimer, stopPredictTimer]);

    const runAnalysis = useCallback(async (mediaId: string, manualAois?: ManualAOI[]) => {
        setIsProcessing(true);
        startAnalyzeTimer();
        try {
            const aoiPayload = manualAois?.map(a => ({
                label: a.label,
                x: a.x,
                y: a.y,
                width: a.width,
                height: a.height,
            }));
            await mediaService.analyzeAttention(research.id, mediaId, aoiPayload);
            queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
        } catch {
            // User can retry via header button
        } finally {
            stopAnalyzeTimer();
            setIsProcessing(false);
        }
    }, [research.id, queryClient, startAnalyzeTimer, stopAnalyzeTimer]);

    const handleAoiSkippedChange = useCallback(async (skipped: boolean, mediaId: string) => {
        const updated = stimuli.map(s =>
            s.mediaId === mediaId ? { ...s, aoiSkipped: skipped } : s,
        );
        await persistStimuli(updated);
    }, [stimuli, persistStimuli]);
    const processVideoStimulus = useCallback(async (videoStimulus: StimulusItem, videoUrl: string) => {
        try {
            // Phase 1: Extract frames at 1fps (client-side Canvas API)
            setVideoProgress({ phase: 'extracting', current: 0, total: 0, message: 'Extracting video frames...' });
            const extracted = await extractVideoFrames(
                videoUrl,
                2,   // 1 frame every 2s
                60,  // max 60 frames (2 min)
                (progress) => setVideoProgress(prev => prev ? { ...prev, current: Math.round(progress * 100), total: 100 } : null),
            );

            if (extracted.length === 0) {
                setVideoProgress({ phase: 'error', current: 0, total: 0, message: 'No frames extracted from video' });
                return;
            }

            // Phase 2: Upload each frame as individual media
            setVideoProgress({ phase: 'uploading', current: 0, total: extracted.length, message: `Uploading frames (0/${extracted.length})...` });
            const uploadedFrames: Array<{ mediaId: string; timestamp: number }> = [];

            for (let i = 0; i < extracted.length; i++) {
                const frame = extracted[i];
                const file = new File([frame.blob], `frame-${i}-${frame.timestamp.toFixed(1)}s.png`, { type: 'image/png' });
                const { mediaId } = await mediaService.uploadFile(research.id, file);
                uploadedFrames.push({ mediaId, timestamp: frame.timestamp });
                setVideoProgress({ phase: 'uploading', current: i + 1, total: extracted.length, message: `Uploading frames (${i + 1}/${extracted.length})...` });
            }

            // Phase 3: Start backend video prediction
            setVideoProgress({ phase: 'predicting', current: 0, total: extracted.length, message: 'Starting prediction...' });
            const { jobId } = await mediaService.startVideoPrediction(
                research.id,
                videoStimulus.mediaId,
                uploadedFrames,
            );

            // Phase 4: Listen to SSE for progress
            const sse = mediaService.connectVideoSSE(research.id, jobId);
            videoSSERef.current = sse;

            sse.addEventListener('frame-complete', (e: MessageEvent) => {
                const data = JSON.parse(e.data);
                setVideoProgress({
                    phase: 'predicting',
                    current: (data.frameIndex ?? 0) + 1,
                    total: data.totalFrames,
                    message: `Predicting frame ${(data.frameIndex ?? 0) + 1}/${data.totalFrames}...`,
                });
            });
            sse.addEventListener('frame-error', (e: MessageEvent) => {
                const data = JSON.parse(e.data);
                setVideoProgress(prev => prev ? {
                    ...prev,
                    current: (data.frameIndex ?? 0) + 1,
                    message: `Frame ${(data.frameIndex ?? 0) + 1} failed, continuing...`,
                } : null);
            });
            sse.addEventListener('accumulating', () => {
                setVideoProgress(prev => prev ? { ...prev, phase: 'accumulating', message: 'Computing accumulated heatmap...' } : null);
            });
            sse.addEventListener('hybrid', () => {
                setVideoProgress(prev => prev ? { ...prev, phase: 'hybrid', message: 'Running semantic saliency fusion...' } : null);
            });
            sse.addEventListener('complete', (e: MessageEvent) => {
                const data = JSON.parse(e.data);
                setVideoProgress({
                    phase: 'complete',
                    current: data.totalFrames,
                    total: data.totalFrames,
                    message: `Complete — ${data.totalFrames} frames in ${Math.round((data.processingTimeMs || 0) / 1000)}s`,
                });
                sse.close();
                videoSSERef.current = null;
                queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
                // Auto-clear progress after 5s
                setTimeout(() => setVideoProgress(null), 5000);
            });
            sse.addEventListener('error', (e: Event) => {
                // SSE error event — could be connection loss or backend error
                const msgEvent = e as MessageEvent;
                let errorMsg = 'Video prediction failed';
                try { errorMsg = JSON.parse(msgEvent.data).error || errorMsg; } catch { /* use default */ }
                setVideoProgress({ phase: 'error', current: 0, total: 0, message: errorMsg });
                sse.close();
                videoSSERef.current = null;
            });
        } catch (err) {
            setVideoProgress({
                phase: 'error',
                current: 0,
                total: 0,
                message: err instanceof Error ? err.message : 'Video processing failed',
            });
        }
    }, [research.id, queryClient]);

    const handleFilesChange = useCallback(async (files: UploadedFile[]) => {
        const newStimuli: StimulusItem[] = files
            .filter(f => f.status === 'uploaded' && f.mediaId)
            .map(f => ({
                url: f.url || '',
                mediaId: f.mediaId!,
                name: f.name,
                isVideo: f.type?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(f.name),
            }));

        if (newStimuli.length === 0) return;

        const existingIds = new Set(stimuli.map(s => s.mediaId));
        const merged = [
            ...stimuli,
            ...newStimuli.filter(s => !existingIds.has(s.mediaId)),
        ];

        await persistStimuli(merged);

        // Process each new stimulus
        for (const stimulus of newStimuli) {
            if (stimulus.isVideo) {
                const videoUrl = stimulus.url.startsWith('http') ? stimulus.url : resolveMediaUrl(stimulus.url);
                await processVideoStimulus(stimulus, videoUrl);
            }
        }
    }, [stimuli, persistStimuli, processVideoStimulus]);

    const handleDelete = useCallback(async (mediaId: string) => {
        setIsDeletingId(mediaId);
        try {
            const updated = stimuli.filter(s => s.mediaId !== mediaId);
            await persistStimuli(updated);
        } finally {
            setIsDeletingId(null);
        }
    }, [stimuli, persistStimuli]);

    const showAiPanel = Boolean(activeStimulus);
    const isNewStimulus = activeStimulus
        ? isNewAttentionStimulus(activeStimulus.processedAt, hasAnalysis)
        : false;
    const needsHeatmapRegeneration = Boolean(
        activeStimulus && hasAnalysis && !(activeStimulus.heatmapData?.length),
    );

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left: main content area (scrollable) */}
            <div className="flex-1 min-w-0 p-6 space-y-4 overflow-y-auto">
                {/* Analysis Prompt Drawer */}
                <Drawer
                    isOpen={isPromptOpen}
                    onClose={() => setIsPromptOpen(false)}
                    title="Criterio de análisis"
                    width="lg"
                >
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                            Personaliza el criterio enviado a la IA. Los cambios aplican solo a análisis futuros.
                        </p>

                        <button
                            type="button"
                            onClick={() => {
                                if (promptDraft.trim() && promptDraft.trim() !== RECOMMENDED_CRITERIA_TEMPLATE.trim()) {
                                    if (!window.confirm('¿Reemplazar el criterio actual con la plantilla recomendada?')) return;
                                }
                                setPromptDraft(RECOMMENDED_CRITERIA_TEMPLATE);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Insertar plantilla recomendada
                        </button>

                        <textarea
                            value={promptDraft}
                            onChange={e => setPromptDraft(e.target.value)}
                            rows={20}
                            className="w-full text-sm text-gray-700 border rounded-md p-3 resize-y focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                        />
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPromptDraft(DEFAULT_ATTENTION_PROMPT)}
                                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    <RotateCw className="w-3.5 h-3.5" />
                                    Default
                                </button>
                                {showSavePreset ? (
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="text"
                                            value={newPresetName}
                                            onChange={e => setNewPresetName(e.target.value)}
                                            placeholder="Preset name..."
                                            className="px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 w-36"
                                            autoFocus
                                            onKeyDown={e => { if (e.key === 'Enter' && newPresetName.trim()) savePreset(newPresetName.trim(), promptDraft); if (e.key === 'Escape') setShowSavePreset(false); }}
                                        />
                                        <button
                                            type="button"
                                            disabled={!newPresetName.trim()}
                                            onClick={() => savePreset(newPresetName.trim(), promptDraft)}
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
                                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        Save as preset
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                disabled={!isPromptModified || isSavingPrompt}
                                onClick={() => { void handleSavePrompt(); setIsPromptOpen(false); }}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSavingPrompt ? 'Guardando...' : 'Aplicar al estudio'}
                            </button>
                        </div>

                        {/* Presets — below actions */}
                        {presets.length > 0 && (
                            <div className="pt-2 border-t border-gray-100">
                                <div className="flex flex-wrap gap-1.5">
                                    {presets.map(p => (
                                        <div key={p.name} className="flex items-center gap-0.5">
                                            <button
                                                type="button"
                                                onClick={() => setPromptDraft(p.prompt)}
                                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                                    promptDraft === p.prompt
                                                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                                                }`}
                                            >
                                                {p.name}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deletePreset(p.name)}
                                                className="p-0.5 text-gray-300 hover:text-red-500 transition-colors"
                                                title="Delete preset"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Drawer>

                {activeStimulus && (
                    <>
                        {needsHeatmapRegeneration && (
                            <div className="mb-4 px-4 py-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
                                <span>Este estímulo tiene análisis IA pero no heatmap TranSalNet. Genera el heatmap para ver la predicción real.</span>
                                <button
                                    type="button"
                                    onClick={() => void runPrediction(activeStimulus.mediaId)}
                                    disabled={isPredicting}
                                    className="shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    Regenerar heatmap
                                </button>
                            </div>
                        )}
                        <AttentionPredictionCard
                            imageUrl={activeStimulus.url}
                            title={activeStimulus.name}
                            heatmapData={activeStimulus.heatmapData}
                            onDelete={() => handleDelete(activeStimulus.mediaId)}
                            isDeleting={isDeletingId === activeStimulus.mediaId}
                            researchId={research.id}
                            stimulusMediaId={activeStimulus.mediaId}
                            isVideo={activeStimulus.isVideo}
                            videoFrames={activeStimulus.frames}
                            aiAnalysis={aiAnalysis}
                            pendingImportAois={pendingImportAois}
                            onImportAoisDone={() => setPendingImportAois(undefined)}
                            onAddMore={() => setShowUploadModal(true)}
                            onRunAnalysis={(aois) => void runAnalysis(activeStimulus.mediaId, aois)}
                            onRunPrediction={() => void runPrediction(activeStimulus.mediaId)}
                            isPredicting={isPredicting}
                            predictElapsed={predictElapsed}
                            predictionError={activeStimulus.predictionError}
                            initialTab={isNewStimulus ? 'aoi-editor' : undefined}
                            onOpenCriteria={() => setIsPromptOpen(true)}
                            aoiSkipped={Boolean(activeStimulus.aoiSkipped)}
                            onAoiSkippedChange={(skipped) => void handleAoiSkippedChange(skipped, activeStimulus.mediaId)}
                            autoPresets={activeStimulus.autoPresets as { blur: number; opacity: number; threshold: number } | undefined}
                            griddedAOIs={activeStimulus.griddedAOIs}
                            isAnalyzing={isProcessing}
                            analyzeElapsed={analyzeElapsed}
                            onProcessVideo={activeStimulus.isVideo ? () => {
                                const videoUrl = activeStimulus.url.startsWith('http') ? activeStimulus.url : resolveMediaUrl(activeStimulus.url);
                                void processVideoStimulus(activeStimulus, videoUrl);
                            } : undefined}
                            videoProgress={videoProgress}
                            onDismissVideoProgress={() => setVideoProgress(null)}
                            headerExtra={
                                <button
                                    type="button"
                                    onClick={() => setIsPromptOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-gray-50 text-gray-600 hover:bg-gray-100"
                                    title="Editar criterio de análisis"
                                >
                                    <Settings2 className="w-3.5 h-3.5" />
                                    Criterio
                                    {savedPrompt && (
                                        <span className="text-[10px] px-1 py-0.5 bg-blue-50 text-blue-600 rounded font-medium leading-none">Personalizado</span>
                                    )}
                                </button>
                            }
                        />

                    </>
                )}

                {/* Upload — inline only when no stimulus exists */}
                {!activeStimulus && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">Stimulus Images</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Upload one or more images to analyze with the Attention Prediction algorithm.
                        </p>
                        <FileUploadAdvanced
                            label="Add Stimulus Images or Videos"
                            acceptedFormats={['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']}
                            maxSizeMB={50}
                            multiple
                            files={[]}
                            onFilesChange={handleFilesChange}
                            researchId={research.id}
                            onUploadStart={() => setIsUploading(true)}
                            onUploadComplete={() => setIsUploading(false)}
                            onUploadError={() => setIsUploading(false)}
                            disabled={isUploading || isProcessing}
                        />
                    </div>
                )}

                {/* Upload Modal */}
                {showUploadModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-semibold text-gray-900">Add Stimulus</h3>
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <FileUploadAdvanced
                                label="Upload images or videos"
                                acceptedFormats={['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']}
                                maxSizeMB={50}
                                multiple
                                files={[]}
                                onFilesChange={(files) => { handleFilesChange(files); setShowUploadModal(false); }}
                                researchId={research.id}
                                onUploadStart={() => setIsUploading(true)}
                                onUploadComplete={() => setIsUploading(false)}
                                onUploadError={() => setIsUploading(false)}
                                disabled={isUploading || isProcessing}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Right: AI Analysis panel (collapsible drawer) */}
            {showAiPanel && (
                <div className="flex flex-shrink-0 h-full">
                    {/* Collapse toggle strip */}
                    <button
                        onClick={() => setAiPanelOpen(prev => !prev)}
                        className="w-8 flex flex-col items-center justify-center gap-2 bg-slate-50 border-l border-gray-200 hover:bg-slate-100 transition-colors flex-shrink-0"
                        title={aiPanelOpen ? 'Collapse AI panel' : 'Expand AI panel'}
                    >
                        {aiPanelOpen ? (
                            <PanelRightClose className="h-4 w-4 text-slate-500" />
                        ) : (
                            <>
                                <PanelRightOpen className="h-4 w-4 text-slate-500" />
                                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                                <span className="text-[10px] text-slate-500 font-medium [writing-mode:vertical-lr] rotate-180">
                                    AI Analysis
                                </span>
                            </>
                        )}
                    </button>

                    {/* Panel content */}
                    {aiPanelOpen && (
                        <div className="w-[420px] border-l border-gray-200 bg-white overflow-y-auto">
                            <AiAnalysisPanel
                                analysis={aiAnalysis ?? null}
                                isAnalyzing={isProcessing}
                                onAnalyze={() => activeStimulus && runAnalysis(activeStimulus.mediaId, activeStimulus.aois)}
                                onImportAois={(aois) => setPendingImportAois(aois)}
                                hasHeatmap={Boolean(activeStimulus?.heatmapData?.length)}
                                hasAois={Boolean(activeStimulus?.aois?.length || activeStimulus?.aoiSkipped)}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
