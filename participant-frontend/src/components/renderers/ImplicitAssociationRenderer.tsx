import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModuleConfig } from '../../types/module';
import { useParticipantStore } from '../../stores/useParticipantStore';
import type { ModuleComponent } from '../../types/module';
import { getComponentText, getFileUploadMediaRef } from '../../utils/moduleComponent';
import { mediaService, resolveMediaUrl } from '../../services/media.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImplicitAssociationRendererProps {
    module: ModuleConfig;
    onComplete?: () => void;
}

interface IATTarget {
    id: string;
    name: string;
    /** Ready-to-use URL when absolute, relative, or after resolution */
    imageUrl?: string;
    /** When set, participant resolves via media API (S3 key from builder) */
    imageStorageKey?: string;
}

interface IATAttribute {
    id: string;
    label: string;
    imageUrl?: string;
    imageStorageKey?: string;
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

/** A block = one step in the 3-step IAT flow */
interface IATBlock {
    /** 1-based step number */
    step: number;
    /** Left category label */
    leftLabel: string;
    /** Right category label */
    rightLabel: string;
    /** Trials belonging to this block */
    trials: IATTrial[];
}

/**
 * Phases within a single block:
 * intro → take-note → priming → trial → feedback → (loop trial) → next block or complete
 */
type IATPhase = 'intro' | 'keep-in-mind' | 'take-note' | 'priming' | 'trial' | 'feedback' | 'complete';

/**
 * Maps file-upload to an absolute URL or an S3 key for async resolution (matches EyeTracking pattern).
 */
function resolveTargetImageFromUpload(component: ModuleComponent | undefined): {
    imageUrl?: string;
    imageStorageKey?: string;
} {
    const ref = getFileUploadMediaRef(component);
    if (!ref) {
        return {};
    }
    if (ref.url) {
        const u = ref.url.trim();
        if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:')) {
            return { imageUrl: u };
        }
        return { imageUrl: resolveMediaUrl(u) };
    }
    if (ref.s3Key) {
        return { imageStorageKey: ref.s3Key };
    }
    return {};
}

// ---------------------------------------------------------------------------
// Config extraction (mirrors backend extractIATConfig)
// ---------------------------------------------------------------------------

