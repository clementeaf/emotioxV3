/**
 * AiAnalysisPanel
 * Displays GPT-4o Vision analysis results for an Attention Prediction stimulus.
 * Collapsible sections: context, scores, auto-AOIs, attention flow, gaze path,
 * neuro-insights, and methodology.
 */

import { useState, useCallback, useMemo } from 'react';
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
import type { ManualAOI } from '../../types/attentionPrediction.types';
import { reconcileAutoAoisWithManual } from '../../utils/attentionPrediction.utils';

interface AiAnalysisPanelProps {
    analysis: AiAnalysisResult | null;
    isAnalyzing: boolean;
    onAnalyze: () => void;
    onImportAois: (aois: AiAnalysisResult['autoAois']) => void;
    hasHeatmap: boolean;
    hasAois?: boolean;
    manualAois?: ManualAOI[];
    /** Hides legacy auto-analyze results until AOI-first flow is completed */
    isLegacyFlow?: boolean;
    /** Active analysis criteria label shown in the panel header */
    criteriaLabel?: string;
    /** Whether a custom criteria is saved on the study */
    hasCriteria?: boolean;
    /** Opens the criteria drawer */
    onOpenCriteria?: () => void;
    /** Switches the card to AOI Editor */
    onFocusAoiEditor?: () => void;
    /** Runs TranSalNet heatmap prediction */
    onRunPrediction?: () => void;
    /** Whether heatmap prediction is running */
    isPredicting?: boolean;
    /** Elapsed seconds during heatmap prediction */
    predictElapsed?: number;
    /** Whether prediction gate is open (AOIs or skip) */
    canRunPrediction?: boolean;
    /** Elapsed seconds during AI analysis */
    analyzeElapsed?: number;
    /** User skipped AOI definition */
    aoiSkipped?: boolean;
}

interface WorkflowStepProps {
    step: number;
    title: string;
    isComplete: boolean;
    isLoading?: boolean;
    loadingLabel?: string;
    actionLabel?: string;
    onAction?: () => void;
    actionDisabled?: boolean;
    detail?: string;
}

/**
 * Renders a single step in the Attention Prediction right-panel wizard.
 * @param props - Step metadata and optional action button
 * @returns Workflow step row
 */
const WorkflowStep = ({
    step,
    title,
    isComplete,
    isLoading = false,
    loadingLabel,
    actionLabel,
    onAction,
    actionDisabled = false,
    detail,
}: WorkflowStepProps) => (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-start gap-2">
            <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isComplete ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                }`}
            >
                {isComplete ? '✓' : step}
            </span>
            <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${isComplete ? 'text-green-800' : 'text-slate-800'}`}>
                    {title}
                </p>
                {detail && (
                    <p className="mt-0.5 truncate text-xs text-slate-500" title={detail}>
                        {detail}
                    </p>
                )}
                {isLoading && loadingLabel && (
                    <p className="mt-1 text-xs text-indigo-600">{loadingLabel}</p>
                )}
            </div>
        </div>
        {actionLabel && onAction && (
            <button
                type="button"
                onClick={onAction}
                disabled={actionDisabled || isLoading}
                className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
                {actionLabel}
            </button>
        )}
    </div>
);

interface AttentionWorkflowPanelProps {
    hasAois: boolean;
    aoiSkipped: boolean;
    hasCriteria: boolean;
    criteriaLabel?: string;
    hasHeatmap: boolean;
    isPredicting: boolean;
    predictElapsed: number;
    canRunPrediction: boolean;
    onFocusAoiEditor?: () => void;
    onOpenCriteria?: () => void;
    onRunPrediction?: () => void;
}

/**
 * Renders the AOI-first workflow wizard in the right sidebar.
 * @param props - Workflow state and step actions
 * @returns Wizard checklist with per-step buttons
 */
const AttentionWorkflowPanel = ({
    hasAois,
    aoiSkipped,
    hasCriteria,
    criteriaLabel,
    hasHeatmap,
    isPredicting,
    predictElapsed,
    canRunPrediction,
    onFocusAoiEditor,
    onOpenCriteria,
    onRunPrediction,
}: AttentionWorkflowPanelProps) => {
    const zonesComplete = hasAois || aoiSkipped;
    const heatmapComplete = hasHeatmap && !isPredicting;

    return (
        <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Step by step
            </p>
            <WorkflowStep
                step={1}
                title="Define zones"
                isComplete={zonesComplete}
                actionLabel="Go to zone editor"
                onAction={onFocusAoiEditor}
            />
            <WorkflowStep
                step={2}
                title="Analysis criteria"
                isComplete={hasCriteria}
                detail={criteriaLabel}
                actionLabel="Edit criteria"
                onAction={onOpenCriteria}
            />
            <WorkflowStep
                step={3}
                title="Generate heatmap"
                isComplete={heatmapComplete}
                isLoading={isPredicting}
                loadingLabel={`Regenerating heatmap... ${predictElapsed}s`}
                actionLabel={hasHeatmap ? 'Regenerate heatmap' : 'Generate heatmap'}
                onAction={onRunPrediction}
                actionDisabled={!canRunPrediction}
            />
        </div>
    );
};

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
                transform={`rotate(90, ${size / 2}, ${size / 2})`}
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

