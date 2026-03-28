import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModuleConfig } from '../../types/module';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { getComponentText } from '../../utils/moduleComponent';

interface ImplicitAssociationRendererProps {
    module: ModuleConfig;
    onComplete?: () => void;
}

interface IATTarget {
    id: string;
    name: string;
    imageUrl?: string;
}

interface IATAttribute {
    id: string;
    label: string;
}

interface IATTrial {
    targetId: string;
    targetLabel: string;
    targetImage?: string;
    correctCriterionId: string;
    phase: 'practice' | 'test';
}

interface IATTrialResult {
    targetId: string;
    criterionId: string;
    rt: number;
    correct: boolean;
    phase: string;
}

type IATPhase = 'instructions' | 'priming' | 'trial' | 'feedback' | 'complete';

/**
 * Extract IAT configuration from module structure.
 * Mirrors backend extractIATConfig logic to read targets, attributes, and priming.
 */
const extractConfig = (module: ModuleConfig) => {
    const components = module.structure?.components || [];
    const moduleName = module.name.toLowerCase();

    // Detect test type
    let testType: 'attribute_testing' | 'comparing_attribute' | 'objects_comparing' = 'attribute_testing';
    if (moduleName.includes('objects comparing') || moduleName.includes('object comparing')) {
        testType = 'objects_comparing';
    } else if (moduleName.includes('comparing attribute') || moduleName.includes('comparing attr')) {
        testType = 'comparing_attribute';
    }

    // Priming time
    const primingComp = components.find(c => c.id === 'priming-time');
    const primingTime = parseInt(getComponentText(primingComp) || '400', 10) || 400;

    const targets: IATTarget[] = [];
    const attributes: IATAttribute[] = [];

    if (testType === 'objects_comparing') {
        // Objects: object-N-name, object-N-image
        for (let i = 1; i <= 5; i++) {
            const nameComp = components.find(c => c.id === `object-${i}-name`);
            const nameVal = getComponentText(nameComp);
            if (nameVal) {
                const imageComp = components.find(c => c.id === `object-${i}-image`);
                targets.push({
                    id: `object-${i}`,
                    name: nameVal,
                    imageUrl: getComponentText(imageComp) || undefined,
                });
            }
        }
        // Dimensions as attributes
        const dim1 = components.find(c => c.id === 'dimension-1');
        const dim2 = components.find(c => c.id === 'dimension-2');
        if (dim1) {
            const label = getComponentText(dim1) || dim1.placeholder?.text || 'Dimension 1';
            attributes.push({ id: 'dimension-1', label });
        }
        if (dim2) {
            const label = getComponentText(dim2) || dim2.placeholder?.text || 'Dimension 2';
            attributes.push({ id: 'dimension-2', label });
        }
    } else {
        // Attribute Testing / Comparing Attribute: target-N-name, target-N-image
        for (let i = 1; i <= 5; i++) {
            const nameComp = components.find(c => c.id === `target-${i}-name`);
            const nameVal = getComponentText(nameComp);
            if (nameVal) {
                const imageComp = components.find(c => c.id === `target-${i}-image`);
                targets.push({
                    id: `target-${i}`,
                    name: nameVal,
                    imageUrl: getComponentText(imageComp) || undefined,
                });
            }
        }
        // Attributes from criteria (ranking-list) component
        const criteriaComp = components.find(c =>
            c.id === 'criteria' || (c.type as string) === 'ranking-list'
        );
        if (criteriaComp) {
            try {
                const raw = getComponentText(criteriaComp);
                const parsed = raw ? JSON.parse(raw) : null;
                if (Array.isArray(parsed)) {
                    parsed.forEach((item: { id?: string; label?: string; value?: string }, idx: number) => {
                        attributes.push({
                            id: item.id || `attr-${idx}`,
                            label: item.label || item.value || `Attribute ${idx + 1}`,
                        });
                    });
                }
            } catch {
                // Fallback: dimension-N components
                for (let i = 1; i <= 10; i++) {
                    const dimComp = components.find(c => c.id === `dimension-${i}`);
                    const dimVal = getComponentText(dimComp);
                    if (dimVal) {
                        attributes.push({ id: `dimension-${i}`, label: dimVal });
                    }
                }
            }
        } else {
            // Fallback: dimension-N components
            for (let i = 1; i <= 10; i++) {
                const dimComp = components.find(c => c.id === `dimension-${i}`);
                const dimVal = getComponentText(dimComp);
                if (dimVal) {
                    attributes.push({ id: `dimension-${i}`, label: dimVal });
                }
            }
        }
    }

    return { testType, primingTime, targets, attributes };
};

