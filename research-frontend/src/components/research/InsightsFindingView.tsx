import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type Research, researchService } from '../../services/research.service';
import { researchKeys } from '../../hooks/useResearchQuery';
import { VOCComments } from '../results/smart-voc/components/VOCComments';

interface FileItem {
    mediaId: string;
    name: string;
    entries?: Array<{ text: string; mood: string }>;
    processedAt?: string;
}

interface InsightsFindingViewProps {
    research: Research;
    fileId: string;
}

/**
 * View for Insights Finding — shows text analysis results.
 * Text files are parsed and analyzed at creation time (CreateResearchForm).
 * Entries (text + mood) are stored in research.settings.stimuli[].entries.
 * Reuses VOCComments (Comment + Mood + Sentiment + Themes + Keywords).
 */
export const InsightsFindingView = ({ research, fileId }: InsightsFindingViewProps) => {
    const queryClient = useQueryClient();
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

    const settings = (research.settings as { stimuli?: FileItem[] }) || {};
    const files = settings.stimuli || [];

    const activeFile = files.find(f => f.mediaId === fileId) || files[0];
    const hasEntries = activeFile?.entries && activeFile.entries.length > 0;

    const handleDelete = useCallback(async (mediaId: string) => {
        setIsDeletingId(mediaId);
        try {
            const updated = files.filter(f => f.mediaId !== mediaId);
            await researchService.update(research.id, {
                settings: {
                    ...(research.settings as Record<string, unknown> || {}),
                    stimuli: updated,
                },
            });
            queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
        } finally {
            setIsDeletingId(null);
        }
    }, [files, research.id, research.settings, queryClient]);

    if (!activeFile) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <p className="text-sm">No files uploaded. Upload text files when creating the research.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-6">
            {/* File header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-base font-semibold text-gray-900">
                        Insights finding research
                    </h3>
                </div>
                <button
                    type="button"
                    onClick={() => void handleDelete(activeFile.mediaId)}
                    disabled={isDeletingId === activeFile.mediaId}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Remove file"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            {/* Text analysis — reuses VOCComments */}
            {hasEntries ? (
                <VOCComments
                    questionText="Sentiment Analysis from text"
                    questionNumber="1.0"
                    comments={activeFile.entries}
                    researchId={research.id}
                />
            ) : (
                <div className="p-8 text-center text-gray-400 border-2 border-dashed rounded-lg">
                    <p className="text-sm">No text entries found in this file.</p>
                </div>
            )}
        </div>
    );
};
