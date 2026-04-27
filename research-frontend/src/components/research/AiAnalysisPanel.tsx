/**
 * AiAnalysisPanel
 * Displays GPT-4o Vision analysis results for an Attention Prediction stimulus.
 * Collapsible sections: context, scores, auto-AOIs, attention flow, gaze path,
 * neuro-insights, and methodology.
 */

import { useState, useCallback } from 'react';
import {
    Sparkles,
    ChevronDown,
    ChevronRight,
    Eye,
    Route,
    Brain,
    ArrowRightLeft,
    Download,
    RefreshCw,
    Lightbulb,
    BookOpen,
} from 'lucide-react';
import type { AiAnalysisResult } from '../../types/aiAnalysis.types';

interface AiAnalysisPanelProps {
    analysis: AiAnalysisResult | null;
    isAnalyzing: boolean;
    analysisError?: string;
    onAnalyze: () => void;
    onImportAois: (aois: AiAnalysisResult['autoAois']) => void;
    hasHeatmap: boolean;
}

// ─── Attention Score Gauge ──────────────────────────────────────────

const ScoreGauge = ({ score, size = 80 }: { score: number; size?: number }) => {
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const color =
        score >= 80 ? '#22c55e' :
        score >= 60 ? '#3b82f6' :
        score >= 30 ? '#f59e0b' : '#ef4444';

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="5"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth="5"
                strokeDasharray={`${progress} ${circumference}`}
                strokeLinecap="round"
                className="transition-all duration-700"
            />
            <text
                x={size / 2}
                y={size / 2}
                textAnchor="middle"
                dominantBaseline="central"
                className="transform rotate-90 origin-center"
                fill={color}
                fontSize={size * 0.28}
                fontWeight="bold"
            >
                {score}
            </text>
        </svg>
    );
};

// ─── Collapsible Section ────────────────────────────────────────────

const Section = ({
    title,
    icon,
    children,
    defaultOpen = true,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
            >
                <span className="text-slate-500">{icon}</span>
                <span className="flex-1 text-left">{title}</span>
                {open ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
            </button>
            {open && <div className="px-4 pb-4 border-t border-gray-100">{children}</div>}
        </div>
    );
};

// ─── Attention Level Badge ──────────────────────────────────────────

const AttentionBadge = ({ level }: { level: string }) => {
    const styles: Record<string, string> = {
        high: 'bg-green-100 text-green-700',
        medium: 'bg-amber-100 text-amber-700',
        low: 'bg-red-100 text-red-700',
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[level] || 'bg-gray-100 text-gray-600'}`}>
            {level}
        </span>
    );
};

// ─── Duration Badge ─────────────────────────────────────────────────

const DurationBadge = ({ duration }: { duration: string }) => {
    const styles: Record<string, string> = {
        brief: 'bg-slate-100 text-slate-600',
        moderate: 'bg-blue-100 text-blue-600',
        long: 'bg-indigo-100 text-indigo-700',
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full ${styles[duration] || 'bg-gray-100 text-gray-600'}`}>
            {duration}
        </span>
    );
};

// ─── Main Panel ─────────────────────────────────────────────────────

