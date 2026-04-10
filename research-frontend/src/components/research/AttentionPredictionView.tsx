import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type Research, researchService } from '../../services/research.service';
import { researchKeys } from '../../hooks/useResearchQuery';
import { FileUploadAdvanced, type UploadedFile } from '../ui/FileUploadAdvanced';
import { AttentionPredictionCard } from './AttentionPredictionCard';
import { mediaService } from '../../services/media.service';

interface StimulusItem {
    url: string;
    mediaId: string;
    name: string;
    heatmapData?: Array<{ x: number; y: number; value: number }>;
    processedAt?: string;
}

interface AttentionPredictionViewProps {
    research: Research;
    stimulusId: string;
}

/**
 * View for Attention Prediction — upload stimuli and view AI-generated analysis.
 * After upload, automatically triggers saliency prediction via backend.
 */
export const AttentionPredictionView = ({ research, stimulusId }: AttentionPredictionViewProps) => {
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

    const stimuli = useMemo(() => {
        const settings = (research.settings as { stimuli?: StimulusItem[] }) || {};
        return settings.stimuli || [];
    }, [research.settings]);

    const activeStimulus = stimuli.find(s => s.mediaId === stimulusId) || stimuli[0];
    const hasHeatmap = activeStimulus?.heatmapData && activeStimulus.heatmapData.length > 0;

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

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Clean up polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const runPrediction = useCallback(async (mediaId: string) => {
        setIsProcessing(true);
        try {
            // Fire request — backend responds immediately with 202
            await mediaService.predictAttention(research.id, mediaId);

            // Poll for completion every 3 seconds
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = setInterval(async () => {
                try {
                    const status = await mediaService.getPredictionStatus(research.id, mediaId);
                    if (status.status === 'complete') {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        pollingRef.current = null;
                        setIsProcessing(false);
                        queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
                    }
                } catch {
                    // Ignore polling errors, keep trying
                }
            }, 3000);
        } catch (err) {
            console.error('[AttentionPrediction] Prediction failed:', err);
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

        // Auto-trigger prediction for each new stimulus
        for (const stimulus of newStimuli) {
            await runPrediction(stimulus.mediaId);
        }
    }, [stimuli, persistStimuli, runPrediction]);

    const handleDelete = useCallback(async (mediaId: string) => {
        setIsDeletingId(mediaId);
        try {
            const updated = stimuli.filter(s => s.mediaId !== mediaId);
            await persistStimuli(updated);
        } finally {
            setIsDeletingId(null);
        }
    }, [stimuli, persistStimuli]);

    return (
        <div className="space-y-6 p-6">
            {/* Analysis — main content when a stimulus is selected */}
            {activeStimulus ? (
                <>
                    <AttentionPredictionCard
                        imageUrl={activeStimulus.url}
                        title={activeStimulus.name}
                        heatmapData={activeStimulus.heatmapData}
                        onDelete={() => handleDelete(activeStimulus.mediaId)}
                        isDeleting={isDeletingId === activeStimulus.mediaId}
                    />

                    {/* Processing indicator */}
                    {isProcessing && (
                        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-blue-800">Processing attention prediction...</p>
                                <p className="text-xs text-blue-600">This may take a few seconds.</p>
                            </div>
                        </div>
                    )}

                    {/* Re-process button if no heatmap */}
                    {!hasHeatmap && !isProcessing && (
                        <button
                            type="button"
                            onClick={() => runPrediction(activeStimulus.mediaId)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Run Attention Prediction
                        </button>
                    )}
                </>
            ) : (
                /* Empty state — no stimuli yet */
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Stimulus Images</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Upload one or more images to analyze with the Attention Prediction algorithm.
                    </p>
                    <FileUploadAdvanced
                        label="Add Stimulus Images"
                        acceptedFormats={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
                        maxSizeMB={10}
                        multiple
                        files={[]}
                        onFilesChange={handleFilesChange}
                        researchId={research.id}
                        onUploadStart={() => setIsUploading(true)}
                        onUploadComplete={() => setIsUploading(false)}
                        onUploadError={() => setIsUploading(false)}
                        disabled={isUploading}
                    />
                </div>
            )}
        </div>
    );
};
