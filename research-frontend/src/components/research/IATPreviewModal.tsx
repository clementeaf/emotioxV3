/**
 * IAT Preview Modal
 *
 * Shows a visual simulation of the IAT test flow using the researcher's configured
 * targets, criteria, timing, and instructions. Not fully interactive — demonstrates
 * what the participant will see across each phase.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, RotateCcw, ChevronRight } from 'lucide-react';
import { resolveMediaUrl } from '../../services/media.service';

type TestType = 'attribute_testing' | 'comparing_attribute' | 'objects_comparing';

interface Target {
    id: string;
    name: string;
    imageUrl?: string;
}

interface Criterion {
    id: string;
    label: string;
    targetId?: string;
    hidden?: boolean;
}

interface IATPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    testType: TestType;
    targets: Target[];
    criteria: Criterion[];
    primingTime: number;
    dimensions?: { left: string; right: string };
    criteriaCategories?: { left: string; right: string };
    exerciseInstructions?: string;
    testInstructions?: string;
}

type Phase = 'instructions' | 'priming' | 'trial' | 'feedback' | 'done';

const TEST_TYPE_LABELS: Record<TestType, string> = {
    attribute_testing: 'Attribute Testing',
    comparing_attribute: 'Comparing Attribute',
    objects_comparing: 'Objects Comparing',
};

export const IATPreviewModal = ({
    isOpen,
    onClose,
    testType,
    targets,
    criteria,
    primingTime,
    dimensions,
    criteriaCategories,
    exerciseInstructions,
    testInstructions,
}: IATPreviewModalProps) => {
    const [phase, setPhase] = useState<Phase>('instructions');
    const [trialIndex, setTrialIndex] = useState(0);
    const [showPriming, setShowPriming] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const visibleCriteria = criteria.filter(c => !c.hidden && c.label.trim());

    // Build trial sequence based on test type
    const trials = buildTrials(testType, targets, visibleCriteria);

    const resetPreview = useCallback(() => {
        setPhase('instructions');
        setTrialIndex(0);
        setShowPriming(false);
        setAutoPlay(false);
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    useEffect(() => {
        if (isOpen) resetPreview();
    }, [isOpen, resetPreview]);

    // Auto-play: priming → trial transition
    useEffect(() => {
        if (phase === 'priming' && showPriming) {
            timerRef.current = setTimeout(() => {
                setShowPriming(false);
                setPhase('trial');
            }, primingTime);
            return () => { if (timerRef.current) clearTimeout(timerRef.current); };
        }
    }, [phase, showPriming, primingTime]);

    const startTrial = useCallback(() => {
        if (trials.length === 0) {
            setPhase('done');
            return;
        }
        setShowPriming(true);
        setPhase('priming');
    }, [trials.length]);

    const nextTrial = useCallback(() => {
        if (trialIndex + 1 >= trials.length) {
            setPhase('done');
            return;
        }
        setTrialIndex(prev => prev + 1);
        setShowPriming(true);
        setPhase('priming');
    }, [trialIndex, trials.length]);

    const handleAutoPlay = useCallback(() => {
        setAutoPlay(true);
        startTrial();
    }, [startTrial]);

    // Auto-advance in autoplay mode
    useEffect(() => {
        if (autoPlay && phase === 'trial') {
            timerRef.current = setTimeout(() => {
                nextTrial();
            }, 1500);
            return () => { if (timerRef.current) clearTimeout(timerRef.current); };
        }
    }, [autoPlay, phase, nextTrial]);

    if (!isOpen) return null;

    const currentTrial = trials[trialIndex];

    const leftLabel = testType === 'comparing_attribute'
        ? (dimensions?.left || 'Yes')
        : testType === 'objects_comparing'
            ? (criteriaCategories?.left || 'Positive')
            : (targets[0]?.name || 'Target 1');

    const rightLabel = testType === 'comparing_attribute'
        ? (dimensions?.right || 'No')
        : testType === 'objects_comparing'
            ? (criteriaCategories?.right || 'Negative')
            : (targets[1]?.name || 'Target 2');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Preview
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                            {TEST_TYPE_LABELS[testType]}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={resetPreview}
                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                            title="Reset"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Preview area */}
                <div className="relative h-[400px] flex items-center justify-center bg-slate-50">
                    {/* Response labels — always visible during trials */}
                    {(phase === 'priming' || phase === 'trial') && (
                        <>
                            <div className="absolute top-4 left-6 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-blue-600 text-xs font-mono">
                                A — {leftLabel}
                            </div>
                            <div className="absolute top-4 right-6 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-blue-600 text-xs font-mono">
                                L — {rightLabel}
                            </div>
                        </>
                    )}

                    {phase === 'instructions' && (
                        <div className="text-center px-8 space-y-6">
                            <p className="text-gray-600 text-sm leading-relaxed max-w-md mx-auto">
                                {exerciseInstructions || testInstructions || 'Classify items as quickly as you can using the keyboard or on-screen buttons.'}
                            </p>
                            <div className="flex items-center gap-3 justify-center">
                                <button
                                    onClick={startTrial}
                                    className="px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                    Step through
                                </button>
                                <button
                                    onClick={handleAutoPlay}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    <Play className="h-4 w-4" />
                                    Auto play
                                </button>
                            </div>
                            <p className="text-gray-500 text-xs">
                                {targets.length} target{targets.length !== 1 ? 's' : ''} · {visibleCriteria.length} criteria · {primingTime}ms priming
                            </p>
                        </div>
                    )}

                    {phase === 'priming' && showPriming && currentTrial && (
                        <div className="text-center animate-pulse">
                            {currentTrial.primingImage ? (
                                <img
                                    src={resolveMediaUrl(currentTrial.primingImage)}
                                    alt={currentTrial.primingLabel}
                                    className="max-h-48 max-w-xs mx-auto rounded"
                                />
                            ) : (
                                <span className="text-3xl font-bold text-gray-900">
                                    {currentTrial.primingLabel}
                                </span>
                            )}
                            <p className="text-gray-500 text-xs mt-4">{primingTime}ms</p>
                        </div>
                    )}

                    {phase === 'trial' && currentTrial && (
                        <div className="text-center space-y-8">
                            <div>
                                {currentTrial.stimulusImage ? (
                                    <div className="space-y-2">
                                        <img
                                            src={resolveMediaUrl(currentTrial.stimulusImage)}
                                            alt={currentTrial.stimulusLabel}
                                            className="max-h-40 max-w-xs mx-auto rounded object-contain"
                                        />
                                        <span className="text-sm text-gray-600 block">{currentTrial.stimulusLabel}</span>
                                    </div>
                                ) : (
                                    <span className="text-2xl font-semibold text-gray-900">
                                        {currentTrial.stimulusLabel}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-center gap-6">
                                <button className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-medium hover:bg-gray-50 transition-colors min-w-[120px]">
                                    {leftLabel}
                                </button>
                                <button className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-medium hover:bg-gray-50 transition-colors min-w-[120px]">
                                    {rightLabel}
                                </button>
                            </div>
                            {!autoPlay && (
                                <button
                                    onClick={nextTrial}
                                    className="text-gray-400 hover:text-gray-600 text-xs transition-colors"
                                >
                                    Next trial ({trialIndex + 1}/{trials.length})
                                </button>
                            )}
                            {autoPlay && (
                                <p className="text-gray-600 text-xs">
                                    Trial {trialIndex + 1} of {trials.length}
                                </p>
                            )}
                        </div>
                    )}

                    {phase === 'done' && (
                        <div className="text-center space-y-4">
                            <p className="text-gray-900 text-lg font-medium">Preview complete</p>
                            <p className="text-gray-500 text-sm">
                                {trials.length} trial{trials.length !== 1 ? 's' : ''} shown
                            </p>
                            <button
                                onClick={resetPreview}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 mx-auto"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Restart
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                        This is a simplified preview. Actual test includes randomization and timing controls.
                    </p>
                    <div className="flex items-center gap-1.5">
                        {trials.map((_, i) => (
                            <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                    i < trialIndex ? 'bg-blue-500' : i === trialIndex && phase !== 'instructions' ? 'bg-gray-900' : 'bg-gray-300'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Trial builder ───────────────────────────────────────────────

interface PreviewTrial {
    primingLabel: string;
    primingImage?: string;
    stimulusLabel: string;
    stimulusImage?: string;
}

function buildTrials(
    testType: TestType,
    targets: Target[],
    criteria: Criterion[],
): PreviewTrial[] {
    if (targets.length === 0 || criteria.length === 0) return [];

    const trials: PreviewTrial[] = [];

    if (testType === 'attribute_testing') {
        // Show each criterion with its assigned target as priming
        for (const crit of criteria) {
            const target = targets.find(t =>
                t.id === crit.targetId || t.name === crit.targetId
            ) || targets[0];
            trials.push({
                primingLabel: target.name,
                primingImage: target.imageUrl,
                stimulusLabel: crit.label,
            });
        }
    } else if (testType === 'comparing_attribute') {
        // Show each object + criterion pair (sample: first few)
        for (const target of targets) {
            for (const crit of criteria.slice(0, 3)) {
                trials.push({
                    primingLabel: target.name,
                    primingImage: target.imageUrl,
                    stimulusLabel: crit.label,
                });
            }
        }
    } else {
        // Objects Comparing: show criteria classification, then target classification
        for (const crit of criteria.slice(0, 4)) {
            trials.push({
                primingLabel: '+',
                stimulusLabel: crit.label,
            });
        }
        for (const target of targets.slice(0, 3)) {
            trials.push({
                primingLabel: '+',
                stimulusLabel: target.name,
                stimulusImage: target.imageUrl,
            });
        }
    }

    return trials;
}

export default IATPreviewModal;
