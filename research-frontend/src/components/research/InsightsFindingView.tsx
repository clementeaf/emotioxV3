import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { type Research, researchService } from '../../services/research.service';
import { researchKeys } from '../../hooks/useResearchQuery';
import { mediaService } from '../../services/media.service';
import { parseDocument, detectCsvColumns, type CsvColumnInfo } from '../../utils/documentParser';
import { CsvColumnSelector } from './CsvColumnSelector';
import { cn } from '../../lib/utils';

interface InsightsAnalysis {
    sentiment: { summary: string; description: string; actionables: string[] };
    themes: Array<{ name: string; count: number; description: string }>;
    keywords: Array<{ word: string; count: number; sentiment: string }>;
}

interface FileItem {
    mediaId: string;
    name: string;
    entries?: Array<{ text: string; mood: string }>;
    analysis?: InsightsAnalysis;
    analyzedAt?: string;
    totalCount?: number;
    processedAt?: string;
}

interface InsightsFindingViewProps {
    research: Research;
    fileId: string;
}

const MOOD_COLORS: Record<string, string> = {
    positive: 'text-green-600 bg-green-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-100',
    indeterminate: 'text-gray-400 bg-gray-50',
};

type TabId = 'sentiment' | 'themes' | 'keywords';

/**
 * View for Insights Finding — shows text entries with LLM-powered analysis.
 */
