import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PanelRightOpen, PanelRightClose, Sparkles } from 'lucide-react';
import { type Research, researchService } from '../../services/research.service';
import { researchKeys } from '../../hooks/useResearchQuery';
import { FileUploadAdvanced, type UploadedFile } from '../ui/FileUploadAdvanced';
import { AttentionPredictionCard } from './AttentionPredictionCard';
import { AiAnalysisPanel } from './AiAnalysisPanel';
import { mediaService } from '../../services/media.service';
import type { AiAnalysisResult } from '../../types/aiAnalysis.types';

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
}

interface AttentionPredictionViewProps {
    research: Research;
    stimulusId: string;
}

/**
 * View for Attention Prediction — upload stimuli and view AI-generated analysis.
 * After upload, automatically triggers AI analysis via backend (Gemini/GPT-4o Vision).
 */
export const AttentionPredictionView = ({ research, stimulusId }: AttentionPredictionViewProps) => {
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [predictionError, setPredictionError] = useState<string | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [aiPanelOpen, setAiPanelOpen] = useState(true);
    const [pendingImportAois, setPendingImportAois] = useState<AiAnalysisResult['autoAois'] | undefined>(undefined);

    const stimuli = useMemo(() => {
        const settings = (research.settings as { stimuli?: StimulusItem[] }) || {};
        return settings.stimuli || [];
    }, [research.settings]);

    const activeStimulus = stimuli.find(s => s.mediaId === stimulusId) || stimuli[0];
    const aiAnalysis = activeStimulus?.aiAnalysis as AiAnalysisResult | undefined;
    const hasAnalysis = Boolean(aiAnalysis);
    const storedError = activeStimulus?.predictionError;

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

    const runAnalysis = useCallback(async (mediaId: string) => {
        setIsProcessing(true);
        setPredictionError(null);
        try {
            // Single step: AI Analysis generates both heatmap data and qualitative insights
            await mediaService.analyzeAttention(research.id, mediaId);
            queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
        } catch {
            setPredictionError('Analysis failed. Please retry.');
        } finally {
            setIsProcessing(false);
        }
    }, [research.id, queryClient]);



    const handleFilesChange = useCallback(async (files: UploadedFile[]) => {
        const newStimuli: StimulusItem[] = files
            .filter(f => f.status === 'uploaded' && f.mediaId)
            .map(f => ({
                url: f.url || '',
                mediaId: f.mediaId!,
                name: f.name,
            }));

        if (newStimuli.length === 0) return;

        const existingIds = new Set(stimuli.map(s => s.mediaId));
        const merged = [
            ...stimuli,
            ...newStimuli.filter(s => !existingIds.has(s.mediaId)),
        ];

        await persistStimuli(merged);

        // Run AI analysis on each new stimulus (Gemini/GPT-4o Vision)
        for (const stimulus of newStimuli) {
            await runAnalysis(stimulus.mediaId);
        }
    }, [stimuli, persistStimuli, runAnalysis]);

    const handleDelete = useCallback(async (mediaId: string) => {
        setIsDeletingId(mediaId);
        try {
            const updated = stimuli.filter(s => s.mediaId !== mediaId);
            await persistStimuli(updated);
        } finally {
            setIsDeletingId(null);
        }
    }, [stimuli, persistStimuli]);

    const displayError = predictionError || storedError;

    const showAiPanel = Boolean(activeStimulus && hasAnalysis);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left: main content area (scrollable) */}
            <div className="flex-1 min-w-0 p-6 space-y-4 overflow-y-auto">
                {/* Analysis — main content when a stimulus is selected */}
                {activeStimulus && (
                    <>
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
                        />

                        {/* Processing indicator */}
                        {isProcessing && (
                            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-blue-800">Analyzing visual attention...</p>
                                    <p className="text-xs text-blue-600">AI is analyzing the image. This may take 15-30 seconds.</p>
                                </div>
                            </div>
                        )}

                        {/* Re-analyze button if no analysis and no error */}
                        {!hasAnalysis && !isProcessing && !displayError && (
                            <button
                                type="button"
                                onClick={() => runAnalysis(activeStimulus.mediaId)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Sparkles className="w-4 h-4" />
                                Run AI Analysis
                            </button>
                        )}
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
                                onAnalyze={() => activeStimulus && runAnalysis(activeStimulus.mediaId)}
                                onImportAois={(aois) => setPendingImportAois(aois)}
                                hasHeatmap={true}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