const extractConfig = (module: ModuleConfig) => {
    const components = module.structure?.components || [];
    const moduleName = module.name.toLowerCase();

    let testType: 'attribute_testing' | 'comparing_attribute' | 'objects_comparing' = 'attribute_testing';
    // "Comparing Attribute" = objects + dimensions (objects_comparing extractor)
    // "Objects Comparing" = targets + positive/negative criteria (comparing_attribute extractor)
    if (moduleName.includes('comparing attribute') || moduleName.includes('comparing attr')) {
        testType = 'objects_comparing';
    } else if (moduleName.includes('objects comparing') || moduleName.includes('object comparing')) {
        testType = 'comparing_attribute';
    }

    const primingComp = components.find(c => c.id === 'priming-time');
    const primingTime = parseInt(getComponentText(primingComp) || '400', 10) || 400;

    const targets: IATTarget[] = [];
    const attributes: IATAttribute[] = [];

    if (testType === 'objects_comparing') {
        for (let i = 1; i <= 5; i++) {
            const nameComp = components.find(c => c.id === `object-${i}-name`);
            const nameVal = getComponentText(nameComp);
            if (nameVal) {
                const imageComp = components.find(c => c.id === `object-${i}-image`);
                const img = resolveTargetImageFromUpload(imageComp);
                targets.push({
                    id: `object-${i}`,
                    name: nameVal,
                    ...img,
                });
            }
        }
        const dim1 = components.find(c => c.id === 'dimension-1');
        const dim2 = components.find(c => c.id === 'dimension-2');
        if (dim1) attributes.push({ id: 'dimension-1', label: getComponentText(dim1) || dim1.placeholder?.text || 'Dimension 1' });
        if (dim2) attributes.push({ id: 'dimension-2', label: getComponentText(dim2) || dim2.placeholder?.text || 'Dimension 2' });
    } else {
        for (let i = 1; i <= 5; i++) {
            const nameComp = components.find(c => c.id === `target-${i}-name`);
            const nameVal = getComponentText(nameComp);
            if (nameVal) {
                const imageComp = components.find(c => c.id === `target-${i}-image`);
                const img = resolveTargetImageFromUpload(imageComp);
                targets.push({
                    id: `target-${i}`,
                    name: nameVal,
                    ...img,
                });
            }
        }
        const criteriaComp = components.find(c =>
            c.id === 'criteria' || c.type === 'ranking-list'
        );
        if (criteriaComp) {
            // research-frontend RankingItemsEditor persists JSON.stringify({ items, randomize }), not a bare array
            let items: Array<{ id?: string; label?: string; value?: string; image?: { s3Key?: string; url?: string } }> | null = null;
            const directVal = criteriaComp.value;
            if (
                directVal &&
                typeof directVal === 'object' &&
                !Array.isArray(directVal) &&
                'items' in directVal &&
                Array.isArray((directVal as { items: unknown }).items)
            ) {
                items = (directVal as { items: Array<{ id?: string; label?: string; value?: string; image?: { s3Key?: string; url?: string } }> }).items;
            }
            const raw = getComponentText(criteriaComp);
            if (!items && raw) {
                try {
                    const parsed: unknown = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        items = parsed;
                    } else if (
                        parsed &&
                        typeof parsed === 'object' &&
                        'items' in parsed &&
                        Array.isArray((parsed as { items: unknown }).items)
                    ) {
                        items = (parsed as { items: Array<{ id?: string; label?: string; value?: string; image?: { s3Key?: string; url?: string } }> }).items;
                    }
                } catch { /* ignore parse errors */ }
            }
            if (!items && Array.isArray(criteriaComp.settings?.items)) {
                items = criteriaComp.settings.items as Array<{ id?: string; label?: string; value?: string; image?: { s3Key?: string; url?: string } }>;
            }
            if (items) {
                items.forEach((item, idx) => {
                    const label = (item.label || item.value || '').trim();
                    if (!label) {
                        return;
                    }
                    // Extract image from criteria item (IATCriteriaEditor stores { s3Key, url })
                    const img = item.image as { s3Key?: string; url?: string } | undefined;
                    const imageUrl = img?.url?.trim() || undefined;
                    const imageStorageKey = img?.s3Key || undefined;
                    attributes.push({
                        id: item.id || `attr-${idx}`,
                        label: label || `Attribute ${idx + 1}`,
                        imageUrl,
                        imageStorageKey,
                    });
                });
            } else {
                for (let i = 1; i <= 10; i++) {
                    const dimComp = components.find(c => c.id === `dimension-${i}`);
                    const dimVal = getComponentText(dimComp);
                    if (dimVal) attributes.push({ id: `dimension-${i}`, label: dimVal });
                }
            }
        } else {
            for (let i = 1; i <= 10; i++) {
                const dimComp = components.find(c => c.id === `dimension-${i}`);
                const dimVal = getComponentText(dimComp);
                if (dimVal) attributes.push({ id: `dimension-${i}`, label: dimVal });
            }
        }

        // Comparing Attribute template: criteria-1 / criteria-2 when ranking list produced no items (researcher used only Positive/Negative fields)
        if (testType === 'comparing_attribute' && attributes.length === 0) {
            const c1 = components.find(c => c.id === 'criteria-1');
            const c2 = components.find(c => c.id === 'criteria-2');
            const l1 = (getComponentText(c1) || c1?.placeholder?.text || '').trim();
            const l2 = (getComponentText(c2) || c2?.placeholder?.text || '').trim();
            if (l1 && l2) {
                attributes.length = 0;
                attributes.push({ id: 'criteria-1', label: l1 });
                attributes.push({ id: 'criteria-2', label: l2 });
            }
        }
    }

    // Instruction texts (researcher may customise via builder textarea)
    const exerciseComp = components.find(c => c.id === 'exercise-instructions');
    const testComp = components.find(c => c.id === 'test-instructions');
    const rawExercise = getComponentText(exerciseComp) || exerciseComp?.placeholder?.text || '';
    const rawTest = getComponentText(testComp) || testComp?.placeholder?.text || '';

    // Interpolate [[Object N]] / [[Target N]] placeholders with real target names
    const interpolateTargets = (text: string): string =>
        text.replace(/\[\[(Object|Target)\s*(\d+)\]\]/gi, (_match, _label, num) => {
            const idx = parseInt(num, 10) - 1;
            return targets[idx]?.name ?? `Object ${num}`;
        });

    const exerciseInstructions = interpolateTargets(rawExercise);
    const testInstructions = interpolateTargets(rawTest);

    const showResultsComp = components.find(c => c.id === 'show-results');
    const showResults = getComponentText(showResultsComp) === 'true';

    return { testType, primingTime, targets, attributes, exerciseInstructions, testInstructions, showResults };
};