export const InsightsFindingView = ({ research, fileId }: InsightsFindingViewProps) => {
    const queryClient = useQueryClient();
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('sentiment');
    const [selectedComments, setSelectedComments] = useState<number[]>([]);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const triggeredRef = useRef<string | null>(null); // prevent re-trigger loop

    const files = useMemo(() => {
        const settings = (research.settings as { stimuli?: FileItem[] }) || {};
        return settings.stimuli || [];
    }, [research.settings]);
    const activeFile = files.find(f => f.mediaId === fileId) || files[0];
    const hasEntries = activeFile?.entries && activeFile.entries.length > 0;
    const hasAnalysis = !!activeFile?.analysis;

    // Auto-trigger analysis once when file has entries but no analysis
    useEffect(() => {
        if (activeFile && hasEntries && !hasAnalysis && !isAnalyzing && triggeredRef.current !== activeFile.mediaId) {
            triggeredRef.current = activeFile.mediaId;
            void triggerAnalysis(activeFile.mediaId);
        }
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [activeFile?.mediaId, hasEntries, hasAnalysis]); // eslint-disable-line react-hooks/exhaustive-deps

    const triggerAnalysis = useCallback(async (mediaId: string) => {
        setIsAnalyzing(true);
        try {
            await mediaService.analyzeInsights(research.id, mediaId);
            // Poll for completion
            pollingRef.current = setInterval(async () => {
                try {
                    const status = await mediaService.getInsightsStatus(research.id, mediaId);
                    if (status.status === 'complete') {
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        pollingRef.current = null;
                        setIsAnalyzing(false);
                        queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
                    }
                } catch { /* keep polling */ }
            }, 3000);
        } catch (err) {
            console.error('[InsightsFinding] Analysis trigger failed:', err);
            setIsAnalyzing(false);
        }
    }, [research.id, queryClient]);

    const handleDelete = useCallback(async (mediaId: string) => {
        setIsDeletingId(mediaId);
        try {
            const updated = files.filter(f => f.mediaId !== mediaId);
            await researchService.update(research.id, {
                settings: { ...(research.settings as Record<string, unknown> || {}), stimuli: updated },
            });
            queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
        } finally {
            setIsDeletingId(null);
        }
    }, [files, research.id, research.settings, queryClient]);

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingCsvFile, setPendingCsvFile] = useState<{ file: File; columnInfo: CsvColumnInfo } | null>(null);

    const uploadSingleFile = useCallback(async (file: File, columnIndex?: number) => {
        const MAX_ENTRIES = 200;
        const MAX_TEXT_LENGTH = 500;
        const { mediaId } = await mediaService.uploadFile(research.id, file);
        const texts = await parseDocument(file, columnIndex);
        const totalCount = texts.length;
        const capped = texts.slice(0, MAX_ENTRIES);
        const entries = capped.map(text => ({
            text: text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text,
            mood: 'indeterminate',
        }));
        return { mediaId, name: file.name, entries, totalCount, processedAt: new Date().toISOString() } as FileItem;
    }, [research.id]);

    const handleFileUpload = useCallback(async (selectedFiles: FileList | null) => {
        if (!selectedFiles || selectedFiles.length === 0) return;
        setIsUploading(true);
        try {
            const newFiles: FileItem[] = [];
            for (const file of Array.from(selectedFiles)) {
                // Check if CSV/Excel has multiple columns
                const cols = await detectCsvColumns(file);
                if (cols) {
                    setPendingCsvFile({ file, columnInfo: cols });
                    setIsUploading(false);
                    return; // handle one at a time via selector
                }
                newFiles.push(await uploadSingleFile(file));
            }
            const existingIds = new Set(files.map(f => f.mediaId));
            const merged = [...files, ...newFiles.filter(f => !existingIds.has(f.mediaId))];
            await researchService.update(research.id, {
                settings: { ...(research.settings as Record<string, unknown> || {}), stimuli: merged },
            });
            queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
        } catch (err) {
            console.error('[InsightsFinding] File upload failed:', err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [files, research.id, research.settings, queryClient, uploadSingleFile]);

    const handleCsvColumnSelected = useCallback(async (columnIndex: number) => {
        if (!pendingCsvFile) return;
        setIsUploading(true);
        setPendingCsvFile(null);
        try {
            const newFile = await uploadSingleFile(pendingCsvFile.file, columnIndex);
            const existingIds = new Set(files.map(f => f.mediaId));
            const merged = existingIds.has(newFile.mediaId) ? files : [...files, newFile];
            await researchService.update(research.id, {
                settings: { ...(research.settings as Record<string, unknown> || {}), stimuli: merged },
            });
            queryClient.invalidateQueries({ queryKey: researchKeys.detail(research.id) });
        } catch (err) {
            console.error('[InsightsFinding] CSV upload failed:', err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [pendingCsvFile, files, research.id, research.settings, queryClient, uploadSingleFile]);

    const handleSelectAll = () => {
        const entries = activeFile?.entries || [];
        setSelectedComments(prev => prev.length === entries.length ? [] : entries.map((_, i) => i));
    };

    if (!activeFile) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Upload className="w-10 h-10 mb-3 text-gray-300" />
                <p className="text-sm mb-3">No files uploaded yet.</p>
                <label className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                    Upload documents
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".csv,.txt,.xlsx,.xls,.docx,.pdf"
                        className="hidden"
                        onChange={e => void handleFileUpload(e.target.files)}
                    />
                </label>
                <p className="text-xs text-gray-400 mt-2">CSV, TXT, XLSX, DOCX, PDF</p>
            </div>
        );
    }

    const entries = activeFile.entries || [];
    const analysis = activeFile.analysis;

    return (
        <div className="space-y-4 p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <h3 className="text-base font-semibold text-gray-900">Insights finding research</h3>
                <div className="flex items-center gap-2">
                    <label className={cn(
                        'cursor-pointer flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                        isUploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    )}>
                        <Upload className="w-3.5 h-3.5" />
                        {isUploading ? 'Uploading...' : 'Add files'}
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".csv,.txt,.xlsx,.xls,.docx,.pdf"
                            className="hidden"
                            disabled={isUploading}
                            onChange={e => void handleFileUpload(e.target.files)}
                        />
                    </label>
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
            </div>

            {pendingCsvFile && (
                <div className="border rounded-lg bg-white p-4">
                    <CsvColumnSelector
                        fileName={pendingCsvFile.file.name}
                        columnInfo={pendingCsvFile.columnInfo}
                        onSelect={(colIndex) => void handleCsvColumnSelected(colIndex)}
                        onCancel={() => {
                            setPendingCsvFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                    />
                </div>
            )}

            {hasEntries ? (
                <div className="border rounded-lg bg-white overflow-hidden">
                    {/* Section title */}
                    <div className="px-4 py-3 border-b">
                        <h4 className="text-sm font-semibold text-gray-900">1.0.- Sentiment Analysis from text</h4>
                    </div>

                    <div className="flex divide-x min-h-[400px]">
                        {/* Left: Comments table */}
                        <div className="w-2/5 min-w-0 flex-shrink-0">
                            {/* Table header */}
                            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedComments.length === entries.length && entries.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded border-gray-300"
                                    />
                                    <span>Comment</span>
                                </div>
                                <span>Mood</span>
                            </div>
                            {/* Entries */}
                            <div className="max-h-[500px] overflow-y-auto divide-y">
                                {entries.map((entry, i) => (
                                    <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <input
                                                type="checkbox"
                                                checked={selectedComments.includes(i)}
                                                onChange={() => setSelectedComments(prev =>
                                                    prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                                                )}
                                                className="rounded border-gray-300 flex-shrink-0"
                                            />
                                            <span className="text-sm text-gray-700 truncate">{entry.text}</span>
                                        </div>
                                        <span className={cn(
                                            'text-xs font-medium px-2 py-0.5 rounded-full capitalize flex-shrink-0 ml-3',
                                            MOOD_COLORS[entry.mood] || MOOD_COLORS.indeterminate
                                        )}>
                                            {entry.mood}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Analysis panel */}
                        <div className="flex-1 min-w-0">
                            {/* Tabs */}
                            <div className="flex items-center gap-1 px-4 py-2 border-b bg-gray-50">
                                {(['sentiment', 'themes', 'keywords'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            'px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize',
                                            activeTab === tab
                                                ? 'bg-white text-blue-600 shadow-sm border'
                                                : 'text-gray-500 hover:text-gray-700'
                                        )}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className="p-4 overflow-y-auto max-h-[500px]">
                                {isAnalyzing && (
                                    <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                                        <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span className="text-xs text-blue-700">Analyzing with AI...</span>
                                    </div>
                                )}

                                {/* Sentiment tab */}
                                {activeTab === 'sentiment' && (
                                    <div className="space-y-4">
                                        <h5 className="font-semibold text-sm text-gray-900">Sentiment analysis</h5>
                                        {analysis?.sentiment ? (
                                            <>
                                                <p className="text-sm text-gray-700 leading-relaxed">{analysis.sentiment.summary}</p>
                                                <p className="text-sm text-gray-600 leading-relaxed">{analysis.sentiment.description}</p>
                                                {analysis.sentiment.actionables.length > 0 && (
                                                    <div>
                                                        <h6 className="font-semibold text-sm text-gray-900 mb-1">Accionables:</h6>
                                                        <ul className="space-y-1">
                                                            {analysis.sentiment.actionables.map((a, i) => (
                                                                <li key={i} className="text-sm text-gray-600">{a}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </>
                                        ) : !isAnalyzing ? (
                                            <p className="text-sm text-gray-400">No analysis available yet.</p>
                                        ) : null}
                                    </div>
                                )}

                                {/* Themes tab */}
                                {activeTab === 'themes' && (
                                    <div className="space-y-3">
                                        <h5 className="font-semibold text-sm text-gray-900">Themes</h5>
                                        {analysis?.themes && analysis.themes.length > 0 ? (
                                            analysis.themes.map((theme, i) => (
                                                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-gray-900">{theme.name}</span>
                                                        <span className="text-xs text-gray-500">{theme.count} mentions</span>
                                                    </div>
                                                    <p className="text-xs text-gray-600">{theme.description}</p>
                                                </div>
                                            ))
                                        ) : !isAnalyzing ? (
                                            <p className="text-sm text-gray-400">No themes data available yet.</p>
                                        ) : null}
                                    </div>
                                )}

                                {/* Keywords tab */}
                                {activeTab === 'keywords' && (
                                    <div className="space-y-3">
                                        <h5 className="font-semibold text-sm text-gray-900">Keywords</h5>
                                        {analysis?.keywords && analysis.keywords.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {analysis.keywords.map((kw, i) => (
                                                    <span
                                                        key={i}
                                                        className={cn(
                                                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                                                            kw.sentiment === 'positive' ? 'bg-green-50 text-green-700' :
                                                            kw.sentiment === 'negative' ? 'bg-red-50 text-red-700' :
                                                            'bg-gray-100 text-gray-700'
                                                        )}
                                                    >
                                                        {kw.word}
                                                        <span className="text-[10px] opacity-60">({kw.count})</span>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : !isAnalyzing ? (
                                            <p className="text-sm text-gray-400">No keywords data available yet.</p>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center text-gray-400 border-2 border-dashed rounded-lg">
                    <p className="text-sm">No text entries found in this file.</p>
                </div>
            )}
        </div>
    );
};