/**
 * Build trial list from targets and attributes.
 * Each target is tested against each attribute once in test phase,
 * with a subset for practice.
 */
const buildTrials = (
    targets: IATTarget[],
    attributes: IATAttribute[]
): IATTrial[] => {
    const trials: IATTrial[] = [];

    if (targets.length === 0 || attributes.length === 0) return trials;

    // Practice: 1 trial per target with first attribute
    const practiceAttr = attributes[0];
    for (const target of targets) {
        trials.push({
            targetId: target.id,
            targetLabel: target.name,
            targetImage: target.imageUrl,
            correctCriterionId: practiceAttr.id,
            phase: 'practice',
        });
    }

    // Test: each target × each attribute
    for (const attr of attributes) {
        for (const target of targets) {
            trials.push({
                targetId: target.id,
                targetLabel: target.name,
                targetImage: target.imageUrl,
                correctCriterionId: attr.id,
                phase: 'test',
            });
        }
    }

    // Shuffle test trials (Fisher-Yates)
    const practiceCount = targets.length;
    for (let i = trials.length - 1; i >= practiceCount; i--) {
        const j = practiceCount + Math.floor(Math.random() * (i - practiceCount + 1));
        [trials[i], trials[j]] = [trials[j], trials[i]];
    }

    return trials;
};

const PRIMING_SYMBOL = '+';