export const AiAnalysisPanel = ({
    analysis,
    isAnalyzing,
    analysisError,
    onAnalyze,
    onImportAois,
    hasHeatmap,
}: AiAnalysisPanelProps) => {
    const [importedLabels, setImportedLabels] = useState<Set<string>>(new Set());

    const handleImportAll = useCallback(() => {
        if (!analysis) return;
        const newAois = analysis.autoAois.filter((a) => !importedLabels.has(a.label));
        if (newAois.length > 0) {
            onImportAois(newAois);
            setImportedLabels(new Set(analysis.autoAois.map((a) => a.label)));
        }
    }, [analysis, importedLabels, onImportAois]);

    const handleImportOne = useCallback(
        (aoi: AiAnalysisResult['autoAois'][0]) => {
            if (importedLabels.has(aoi.label)) return;
            onImportAois([aoi]);
            setImportedLabels((prev) => new Set([...prev, aoi.label]));
        },
        [importedLabels, onImportAois]
    );

    // No analysis yet — show trigger button
    if (!analysis) {
        return (
            <div className="bg-gradient-to-b from-slate-50 to-blue-50 p-5 h-full flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-blue-100 rounded-xl mb-3">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">AI Analysis</h3>
                <p className="text-xs text-slate-500 mb-4 max-w-[280px]">
                    Analyzes visual attention patterns, gaze flow, and design effectiveness
                </p>
                <button
                    onClick={onAnalyze}
                    disabled={!hasHeatmap || isAnalyzing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                        {isAnalyzing ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Analyze with AI
                            </>
                        )}
                    </button>
                {!hasHeatmap && (
                    <p className="mt-3 text-xs text-amber-600">Run prediction first to enable AI analysis.</p>
                )}
                {analysisError && (
                    <p className="mt-3 text-xs text-red-600">Error: {analysisError}</p>
                )}
            </div>
        );
    }

    // Analysis available — show results
    return (
        <div className="bg-white overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">AI Analysis</h3>
                        <p className="text-xs text-slate-500">
                            Confidence: {analysis.confidence}%
                        </p>
                    </div>
                </div>
                <button
                    onClick={onAnalyze}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-gray-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    Re-analyze
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Context & Scores */}
                <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-medium px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full uppercase tracking-wide">
                                {analysis.context.type}
                            </span>
                        </div>
                        <p className="text-sm text-slate-600">{analysis.context.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <ScoreGauge score={analysis.attentionScore} size={72} />
                            <p className="text-xs text-slate-500 mt-1">Attention</p>
                        </div>
                        <div className="text-center">
                            <ScoreGauge score={analysis.confidence} size={56} />
                            <p className="text-xs text-slate-500 mt-1">Confidence</p>
                        </div>
                    </div>
                </div>

                {/* Auto-detected AOIs */}
                <Section title={`Areas of Interest (${analysis.autoAois.length})`} icon={<Eye className="h-4 w-4" />}>
                    <div className="mt-3 space-y-2">
                        {analysis.autoAois.map((aoi, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-lg">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-800 truncate">{aoi.label}</span>
                                        <AttentionBadge level={aoi.attentionLevel} />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{aoi.description}</p>
                                </div>
                                <button
                                    onClick={() => handleImportOne(aoi)}
                                    disabled={importedLabels.has(aoi.label)}
                                    className="text-xs px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:text-slate-400 disabled:hover:bg-transparent transition-colors whitespace-nowrap"
                                >
                                    {importedLabels.has(aoi.label) ? 'Imported' : 'Import'}
                                </button>
                            </div>
                        ))}
                    </div>
                    {analysis.autoAois.length > 0 && (
                        <button
                            onClick={handleImportAll}
                            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Import all AOIs
                        </button>
                    )}
                </Section>

                {/* Attention Flow */}
                <Section title="Attention Flow" icon={<ArrowRightLeft className="h-4 w-4" />}>
                    <div className="mt-3 space-y-3">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Entry Point</p>
                                <p className="text-sm text-slate-800">{analysis.attentionFlow.entryPoint}</p>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Exit Point</p>
                                <p className="text-sm text-slate-800">{analysis.attentionFlow.exitPoint}</p>
                            </div>
                        </div>

                        {/* Flow path */}
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Visual Path</p>
                            <div className="flex items-center gap-1 flex-wrap">
                                {analysis.attentionFlow.flowPath.map((step, i) => (
                                    <span key={i} className="flex items-center gap-1">
                                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{step}</span>
                                        {i < analysis.attentionFlow.flowPath.length - 1 && (
                                            <span className="text-slate-300">→</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Leak areas */}
                        {analysis.attentionFlow.leakAreas.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">Attention Leak</p>
                                <ul className="space-y-1">
                                    {analysis.attentionFlow.leakAreas.map((area, i) => (
                                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                                            <span className="text-red-400 mt-0.5">•</span>
                                            {area}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p className="text-sm text-slate-600 leading-relaxed">{analysis.attentionFlow.summary}</p>
                    </div>
                </Section>

                {/* Gaze Path */}
                <Section title={`Predicted Gaze Path (${analysis.gazePath.length} fixations)`} icon={<Route className="h-4 w-4" />}>
                    <div className="mt-3">
                        <div className="space-y-1.5">
                            {[...analysis.gazePath]
                                .sort((a, b) => a.order - b.order)
                                .map((point) => (
                                    <div key={point.order} className="flex items-center gap-3 py-1.5 px-3 bg-slate-50 rounded-lg">
                                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-blue-600 text-white text-xs font-bold rounded-full">
                                            {point.order}
                                        </span>
                                        <span className="flex-1 text-sm text-slate-800">{point.label}</span>
                                        <DurationBadge duration={point.duration} />
                                    </div>
                                ))}
                        </div>
                    </div>
                </Section>

                {/* Neuro-Insights */}
                <Section title={`Neuro-Insights & Gestalt (${analysis.neuroInsights.length})`} icon={<Brain className="h-4 w-4" />}>
                    <div className="mt-3 space-y-3">
                        {analysis.neuroInsights.map((insight, i) => (
                            <div key={i} className="bg-slate-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                                    <span className="text-sm font-semibold text-slate-800">{insight.principle}</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-1.5">{insight.finding}</p>
                                <p className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                                    {insight.recommendation}
                                </p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Methodology */}
                <Section title="Technical Methodology" icon={<BookOpen className="h-4 w-4" />} defaultOpen={false}>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">{analysis.methodology}</p>
                </Section>
            </div>
        </div>
    );
};