// ---------------------------------------------------------------------------
// Block / trial construction
// ---------------------------------------------------------------------------

/** Fisher-Yates shuffle (in place) */
const shuffle = <T,>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

/**
 * Build the 3-block IAT structure:
 *   Block 1 — Classify by attributes only (text stimuli = attribute labels)
 *   Block 2 — Classify by targets only (image/text stimuli = target names/images)
 *   Block 3 — Combined (targets categorised under combined labels)
 */
const buildBlocks = (
    targets: IATTarget[],
    attributes: IATAttribute[]
): IATBlock[] => {
    if (targets.length < 2 || attributes.length < 2) return [];

    const attrLeft = attributes[0];
    const attrRight = attributes[1];
    const targetLeft = targets[0];
    const targetRight = targets[targets.length - 1];

    // --- Block 1: attribute classification (text or image stimuli) ---
    // Distribute criteria evenly: first half → left, second half → right
    const block1Trials: IATTrial[] = [];
    for (let idx = 0; idx < attributes.length; idx++) {
        const attr = attributes[idx];
        block1Trials.push({
            targetId: attr.id,
            targetLabel: attr.label,
            targetImage: attr.imageUrl,
            correctCriterionId: idx < attributes.length / 2 ? 'attr-left' : 'attr-right',
            phase: 'test',
        });
    }
    // Repeat to get enough trials (min ~6)
    const minBlock1 = Math.max(6, attributes.length * 2);
    while (block1Trials.length < minBlock1) {
        for (let idx = 0; idx < attributes.length; idx++) {
            if (block1Trials.length >= minBlock1) break;
            const attr = attributes[idx];
            block1Trials.push({
                targetId: attr.id,
                targetLabel: attr.label,
                targetImage: attr.imageUrl,
                correctCriterionId: idx < attributes.length / 2 ? 'attr-left' : 'attr-right',
                phase: 'test',
            });
        }
    }
    shuffle(block1Trials);

    // --- Block 2: target classification (image or text stimuli) ---
    const block2Trials: IATTrial[] = [];
    for (const target of targets) {
        // Assign left/right: first half → left target, second half → right target
        // Simple heuristic: compare index
        const idx = targets.indexOf(target);
        const correct = idx < targets.length / 2 ? targetLeft.id : targetRight.id;
        block2Trials.push({
            targetId: target.id,
            targetLabel: target.name,
            targetImage: target.imageUrl,
            correctCriterionId: correct,
            phase: 'test',
        });
    }
    const minBlock2 = Math.max(6, targets.length * 2);
    while (block2Trials.length < minBlock2) {
        for (const target of targets) {
            if (block2Trials.length >= minBlock2) break;
            const idx = targets.indexOf(target);
            block2Trials.push({
                targetId: target.id,
                targetLabel: target.name,
                targetImage: target.imageUrl,
                correctCriterionId: idx < targets.length / 2 ? targetLeft.id : targetRight.id,
                phase: 'test',
            });
        }
    }
    shuffle(block2Trials);

    // --- Block 3: combined (targets + attribute words mixed) ---
    const block3Trials: IATTrial[] = [];
    // Target stimuli — correct = same side as block 2
    for (const target of targets) {
        const idx = targets.indexOf(target);
        const correct = idx < targets.length / 2 ? 'combined-left' : 'combined-right';
        block3Trials.push({
            targetId: target.id,
            targetLabel: target.name,
            targetImage: target.imageUrl,
            correctCriterionId: correct,
            phase: 'test',
        });
    }
    // Attribute stimuli — correct = same side as block 1
    for (let idx = 0; idx < attributes.length; idx++) {
        const attr = attributes[idx];
        block3Trials.push({
            targetId: attr.id,
            targetLabel: attr.label,
            targetImage: attr.imageUrl,
            correctCriterionId: idx < attributes.length / 2 ? 'combined-left' : 'combined-right',
            phase: 'test',
        });
    }
    const minBlock3 = Math.max(8, (targets.length + attributes.length) * 2);
    while (block3Trials.length < minBlock3) {
        for (const target of targets) {
            if (block3Trials.length >= minBlock3) break;
            const idx = targets.indexOf(target);
            block3Trials.push({
                targetId: target.id,
                targetLabel: target.name,
                targetImage: target.imageUrl,
                correctCriterionId: idx < targets.length / 2 ? 'combined-left' : 'combined-right',
                phase: 'test',
            });
        }
        for (let idx = 0; idx < attributes.length; idx++) {
            if (block3Trials.length >= minBlock3) break;
            const attr = attributes[idx];
            block3Trials.push({
                targetId: attr.id,
                targetLabel: attr.label,
                targetImage: attr.imageUrl,
                correctCriterionId: idx < attributes.length / 2 ? 'combined-left' : 'combined-right',
                phase: 'test',
            });
        }
    }
    shuffle(block3Trials);

    return [
        {
            step: 1,
            leftLabel: attrLeft.label,
            rightLabel: attrRight.label,
            trials: block1Trials,
        },
        {
            step: 2,
            leftLabel: targetLeft.name,
            rightLabel: targetRight.name,
            trials: block2Trials,
        },
        {
            step: 3,
            leftLabel: `${targetLeft.name} or ${attrLeft.label.toLowerCase()}`,
            rightLabel: `${targetRight.name} or ${attrRight.label.toLowerCase()}`,
            trials: block3Trials,
        },
    ];
};