const DURATION_LABELS: Record<string, string> = {
    brief: 'brief',
    moderate: 'moderate',
    long: 'long',
};

const DurationBadge = ({ duration }: { duration: string }) => {
    const styles: Record<string, string> = {
        brief: 'bg-slate-100 text-slate-600',
        moderate: 'bg-blue-100 text-blue-600',
        long: 'bg-indigo-100 text-indigo-700',
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full ${styles[duration] || 'bg-gray-100 text-gray-600'}`}>
            {DURATION_LABELS[duration] ?? duration}
        </span>
    );
};

// ─── Main Panel ─────────────────────────────────────────────────────

export const AiAnalysisPanel = ({
    analysis,
    isAnalyzing,
    onAnalyze,
    onImportAois,
    hasHeatmap,
    hasAois = false,
    manualAois = [],
    isLegacyFlow = false,
    criteriaLabel,
    hasCriteria = false,
    onOpenCriteria,
    onFocusAoiEditor,
    onRunPrediction,
    isPredicting = false,
    predictElapsed = 0,
    canRunPrediction = false,
    analyzeElapsed = 0,
    aoiSkipped = false,
}: AiAnalysisPanelProps) => {
    const [importedLabels, setImportedLabels] = useState<Set<string>>(new Set());

    const displayAutoAois = useMemo(
        () => reconcileAutoAoisWithManual(manualAois, analysis?.autoAois ?? []),
        [manualAois, analysis?.autoAois],
    );

    const handleImportAll = useCallback(() => {
        if (!analysis) return;
        const newAois = displayAutoAois.filter((a) => !importedLabels.has(a.label));
        if (newAois.length > 0) {
            onImportAois(newAois);
            setImportedLabels(new Set(displayAutoAois.map((a) => a.label)));
        }
    }, [analysis, displayAutoAois, importedLabels, onImportAois]);

    const handleImportOne = useCallback(
        (aoi: AiAnalysisResult['autoAois'][0]) => {
            if (importedLabels.has(aoi.label)) return;
            onImportAois([aoi]);
            setImportedLabels((prev) => new Set([...prev, aoi.label]));
        },
        [importedLabels, onImportAois]
    );

    const workflowProps: AttentionWorkflowPanelProps = {
        hasAois,
        aoiSkipped,
        hasCriteria,
        criteriaLabel,
        hasHeatmap,
        isPredicting,
        predictElapsed,
        canRunPrediction,
        onFocusAoiEditor,
        onOpenCriteria,
        onRunPrediction,
    };

    const canAnalyze = hasHeatmap && !isPredicting && (hasAois || aoiSkipped);

    // No analysis yet — show wizard + trigger button
    if (!analysis) {
        return (
            <div className="bg-gradient-to-b from-slate-50 to-blue-50 p-4 h-full flex flex-col overflow-y-auto">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">AI Analysis</h3>
                        <p className="text-xs text-slate-500">
                            Complete each step and run the analysis
                        </p>
                    </div>
                </div>
                {isLegacyFlow && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
                        This stimulus has results from a previous flow. Complete the steps before re-analyzing.
                    </p>
                )}
                <AttentionWorkflowPanel {...workflowProps} />
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <WorkflowStep
                        step={4}
                        title="Analyze with AI"
                        isComplete={false}
                        isLoading={isAnalyzing}
                        loadingLabel={analyzeElapsed > 0 ? `Analyzing... ${analyzeElapsed}s` : 'Analyzing...'}
                    />
                    <button
                        type="button"
                        onClick={onAnalyze}
                        disabled={!canAnalyze || isAnalyzing}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
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
                    {!canAnalyze && !isPredicting && (
                        <p className="mt-2 text-xs text-amber-600">
                            Complete zones, criteria, and heatmap before running AI analysis.
                        </p>
                    )}
                    {isPredicting && (
                        <p className="mt-2 text-xs text-indigo-600">
                            Zone percentages will update when the heatmap finishes.
                        </p>
                    )}
                </div>
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
                            {criteriaLabel ? `Criteria: ${criteriaLabel} · ` : ''}
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
                <AttentionWorkflowPanel {...workflowProps} />
                {isPredicting && (
                    <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2">
                        Regenerating heatmap ({predictElapsed}s). Zone percentages will update when finished.
                    </p>
                )}
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
                <Section title={`Areas of interest (${displayAutoAois.length})`} icon={<Eye className="h-4 w-4" />}>
                    {manualAois.length > 0 && displayAutoAois.length > 0 && (
                        <p className="mt-2 text-xs text-slate-500">
                            {displayAutoAois.length} AI zone{displayAutoAois.length !== 1 ? 's' : ''}
                            + {manualAois.length} manual zone{manualAois.length !== 1 ? 's' : ''}.
                        </p>
                    )}
                    <div className="mt-3 space-y-2">
                        {displayAutoAois.map((aoi, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-lg">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-800 truncate">{aoi.label}</span>
                                        <AttentionBadge level={aoi.attentionLevel} />
                                        {aoi.lowConfidence && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                                                approx.
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{aoi.description}</p>
                                </div>
                                <button
                                    onClick={() => handleImportOne(aoi)}
                                    disabled={importedLabels.has(aoi.label)}
                                    className="text-xs px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:text-slate-400 disabled:hover:bg-transparent transition-colors whitespace-nowrap"
                                >
                                    {importedLabels.has(aoi.label) ? 'Editable' : 'Convert to editable zone'}
                                </button>
                            </div>
                        ))}
                    </div>
                    {displayAutoAois.length > 0 && (
                        <button
                            onClick={handleImportAll}
                            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Convert all to editable zones
                        </button>
                    )}
                </Section>

                {/* Attention Flow */}
                <Section title="Attention flow" icon={<ArrowRightLeft className="h-4 w-4" />}>
                    <div className="mt-3 space-y-3">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Entry point</p>
                                <p className="text-sm text-slate-800">{analysis.attentionFlow.entryPoint}</p>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Exit point</p>
                                <p className="text-sm text-slate-800">{analysis.attentionFlow.exitPoint}</p>
                            </div>
                        </div>

                        {/* Flow path */}
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Visual path</p>
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
                                <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">Attention leak</p>
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
                <Section title={`Gaze path (${analysis.gazePath.length} fixations)`} icon={<Route className="h-4 w-4" />}>
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
                <Section title={`Neuro-Insights y Gestalt (${analysis.neuroInsights.length})`} icon={<Brain className="h-4 w-4" />}>
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

                {/* Brand Attention (Hosseini 2024) */}
                {analysis.brandAttention && analysis.brandAttention.logos.length > 0 && (
                    <Section title={`Brand attention (${analysis.brandAttention.logos.length} logos)`} icon={<Eye className="h-4 w-4" />}>
                        <div className="mt-3 space-y-3">
                            {/* Score — LLM holistic judgment */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-slate-700">
                                            Brand visibility
                                            <span className="ml-1 text-[10px] text-slate-400 font-normal">(AI evaluation)</span>
                                        </span>
                                        <span className={`text-sm font-bold ${
                                            analysis.brandAttention.brandAttentionScore >= 70 ? 'text-green-600' :
                                            analysis.brandAttention.brandAttentionScore >= 40 ? 'text-amber-600' : 'text-red-600'
                                        }`}>{analysis.brandAttention.brandAttentionScore}/100</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${analysis.brandAttention.brandAttentionScore}%` }} />
                                    </div>
                                </div>
                            </div>

                            <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
                                The visibility score is a qualitative AI evaluation.
                                The saliency % below is the actual heatmap measurement (TranSalNet).
                            </p>

                            {/* Logos — TranSalNet saliency measurement */}
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Saliency measured by heatmap</p>
                            {analysis.brandAttention.logos.map((logo, i) => (
                                <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                                    <div>
                                        <span className="text-sm font-medium text-slate-800">{logo.brand}</span>
                                        <span className="text-xs text-slate-500 ml-2">
                                            ({logo.x.toFixed(0)}%, {logo.y.toFixed(0)}%) {logo.width.toFixed(0)}x{logo.height.toFixed(0)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-2 w-16 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${logo.saliencyScore * 100}%` }} />
                                        </div>
                                        <span className="text-xs font-mono text-slate-600">{(logo.saliencyScore * 100).toFixed(0)}%</span>
                                    </div>
                                </div>
                            ))}

                            {/* Recommendation */}
                            {analysis.brandAttention.recommendation && (
                                <p className="text-xs text-blue-700 bg-blue-50 px-2 py-1.5 rounded">
                                    {analysis.brandAttention.recommendation}
                                </p>
                            )}
                        </div>
                    </Section>
                )}

                {/* Methodology */}
                <Section title="Technical methodology" icon={<BookOpen className="h-4 w-4" />} defaultOpen={false}>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">{analysis.methodology}</p>
                </Section>
            </div>
        </div>
    );
};