export const ImplicitAssociationRenderer: React.FC<ImplicitAssociationRendererProps> = ({ module, onComplete }) => {
    const { t } = useTranslation();
    const { saveResponse } = useParticipantStore();

    const { primingTime, targets, attributes } = useMemo(
        () => extractConfig(module),
        [module]
    );

    const trials = useMemo(
        () => buildTrials(targets, attributes),
        [targets, attributes]
    );

    const [phase, setPhase] = useState<IATPhase>('instructions');
    const [trialIndex, setTrialIndex] = useState(0);
    const [results, setResults] = useState<IATTrialResult[]>([]);
    const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
    const trialStartRef = useRef<number>(0);
    const savedRef = useRef(false);
    const trialIndexRef = useRef(0);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Keep ref in sync with state
    useEffect(() => { trialIndexRef.current = trialIndex; }, [trialIndex]);

    // Cleanup all pending timers on unmount
    useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

    const currentTrial = trials[trialIndex] ?? null;

    // Save results when all trials complete
    useEffect(() => {
        if (phase === 'complete' && !savedRef.current) {
            savedRef.current = true;
            saveResponse(module.id, 'iat-trials', JSON.stringify(results));
            // Auto-advance after brief delay
            const timer = setTimeout(() => {
                onComplete?.();
            }, 800);
            timersRef.current.push(timer);
            return () => clearTimeout(timer);
        }
    }, [phase, results, module.id, saveResponse, onComplete]);

    // Start priming for current trial
    const startTrial = useCallback(() => {
        setPhase('priming');
        const id = setTimeout(() => {
            setPhase('trial');
            trialStartRef.current = performance.now();
        }, primingTime);
        timersRef.current.push(id);
    }, [primingTime]);

    // Handle attribute selection during trial
    const handleAttributeSelect = useCallback((attributeId: string) => {
        if (phase !== 'trial' || !currentTrial) return;

        const rt = Math.round(performance.now() - trialStartRef.current);
        const correct = attributeId === currentTrial.correctCriterionId;

        const result: IATTrialResult = {
            targetId: currentTrial.targetId,
            criterionId: attributeId,
            rt,
            correct,
            phase: currentTrial.phase,
        };

        setResults(prev => [...prev, result]);
        setLastCorrect(correct);
        setPhase('feedback');

        // Advance after feedback — use ref to avoid stale trialIndex
        const feedbackId = setTimeout(() => {
            const nextIndex = trialIndexRef.current + 1;
            if (nextIndex >= trials.length) {
                setPhase('complete');
            } else {
                setTrialIndex(nextIndex);
                setPhase('priming');
                const primingId = setTimeout(() => {
                    setPhase('trial');
                    trialStartRef.current = performance.now();
                }, primingTime);
                timersRef.current.push(primingId);
            }
        }, 500);
        timersRef.current.push(feedbackId);
    }, [phase, currentTrial, trials.length, primingTime]);

    // Keyboard handler: left/right arrows or E/I keys (standard IAT)
    useEffect(() => {
        if (phase !== 'trial' || attributes.length < 2) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'e' || e.key === 'E' || e.key === 'ArrowLeft') {
                handleAttributeSelect(attributes[0].id);
            } else if (e.key === 'i' || e.key === 'I' || e.key === 'ArrowRight') {
                handleAttributeSelect(attributes[1].id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, attributes, handleAttributeSelect]);

    // Unconfigured state
    if (targets.length === 0 || attributes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
                <p className="text-gray-400 text-center">
                    {t('iat.notConfigured', 'This implicit association test has not been configured yet.')}
                </p>
            </div>
        );
    }

    // Instructions screen
    if (phase === 'instructions') {
        const isPractice = trialIndex < targets.length;
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
                <div className="w-full max-w-lg space-y-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {module.name}
                    </h2>
                    <div className="space-y-4 text-gray-600">
                        <p>
                            {t('iat.instructions', 'You will see words or images one at a time. Classify each item as quickly as you can.')}
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700">
                                {t('iat.categories', 'Categories:')}
                            </p>
                            <div className="flex justify-center gap-8">
                                {attributes.map((attr, idx) => (
                                    <div key={attr.id} className="text-center">
                                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                                            idx === 0 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                        }`}>
                                            {attr.label}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {idx === 0 ? '← E' : 'I →'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {isPractice && (
                            <p className="text-sm text-amber-600">
                                {t('iat.practiceNote', 'The first few trials are for practice.')}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={startTrial}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        {t('iat.start', 'Start')}
                    </button>
                </div>
            </div>
        );
    }

    // Priming fixation point
    if (phase === 'priming') {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <span className="text-5xl font-bold text-gray-400 select-none">{PRIMING_SYMBOL}</span>
            </div>
        );
    }

    // Progress indicator
    const progress = trials.length > 0 ? Math.round((trialIndex / trials.length) * 100) : 0;

    // Trial screen
    if (phase === 'trial' && currentTrial) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 select-none">
                {/* Progress bar */}
                <div className="w-full max-w-lg mb-6">
                    <div className="h-1.5 bg-gray-200 rounded-full">
                        <div
                            className="h-1.5 bg-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-center">
                        {trialIndex + 1} / {trials.length}
                        {currentTrial.phase === 'practice' && ` (${t('iat.practice', 'practice')})`}
                    </p>
                </div>

                {/* Attribute labels at top */}
                <div className="flex justify-between w-full max-w-lg mb-8">
                    {attributes.map((attr, idx) => (
                        <div
                            key={attr.id}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                                idx === 0 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}
                        >
                            {attr.label}
                        </div>
                    ))}
                </div>

                {/* Target stimulus */}
                <div className="flex items-center justify-center min-h-[160px] mb-8">
                    {currentTrial.targetImage ? (
                        <img
                            src={currentTrial.targetImage}
                            alt={currentTrial.targetLabel}
                            className="max-h-40 max-w-xs object-contain"
                        />
                    ) : (
                        <span className="text-3xl font-bold text-gray-900">
                            {currentTrial.targetLabel}
                        </span>
                    )}
                </div>

                {/* Touch/click buttons for mobile */}
                <div className="flex gap-4 w-full max-w-lg">
                    {attributes.map((attr, idx) => (
                        <button
                            key={attr.id}
                            onClick={() => handleAttributeSelect(attr.id)}
                            className={`flex-1 py-4 rounded-lg font-semibold text-lg transition-colors ${
                                idx === 0
                                    ? 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
                                    : 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700'
                            }`}
                        >
                            {attr.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Feedback screen
    if (phase === 'feedback') {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                {lastCorrect ? (
                    <span className="text-4xl text-green-500">&#10003;</span>
                ) : (
                    <span className="text-4xl text-red-500">&#10007;</span>
                )}
            </div>
        );
    }

    // Complete screen
    if (phase === 'complete') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
                <div className="text-center space-y-4">
                    <div className="text-5xl">&#10003;</div>
                    <p className="text-lg font-medium text-gray-700">
                        {t('iat.complete', 'Test completed. Thank you!')}
                    </p>
                </div>
            </div>
        );
    }

    return null;
};