// ---------------------------------------------------------------------------
// Priming symbol
// ---------------------------------------------------------------------------

const PRIMING_SYMBOL = '+';
const TOTAL_BLOCKS = 3;

/** Splits instruction text into sentences and renders them as a numbered list. */
const InstructionList: React.FC<{ text: string }> = ({ text }) => {
    const sentences = text
        .split(/(?<=[.!])\s+/)
        .map(s => s.trim())
        .filter(Boolean);

    if (sentences.length <= 1) {
        return <p className="text-gray-600">{text}</p>;
    }

    return (
        <ol className="space-y-3 text-gray-600">
            {sentences.map((sentence, i) => (
                <li key={i}>
                    <span className="font-semibold">{i + 1})</span> {sentence}
                </li>
            ))}
        </ol>
    );
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ImplicitAssociationRenderer: React.FC<ImplicitAssociationRendererProps> = ({ module, onComplete }) => {
    const { t } = useTranslation();
    const { saveResponse } = useParticipantStore();

    const { primingTime, targets, attributes, exerciseInstructions, testInstructions, showResults } = useMemo(
        () => extractConfig(module),
        [module]
    );

    const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});

    useEffect(() => {
        let cancelled = false;
        (async (): Promise<void> => {
            const next: Record<string, string> = {};
            const pending = [
                ...targets.filter(t => t.imageStorageKey && !t.imageUrl),
                ...attributes.filter(a => a.imageStorageKey && !a.imageUrl),
            ];
            for (const item of pending) {
                try {
                    next[item.id] = await mediaService.getMediaUrl(item.imageStorageKey!);
                } catch {
                    /* ignore resolution errors */
                }
            }
            if (!cancelled) {
                setResolvedImages(next);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [targets, attributes]);

    const targetsWithResolvedImages = useMemo(
        () =>
            targets.map((t) => ({
                ...t,
                imageUrl: t.imageUrl || resolvedImages[t.id],
            })),
        [targets, resolvedImages]
    );

    const attributesWithResolvedImages = useMemo(
        () =>
            attributes.map((a) => ({
                ...a,
                imageUrl: a.imageUrl || resolvedImages[a.id],
            })),
        [attributes, resolvedImages]
    );

    const blocks = useMemo(
        () => buildBlocks(targetsWithResolvedImages, attributesWithResolvedImages),
        [targetsWithResolvedImages, attributesWithResolvedImages]
    );

    const [blockIndex, setBlockIndex] = useState(0);
    const [phase, setPhase] = useState<IATPhase>('intro');
    const [trialIndex, setTrialIndex] = useState(0);
    const [results, setResults] = useState<IATTrialResult[]>([]);
    const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
    const trialStartRef = useRef<number>(0);
    const savedRef = useRef(false);
    const trialIndexRef = useRef(0);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const currentBlock = blocks[blockIndex] ?? null;
    const currentTrial = currentBlock?.trials[trialIndex] ?? null;

    useEffect(() => { trialIndexRef.current = trialIndex; }, [trialIndex]);
    useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

    // Save results when all blocks complete
    useEffect(() => {
        if (phase === 'complete' && !savedRef.current) {
            savedRef.current = true;
            saveResponse(module.id, 'iat-trials', JSON.stringify(results));
            const timer = setTimeout(() => onComplete?.(), 800);
            timersRef.current.push(timer);
            return () => clearTimeout(timer);
        }
    }, [phase, results, module.id, saveResponse, onComplete]);

    // Start priming → trial
    const startTrial = useCallback(() => {
        setPhase('priming');
        const id = setTimeout(() => {
            setPhase('trial');
            trialStartRef.current = performance.now();
        }, primingTime);
        timersRef.current.push(id);
    }, [primingTime]);

    // Handle category selection during trial
    const handleSelect = useCallback((side: 'left' | 'right') => {
        if (phase !== 'trial' || !currentTrial || !currentBlock) return;

        const rt = Math.round(performance.now() - trialStartRef.current);

        // Determine which criterion ID the side maps to
        let selectedCriterionId: string;
        if (currentBlock.step === 3) {
            selectedCriterionId = side === 'left' ? 'combined-left' : 'combined-right';
        } else if (currentBlock.step === 2) {
            selectedCriterionId = side === 'left' ? targets[0].id : targets[targets.length - 1].id;
        } else {
            // Block 1: side-based IDs matching block 1 trial construction
            selectedCriterionId = side === 'left' ? 'attr-left' : 'attr-right';
        }

        const correct = selectedCriterionId === currentTrial.correctCriterionId;

        const result: IATTrialResult = {
            targetId: currentTrial.targetId,
            criterionId: selectedCriterionId,
            rt,
            correct,
            phase: `block-${currentBlock.step}`,
        };

        setResults(prev => [...prev, result]);
        setLastCorrect(correct);
        setPhase('feedback');

        const feedbackId = setTimeout(() => {
            const nextIdx = trialIndexRef.current + 1;
            if (nextIdx >= currentBlock.trials.length) {
                // Block finished — move to next block or complete
                const nextBlock = blockIndex + 1;
                if (nextBlock >= blocks.length) {
                    setPhase('complete');
                } else {
                    setBlockIndex(nextBlock);
                    setTrialIndex(0);
                    setPhase('take-note');
                }
            } else {
                setTrialIndex(nextIdx);
                setPhase('priming');
                const primingId = setTimeout(() => {
                    setPhase('trial');
                    trialStartRef.current = performance.now();
                }, primingTime);
                timersRef.current.push(primingId);
            }
        }, 500);
        timersRef.current.push(feedbackId);
    }, [phase, currentTrial, currentBlock, blockIndex, blocks.length, targets, attributes, primingTime]);

    // Keyboard: A (left) / L (right) as in reference design
    useEffect(() => {
        if (phase !== 'trial') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key === 'a' || key === 'arrowleft') {
                handleSelect('left');
            } else if (key === 'l' || key === 'arrowright') {
                handleSelect('right');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, handleSelect]);

    // Space / Enter to advance from intro screens
    useEffect(() => {
        if (phase !== 'take-note') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                startTrial();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, startTrial]);

    // Block progress percentage
    const blockProgress = currentBlock && currentBlock.trials.length > 0
        ? Math.round(((blockIndex * 100) + (trialIndex / currentBlock.trials.length) * 100) / TOTAL_BLOCKS)
        : Math.round(((blockIndex + 1) / TOTAL_BLOCKS) * 100);

    // -----------------------------------------------------------------------
    // Unconfigured
    // -----------------------------------------------------------------------

    if (targets.length < 2 || attributes.length < 2 || blocks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
                <p className="text-gray-400 text-center">
                    {t('iat.notConfigured', 'This implicit association test has not been configured yet.')}
                </p>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Intro screen (shown once at the very beginning)
    // -----------------------------------------------------------------------

    if (phase === 'intro') {
        // When exerciseInstructions is available, skip keep-in-mind (instructions are self-contained)
        const nextPhase = exerciseInstructions ? 'take-note' : 'keep-in-mind';
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
                <div className="w-full max-w-lg space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">
                        {t('iat.introTitle', 'In this section')}
                    </h2>
                    {exerciseInstructions ? (
                        <InstructionList text={exerciseInstructions} />
                    ) : (
                        <>
                            <p className="text-gray-600">
                                {t('iat.introDescription', 'You will be presented with words or images to classify into categories using either the \'A\' or \'L\' key.')}
                            </p>
                            <p className="text-gray-600">
                                {t('iat.introSpeed', 'Try to go as fast as possible while making as few mistakes as possible.')}
                            </p>
                        </>
                    )}
                    <button
                        onClick={() => setPhase(nextPhase)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        {exerciseInstructions ? t('iat.start', 'Start') : t('iat.next', 'Next')}
                    </button>
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Keep in mind screen (only shown when no custom exerciseInstructions)
    // -----------------------------------------------------------------------

    if (phase === 'keep-in-mind') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
                {/* Step progress pill */}
                <StepProgressPill step={1} total={TOTAL_BLOCKS} percent={0} />

                <div className="w-full max-w-lg space-y-6 mt-8">
                    <h2 className="text-xl font-bold text-gray-900">
                        {t('iat.keepInMindTitle', 'Keep in mind')}
                    </h2>
                    <ol className="space-y-3 text-gray-600">
                        <li>
                            <span className="font-semibold">1)</span>{' '}
                            {t('iat.rule1', 'Labels at the top of the screen indicate which category goes with which key.')}
                        </li>
                        <li>
                            <span className="font-semibold">2)</span>{' '}
                            {t('iat.rule2', 'Each word or image has a correct category classification.')}
                        </li>
                        <li>
                            <span className="font-semibold">3)</span>{' '}
                            {t('iat.rule3', 'Keep your index fingers on the A and L keys to enable a rapid response.')}
                        </li>
                        <li>
                            <span className="font-semibold">4)</span>{' '}
                            {t('iat.rule4', 'The test gives no results if you go slow, please try to go as fast as possible.')}
                        </li>
                    </ol>
                    <button
                        onClick={() => setPhase('take-note')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                        {t('iat.start', 'Start')}
                    </button>
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Take note screen (shown before each block's trials)
    // -----------------------------------------------------------------------

    if (phase === 'take-note' && currentBlock) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
                <StepProgressPill
                    step={currentBlock.step}
                    total={TOTAL_BLOCKS}
                    percent={Math.round(((currentBlock.step - 1) / TOTAL_BLOCKS) * 100)}
                />

                <div className="w-full max-w-lg space-y-6 mt-8">
                    <h2 className="text-xl font-bold text-gray-900">
                        {t('iat.takeNoteTitle', 'Take note')}
                    </h2>
                    {testInstructions ? (
                        <InstructionList text={testInstructions} />
                    ) : (
                        <>
                            <p className="text-gray-600">
                                {t('iat.takeNoteCategories', 'Take note of the categories below')}
                            </p>
                            <p className="text-gray-600">
                                {t('iat.takeNoteFingers', 'Position your index fingers')}
                            </p>
                        </>
                    )}
                    <p className="text-gray-500 text-sm">
                        {t('iat.takeNoteBegin', 'Press the space bar (or one of the buttons) to begin')}
                    </p>

                    {/* Category buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={startTrial}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            A = {currentBlock.leftLabel}
                        </button>
                        <button
                            onClick={startTrial}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            L = {currentBlock.rightLabel}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Priming fixation point
    // -----------------------------------------------------------------------

    if (phase === 'priming') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                {currentBlock && (
                    <StepProgressPill step={currentBlock.step} total={TOTAL_BLOCKS} percent={blockProgress} />
                )}
                <div className="flex-1 flex items-center justify-center mt-8">
                    <span className="text-5xl font-bold text-gray-400 select-none">{PRIMING_SYMBOL}</span>
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Trial screen
    // -----------------------------------------------------------------------

    if (phase === 'trial' && currentTrial && currentBlock) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 select-none">
                <StepProgressPill step={currentBlock.step} total={TOTAL_BLOCKS} percent={blockProgress} />

                {/* Target stimulus */}
                <div className="flex items-center justify-center min-h-[200px] my-8">
                    {currentTrial.targetImage ? (
                        <img
                            src={currentTrial.targetImage}
                            alt={currentTrial.targetLabel}
                            className="max-h-48 max-w-xs object-contain"
                        />
                    ) : (
                        <span className="text-3xl font-bold text-gray-900">
                            {currentTrial.targetLabel}
                        </span>
                    )}
                </div>

                {/* Category buttons (A / L) */}
                <div className="flex gap-4 w-full max-w-lg">
                    <button
                        onClick={() => handleSelect('left')}
                        className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
                    >
                        A = {currentBlock.leftLabel}
                    </button>
                    <button
                        onClick={() => handleSelect('right')}
                        className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
                    >
                        L = {currentBlock.rightLabel}
                    </button>
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Feedback screen
    // -----------------------------------------------------------------------

    if (phase === 'feedback') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                {currentBlock && (
                    <StepProgressPill step={currentBlock.step} total={TOTAL_BLOCKS} percent={blockProgress} />
                )}
                <div className="flex-1 flex items-center justify-center mt-8">
                    {lastCorrect ? (
                        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    ) : (
                        <span className="text-3xl font-bold text-red-500">
                            {t('iat.oops', 'oops!')}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Complete screen
    // -----------------------------------------------------------------------

    if (phase === 'complete') {
        // Compute simple stats for results display
        const correctCount = results.filter(r => r.correct).length;
        const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
        const avgRT = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.rt, 0) / results.length) : 0;

        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-700">
                        {t('iat.complete', 'Test completed. Thank you!')}
                    </p>
                    {showResults && results.length > 0 && (
                        <div className="mt-6 w-full max-w-sm mx-auto bg-gray-50 rounded-xl p-5 space-y-4 text-left">
                            <h3 className="text-sm font-semibold text-gray-900 text-center">
                                {t('iat.yourResults', 'Your results')}
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                    <p className="text-2xl font-bold text-blue-600">{accuracy}%</p>
                                    <p className="text-xs text-gray-500 mt-1">{t('iat.accuracy', 'Accuracy')}</p>
                                </div>
                                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                    <p className="text-2xl font-bold text-blue-600">{avgRT}<span className="text-sm font-normal">ms</span></p>
                                    <p className="text-xs text-gray-500 mt-1">{t('iat.avgResponseTime', 'Avg. response time')}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

// ---------------------------------------------------------------------------
// Step progress pill (reusable sub-component)
// ---------------------------------------------------------------------------

const StepProgressPill: React.FC<{ step: number; total: number; percent: number }> = ({ step, total, percent }) => (
    <div className="inline-flex items-center gap-3 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
        <span>Step {step} of {total}</span>
        <div className="w-24 h-1.5 bg-blue-400 rounded-full overflow-hidden">
            <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${Math.min(percent, 100)}%` }}
            />
        </div>
        <span>{Math.min(percent, 100)}%</span>
    </div>
);
