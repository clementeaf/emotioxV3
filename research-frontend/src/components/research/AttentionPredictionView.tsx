import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type Research, researchService } from '../../services/research.service';
import { researchKeys } from '../../hooks/useResearchQuery';
import { FileUploadAdvanced, type UploadedFile } from '../ui/FileUploadAdvanced';
import { AttentionPredictionCard } from './AttentionPredictionCard';

interface StimulusItem {
    url: string;
    mediaId: string;
    name: string;
    heatmapData?: Array<{ x: number; y: number; duration: number }>;
}

interface AttentionPredictionViewProps {
    research: Research;
    stimulusId: string;
}

/**
 * View for Attention Prediction — upload stimuli and view AI-generated analysis.
 * Uses FileUploadAdvanced (same pattern as Navigation Flow / Preference Test).
 */
export const AttentionPredictionView = ({ research, stimulusId }: AttentionPredictionViewProps) => {
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

    const settings = (research.settings as { stimuli?: StimulusItem[] }) || {};
    const stimuli = settings.stimuli || [];

    const activeStimulus = stimuli.find(s => s.mediaId === stimulusId) || stimuli[0];

    const persistStimuli = useCallback(async (updated: StimulusItem[]) => {
        await researchService.update(research.id, {
            settings: {
                ...(research.settings as Record<string, unknown> || {}),
                stimuli: updated,
                // Compat: keep first stimulus as legacy fields
                stimulusUrl: updated[0]?.url,
                stimulusMediaId: updated[0]?.mediaId,
            },
        });
        queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
    }, [research.id, research.settings, queryClient]);

    const handleFilesChange = useCallback(async (files: UploadedFile[]) => {
        // Map uploaded files to stimulus items and merge with existing
        const newStimuli: StimulusItem[] = files
            .filter(f => f.status === 'uploaded' && f.mediaId)
            .map(f => ({
                url: f.url || '',
                mediaId: f.mediaId!,
                name: f.name,
            }));

        if (newStimuli.length === 0) return;

        // Merge: keep existing + add new (deduplicate by mediaId)
        const existingIds = new Set(stimuli.map(s => s.mediaId));
        const merged = [
            ...stimuli,
            ...newStimuli.filter(s => !existingIds.has(s.mediaId)),
        ];

        await persistStimuli(merged);
    }, [stimuli, persistStimuli]);

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
                <AttentionPredictionCard
                    imageUrl={activeStimulus.url}
                    title={activeStimulus.name}
                    heatmapData={activeStimulus.heatmapData}
                    onDelete={() => handleDelete(activeStimulus.mediaId)}
                    isDeleting={isDeletingId === activeStimulus.mediaId}
                />
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
