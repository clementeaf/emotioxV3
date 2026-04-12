import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModuleConfig } from '../../types/module';
import { useParticipantStore } from '../../stores/useParticipantStore';
import type { ModuleComponent } from '../../types/module';
import { resolveMultiLang } from '../../utils/multiLang';
import i18n from '../../i18n';
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
    imageUrl?: string;
    imageStorageKey?: string;
}

interface IATCriteriaItem {
    id: string;
    label: string;
    imageUrl?: string;
    imageStorageKey?: string;
    /** Target ID assigned by researcher — determines correct answer in Attribute Testing */
    targetId?: string;
}

interface IATTrial {
    /** Shown during priming phase (brief context). Null = fixation cross '+' */
    primingLabel?: string;
    primingImage?: string;
    /** Shown during trial phase (stimulus to classify) */
    stimulusId: string;
    stimulusLabel: string;
    stimulusImage?: string;
    /** Secondary text shown below stimulus (e.g. criteria under object for Comparing Attribute) */
    stimulusSecondaryLabel?: string;
    /** Which button is correct */
    correctSide: 'left' | 'right';
    phase: 'practice' | 'test';
}

interface IATBlock {
    step: number;
    leftLabel: string;
    rightLabel: string;
    leftId: string;
    rightId: string;
    trials: IATTrial[];
}

interface IATTrialResult {
    targetId: string;
    criterionId: string;
    rt: number;
    correct: boolean;
    phase: string;
}

type IATPhase = 'intro' | 'keep-in-mind' | 'take-note' | 'priming' | 'trial' | 'feedback' | 'complete';

// ---------------------------------------------------------------------------
// Media resolution helper
// ---------------------------------------------------------------------------

function resolveTargetImageFromUpload(component: ModuleComponent | undefined): {
    imageUrl?: string;
    imageStorageKey?: string;
} {
    const ref = getFileUploadMediaRef(component);
    if (!ref) return {};
    if (ref.url) {
        const u = ref.url.trim();
        if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:')) {
            return { imageUrl: u };
        }
        return { imageUrl: resolveMediaUrl(u) };
    }
    if (ref.s3Key) return { imageStorageKey: ref.s3Key };
    return {};
}

// ---------------------------------------------------------------------------
// Config extraction
// ---------------------------------------------------------------------------

interface IATExtractedConfig {
    testType: 'attribute_testing' | 'comparing_attribute' | 'objects_comparing';
    primingTime: number;
    targets: IATTarget[];
    criteria: IATCriteriaItem[];
    /** Objects Comparing: category labels (e.g. RIcoooo / Malooo) */
    criteriaCategories?: { left: string; right: string; leftId: string; rightId: string };
    /** Comparing Attribute: dimension labels (e.g. Extravagente / Convencional) */
    dimensions?: { left: string; right: string };
    exerciseInstructions: string;
    testInstructions: string;
    showResults: boolean;
}

function parseCriteriaRankingList(components: ModuleComponent[]): IATCriteriaItem[] {
    const criteriaComp = components.find(c => c.id === 'criteria' || c.type === 'ranking-list');
    if (!criteriaComp) return [];

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
        } catch { /* ignore */ }
    }

    if (!items && Array.isArray(criteriaComp.settings?.items)) {
        items = criteriaComp.settings.items as Array<{ id?: string; label?: string; value?: string; image?: { s3Key?: string; url?: string } }>;
    }

    if (!items) return [];

    const result: IATCriteriaItem[] = [];
    items.forEach((item, idx) => {
        // Skip criteria hidden by the researcher
        if ((item as { hidden?: boolean }).hidden) return;
        const label = (item.label || item.value || '').trim();
        if (!label) return;
        const img = item.image as { s3Key?: string; url?: string } | undefined;
        result.push({
            id: item.id || `crit-${idx}`,
            label,
            imageUrl: img?.url?.trim() || undefined,
            imageStorageKey: img?.s3Key || undefined,
            targetId: (item as { targetId?: string }).targetId || undefined,
        });
    });
    return result;
}

const extractConfig = (module: ModuleConfig): IATExtractedConfig => {
    const components = module.structure?.components || [];
    const moduleName = module.name.toLowerCase();

    let testType: IATExtractedConfig['testType'] = 'attribute_testing';
    if (moduleName.includes('comparing attribute') || moduleName.includes('comparing attr')) {
        testType = 'comparing_attribute';
    } else if (moduleName.includes('objects comparing') || moduleName.includes('object comparing')) {
        testType = 'objects_comparing';
    }

    const primingComp = components.find(c => c.id === 'priming-time');
    const primingTime = parseInt(getComponentText(primingComp) || '400', 10) || 400;

    const targets: IATTarget[] = [];
    const criteria: IATCriteriaItem[] = [];
    let criteriaCategories: IATExtractedConfig['criteriaCategories'];
    let dimensions: IATExtractedConfig['dimensions'];

    if (testType === 'comparing_attribute') {
        // Objects: object-N-name/image (dynamic count)
        for (let i = 1; i <= 20; i++) {
            const nameComp = components.find(c => c.id === `object-${i}-name`);
            if (!nameComp) continue;
            const nameVal = getComponentText(nameComp);
            if (nameVal) {
                const imageComp = components.find(c => c.id === `object-${i}-image`);
                const img = resolveTargetImageFromUpload(imageComp);
                targets.push({ id: `object-${i}`, name: nameVal, ...img });
            }
        }
        // Dimensions → button labels (e.g. Extravagente / Convencional)
        const dim1 = components.find(c => c.id === 'dimension-1');
        const dim2 = components.find(c => c.id === 'dimension-2');
        const d1 = (getComponentText(dim1) || dim1?.placeholder?.text || 'Yes').trim();
        const d2 = (getComponentText(dim2) || dim2?.placeholder?.text || 'No').trim();
        dimensions = { left: d1, right: d2 };
        criteria.push(...parseCriteriaRankingList(components));
    } else if (testType === 'objects_comparing') {
        // Targets: target-N-name/image (dynamic count)
        for (let i = 1; i <= 20; i++) {
            const nameComp = components.find(c => c.id === `target-${i}-name`);
            if (!nameComp) continue;
            const nameVal = getComponentText(nameComp);
            if (nameVal) {
                const imageComp = components.find(c => c.id === `target-${i}-image`);
                const img = resolveTargetImageFromUpload(imageComp);
                targets.push({ id: `target-${i}`, name: nameVal, ...img });
            }
        }
        // Criteria categories → button labels for Step 1 (e.g. RIcoooo / Malooo)
        const c1 = components.find(c => c.id === 'criteria-1');
        const c2 = components.find(c => c.id === 'criteria-2');
        const l1 = (getComponentText(c1) || c1?.placeholder?.text || 'Positive').trim();
        const l2 = (getComponentText(c2) || c2?.placeholder?.text || 'Negative').trim();
        criteriaCategories = { left: l1, right: l2, leftId: 'criteria-1', rightId: 'criteria-2' };
        criteria.push(...parseCriteriaRankingList(components));
    } else {
        // Attribute Testing: target-N-name/image (dynamic count), criteria ranking-list
        for (let i = 1; i <= 20; i++) {
            const nameComp = components.find(c => c.id === `target-${i}-name`);
            if (!nameComp) continue;
            const nameVal = getComponentText(nameComp);
            if (nameVal) {
                const imageComp = components.find(c => c.id === `target-${i}-image`);
                const img = resolveTargetImageFromUpload(imageComp);
                targets.push({ id: `target-${i}`, name: nameVal, ...img });
            }
        }
        criteria.push(...parseCriteriaRankingList(components));
    }

    // Instruction texts — resolve multi-lang if available
    const exerciseComp = components.find(c => c.id === 'exercise-instructions');
    const testComp = components.find(c => c.id === 'test-instructions');
    const rawExercise = resolveMultiLang(getComponentText(exerciseComp), i18n.language);
    const rawTest = resolveMultiLang(getComponentText(testComp), i18n.language);

    const interpolateTargets = (text: string): string =>
        text.replace(/\[\[(Object|Target)\s*(\d+)\]\]/gi, (_match, _label, num) => {
            const idx = parseInt(num, 10) - 1;
            return targets[idx]?.name ?? `Object ${num}`;
        });

    const showResultsComp = components.find(c => c.id === 'show-results');
    const showResults = getComponentText(showResultsComp) === 'true';

    return {
        testType,
        primingTime,
        targets,
        criteria,
        criteriaCategories,
        dimensions,
        exerciseInstructions: interpolateTargets(rawExercise),
        testInstructions: interpolateTargets(rawTest),
        showResults,
    };
};

// ---------------------------------------------------------------------------
// Shuffle & pad
// ---------------------------------------------------------------------------

const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const padAndShuffle = (trials: IATTrial[], min: number): IATTrial[] => {
    if (trials.length === 0) return [];
    const padded = [...trials];
    while (padded.length < min) {
        padded.push(...trials.slice(0, min - padded.length));
    }
    return shuffle(padded);
};

// ---------------------------------------------------------------------------
// Block builders per test type
// ---------------------------------------------------------------------------

/**
 * Attribute Testing — Implicit Priming Test (2 steps)
 *
 * Step 1 (Practice): Classify targets WITHOUT criteria context.
 *   Stimulus = target image/name. Buttons = target names.
 *
 * Step 2 (Test): Criteria label shown as stimulus + target image below.
 *   Correct answer = the target assigned by the researcher via targetId.
 *   RT differences reveal implicit associations.
 */
function buildBlocksAttributeTesting(
    targets: IATTarget[],
    criteria: IATCriteriaItem[],
): IATBlock[] {
    if (targets.length < 2 || criteria.length === 0) return [];

    const tLeft = targets[0];
    const tRight = targets[targets.length - 1];

    // Map groupLabel IDs (e.g. "Target 1") to left/right side
    const targetSideMap = new Map<string, 'left' | 'right'>();
    targets.forEach((t, idx) => {
        targetSideMap.set(t.id, idx === 0 ? 'left' : 'right');
        // Also map groupLabel format (e.g. "Target 1", "Object 1")
        const groupLabel = t.id.replace(/^(target|object)-/, (_, prefix) => `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)} `);
        targetSideMap.set(groupLabel, idx === 0 ? 'left' : 'right');
    });

    // Step 1: Practice — classify targets alone
    const step1Trials: IATTrial[] = [];
    for (let idx = 0; idx < targets.length; idx++) {
        const t = targets[idx];
        step1Trials.push({
            stimulusId: t.id,
            stimulusLabel: t.name,
            stimulusImage: t.imageUrl,
            correctSide: idx === 0 ? 'left' : 'right',
            phase: 'practice',
        });
    }

    // Step 2: Test — criteria label + assigned target determines correct side
    const step2Trials: IATTrial[] = [];
    for (const crit of criteria) {
        // Determine correct side from researcher's target assignment
        const assignedSide = crit.targetId ? targetSideMap.get(crit.targetId) : undefined;
        // Find assigned target to show its image
        const assignedTarget = crit.targetId
            ? targets.find(t => t.id === crit.targetId || `Target ${targets.indexOf(t) + 1}` === crit.targetId || `Object ${targets.indexOf(t) + 1}` === crit.targetId)
            : undefined;

        step2Trials.push({
            stimulusId: crit.id,
            stimulusLabel: crit.label,
            stimulusImage: undefined, // criteria shown as text
            stimulusSecondaryLabel: assignedTarget?.name,
            correctSide: assignedSide ?? 'left', // fallback left if not assigned
            phase: 'test',
        });
    }

    return [
        {
            step: 1,
            leftLabel: tLeft.name,
            rightLabel: tRight.name,
            leftId: tLeft.id,
            rightId: tRight.id,
            trials: padAndShuffle(step1Trials, Math.max(6, targets.length * 2)),
        },
        {
            step: 2,
            leftLabel: tLeft.name,
            rightLabel: tRight.name,
            leftId: tLeft.id,
            rightId: tRight.id,
            trials: padAndShuffle(step2Trials, Math.max(8, criteria.length * targets.length)),
        },
    ];
}

/**
 * Comparing Attribute — Reaction Time Test (1 step, Yes/No)
 *
 * Stimulus = Object name (bold) + Criteria word below.
 * Buttons = dimension labels (e.g. Extravagente / Convencional).
 * Cycles through all Object × Criteria combinations.
 * No priming phase — stimulus appears directly.
 */
function buildBlocksComparingAttribute(
    targets: IATTarget[],
    criteria: IATCriteriaItem[],
    dims: NonNullable<IATExtractedConfig['dimensions']>,
): IATBlock[] {
    if (targets.length === 0 || criteria.length === 0) return [];

    const trials: IATTrial[] = [];
    for (const obj of targets) {
        for (const crit of criteria) {
            // No correct answer in Yes/No — both sides are valid responses.
            // We alternate default correctSide for balanced data, but RT is what matters.
            trials.push({
                stimulusId: `${obj.id}__${crit.id}`,
                stimulusLabel: obj.name,
                stimulusImage: obj.imageUrl,
                stimulusSecondaryLabel: crit.label,
                correctSide: 'left', // placeholder — both sides are valid
                phase: 'test',
            });
        }
    }

    return [{
        step: 1,
        leftLabel: `< ${dims.left}`,
        rightLabel: `${dims.right} >`,
        leftId: 'dimension-1',
        rightId: 'dimension-2',
        trials: shuffle(trials),
    }];
}

/**
 * Objects Comparing — Reaction Time Test (3-step classic IAT)
 *
 * Step 1: Classify CRITERIA items → criteria category buttons (e.g. RIcoooo / Malooo).
 *   Stimulus = criteria word/image. First half → left, second half → right.
 *
 * Step 2: Classify TARGETS → target name buttons.
 *   Stimulus = target image/name.
 *
 * Step 3: Combined — both criteria and target stimuli mixed.
 *   Buttons = combined labels (e.g. "Coca cola or RIcoooo" / "Fanta or Malooo").
 */
function buildBlocksObjectsComparing(
    targets: IATTarget[],
    criteria: IATCriteriaItem[],
    categories: NonNullable<IATExtractedConfig['criteriaCategories']>,
): IATBlock[] {
    if (targets.length < 2 || criteria.length < 2) return [];

    const tLeft = targets[0];
    const tRight = targets[targets.length - 1];
    const half = Math.ceil(criteria.length / 2);

    // Step 1: Classify criteria items
    const step1Trials: IATTrial[] = [];
    for (let idx = 0; idx < criteria.length; idx++) {
        const crit = criteria[idx];
        step1Trials.push({
            stimulusId: crit.id,
            stimulusLabel: crit.label,
            stimulusImage: crit.imageUrl,
            correctSide: idx < half ? 'left' : 'right',
            phase: 'test',
        });
    }

    // Step 2: Classify targets
    const step2Trials: IATTrial[] = [];
    for (let idx = 0; idx < targets.length; idx++) {
        const t = targets[idx];
        step2Trials.push({
            stimulusId: t.id,
            stimulusLabel: t.name,
            stimulusImage: t.imageUrl,
            correctSide: idx < targets.length / 2 ? 'left' : 'right',
            phase: 'test',
        });
    }

    // Step 3: Combined (criteria + targets mixed)
    const step3Trials: IATTrial[] = [];
    for (let idx = 0; idx < targets.length; idx++) {
        const t = targets[idx];
        step3Trials.push({
            stimulusId: t.id,
            stimulusLabel: t.name,
            stimulusImage: t.imageUrl,
            correctSide: idx < targets.length / 2 ? 'left' : 'right',
            phase: 'test',
        });
    }
    for (let idx = 0; idx < criteria.length; idx++) {
        const crit = criteria[idx];
        step3Trials.push({
            stimulusId: crit.id,
            stimulusLabel: crit.label,
            stimulusImage: crit.imageUrl,
            correctSide: idx < half ? 'left' : 'right',
            phase: 'test',
        });
    }

    return [
        {
            step: 1,
            leftLabel: categories.left,
            rightLabel: categories.right,
            leftId: categories.leftId,
            rightId: categories.rightId,
            trials: padAndShuffle(step1Trials, Math.max(6, criteria.length * 2)),
        },
        {
            step: 2,
            leftLabel: tLeft.name,
            rightLabel: tRight.name,
            leftId: tLeft.id,
            rightId: tRight.id,
            trials: padAndShuffle(step2Trials, Math.max(6, targets.length * 2)),
        },
        {
            step: 3,
            leftLabel: `${tLeft.name} / ${categories.left}`,
            rightLabel: `${tRight.name} / ${categories.right}`,
            leftId: 'combined-left',
            rightId: 'combined-right',
            trials: padAndShuffle(step3Trials, Math.max(8, (targets.length + criteria.length) * 2)),
        },
    ];
}

/** Route to the correct block builder */
function buildBlocks(config: IATExtractedConfig, targets: IATTarget[], criteria: IATCriteriaItem[]): IATBlock[] {
    switch (config.testType) {
        case 'attribute_testing':
            return buildBlocksAttributeTesting(targets, criteria);
        case 'comparing_attribute':
            return config.dimensions
                ? buildBlocksComparingAttribute(targets, criteria, config.dimensions)
                : [];
        case 'objects_comparing':
            return config.criteriaCategories
                ? buildBlocksObjectsComparing(targets, criteria, config.criteriaCategories)
                : [];
        default:
            return [];
    }
}

// ---------------------------------------------------------------------------
// Instruction list helper
// ---------------------------------------------------------------------------

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

    const config = useMemo(() => extractConfig(module), [module]);
    const { primingTime, exerciseInstructions, testInstructions, showResults } = config;

    // Is this the Yes/No paradigm (Comparing Attribute)?
    const isYesNo = config.testType === 'comparing_attribute';

    // Resolve S3 images
    const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});

    useEffect(() => {
        let cancelled = false;
        (async (): Promise<void> => {
            const next: Record<string, string> = {};
            const pending = [
                ...config.targets.filter(t => t.imageStorageKey && !t.imageUrl),
                ...config.criteria.filter(c => c.imageStorageKey && !c.imageUrl),
            ];
            for (const item of pending) {
                try {
                    next[item.id] = await mediaService.getMediaUrl(item.imageStorageKey!);
                } catch { /* ignore */ }
            }
            if (!cancelled) setResolvedImages(next);
        })();
        return () => { cancelled = true; };
    }, [config.targets, config.criteria]);

    const targetsResolved = useMemo(
        () => config.targets.map(t => ({ ...t, imageUrl: t.imageUrl || resolvedImages[t.id] })),
        [config.targets, resolvedImages],
    );

    const criteriaResolved = useMemo(
        () => config.criteria.map(c => ({ ...c, imageUrl: c.imageUrl || resolvedImages[c.id] })),
        [config.criteria, resolvedImages],
    );

    const blocks = useMemo(
        () => buildBlocks(config, targetsResolved, criteriaResolved),
        [config, targetsResolved, criteriaResolved],
    );

    const totalBlocks = blocks.length;

    // State
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

    // Save results when complete
    useEffect(() => {
        if (phase === 'complete' && !savedRef.current) {
            savedRef.current = true;
            saveResponse(module.id, 'iat-trials', JSON.stringify(results));
            const timer = setTimeout(() => onComplete?.(), 800);
            timersRef.current.push(timer);
            return () => clearTimeout(timer);
        }
    }, [phase, results, module.id, saveResponse, onComplete]);

    // Start priming → trial (or direct to trial for Yes/No)
    const startTrial = useCallback(() => {
        if (isYesNo || !currentTrial?.primingLabel) {
            // No priming for Yes/No or when no priming content — go straight to trial
            setPhase('trial');
            trialStartRef.current = performance.now();
        } else {
            setPhase('priming');
            const id = setTimeout(() => {
                setPhase('trial');
                trialStartRef.current = performance.now();
            }, primingTime);
            timersRef.current.push(id);
        }
    }, [primingTime, isYesNo, currentTrial]);

    // Handle category selection
    const handleSelect = useCallback((side: 'left' | 'right') => {
        if (phase !== 'trial' || !currentTrial || !currentBlock) return;

        const rt = Math.round(performance.now() - trialStartRef.current);
        // For Yes/No (Comparing Attribute), both sides are valid — always "correct"
        const correct = isYesNo ? true : side === currentTrial.correctSide;
        const criterionId = side === 'left' ? currentBlock.leftId : currentBlock.rightId;

        const result: IATTrialResult = {
            targetId: currentTrial.stimulusId,
            criterionId,
            rt,
            correct,
            phase: `block-${currentBlock.step}`,
        };

        setResults(prev => [...prev, result]);
        setLastCorrect(correct);

        if (isYesNo) {
            // Yes/No: no feedback screen, advance immediately
            const nextIdx = trialIndexRef.current + 1;
            if (nextIdx >= currentBlock.trials.length) {
                setPhase('complete');
            } else {
                setTrialIndex(nextIdx);
                setPhase('trial');
                trialStartRef.current = performance.now();
            }
        } else {
            // IAT/Priming: show feedback then advance
            setPhase('feedback');
            const feedbackId = setTimeout(() => {
                const nextIdx = trialIndexRef.current + 1;
                if (nextIdx >= currentBlock.trials.length) {
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
                    startTrial();
                }
            }, 500);
            timersRef.current.push(feedbackId);
        }
    }, [phase, currentTrial, currentBlock, blockIndex, blocks.length, isYesNo, startTrial]);

    // Keyboard: A (left) / L (right)
    useEffect(() => {
        if (phase !== 'trial') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key === 'a' || key === 'arrowleft') handleSelect('left');
            else if (key === 'l' || key === 'arrowright') handleSelect('right');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, handleSelect]);

    // Space / Enter to advance from take-note
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

    // Block progress
    const blockProgress = currentBlock && currentBlock.trials.length > 0
        ? Math.round(((blockIndex * 100) + (trialIndex / currentBlock.trials.length) * 100) / Math.max(totalBlocks, 1))
        : Math.round(((blockIndex + 1) / Math.max(totalBlocks, 1)) * 100);

    // -----------------------------------------------------------------------
    // Unconfigured
    // -----------------------------------------------------------------------

    const isConfigured = (() => {
        switch (config.testType) {
            case 'attribute_testing':
                return config.targets.length >= 2 && config.criteria.length >= 1;
            case 'comparing_attribute':
                return config.targets.length >= 1 && config.criteria.length >= 1 && !!config.dimensions;
            case 'objects_comparing':
                return config.targets.length >= 2 && config.criteria.length >= 2 && !!config.criteriaCategories;
            default:
                return false;
        }
    })();

    if (!isConfigured || blocks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
                <p className="text-gray-400 text-center">
                    {t('iat.notConfigured', 'This implicit association test has not been configured yet.')}
                </p>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Intro screen
    // -----------------------------------------------------------------------

    if (phase === 'intro') {
        // Yes/No skips keep-in-mind, goes to take-note (or directly to trial)
        const nextPhase: IATPhase = exerciseInstructions
            ? 'take-note'
            : isYesNo ? 'take-note' : 'keep-in-mind';
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
                                {isYesNo
                                    ? t('iat.introDescriptionYesNo', 'You will be presented with objects and characteristics. Respond as quickly as possible using the buttons below.')
                                    : t('iat.introDescription', 'You will be presented with words or images to classify into categories using either the \'A\' or \'L\' key.')}
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
    // Keep in mind screen (only for IAT/Priming, NOT Yes/No)
    // -----------------------------------------------------------------------

    if (phase === 'keep-in-mind') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
                <StepProgressPill step={1} total={totalBlocks} percent={0} />
                <div className="w-full max-w-lg space-y-6 mt-8">
                    <h2 className="text-xl font-bold text-gray-900">
                        {t('iat.keepInMindTitle', 'Keep in mind')}
                    </h2>
                    <ol className="space-y-3 text-gray-600">
                        <li><span className="font-semibold">1)</span> {t('iat.rule1', 'Labels at the top of the screen indicate which category goes with which key.')}</li>
                        <li><span className="font-semibold">2)</span> {t('iat.rule2', 'Each word or image has a correct category classification.')}</li>
                        <li><span className="font-semibold">3)</span> {t('iat.rule3', 'Keep your index fingers on the A and L keys to enable a rapid response.')}</li>
                        <li><span className="font-semibold">4)</span> {t('iat.rule4', 'The test gives no results if you go slow, please try to go as fast as possible.')}</li>
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
    // Take note screen (before each block)
    // -----------------------------------------------------------------------

    if (phase === 'take-note' && currentBlock) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-4 py-8">
                <StepProgressPill
                    step={currentBlock.step}
                    total={totalBlocks}
                    percent={Math.round(((currentBlock.step - 1) / totalBlocks) * 100)}
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
                    <div className="flex gap-4">
                        <button
                            onClick={startTrial}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            {isYesNo ? currentBlock.leftLabel : `A = ${currentBlock.leftLabel}`}
                        </button>
                        <button
                            onClick={startTrial}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            {isYesNo ? currentBlock.rightLabel : `L = ${currentBlock.rightLabel}`}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Priming phase (Attribute Testing Step 2 & Objects Comparing)
    // -----------------------------------------------------------------------

    if (phase === 'priming' && currentTrial) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                {currentBlock && (
                    <StepProgressPill step={currentBlock.step} total={totalBlocks} percent={blockProgress} />
                )}
                <div className="flex-1 flex flex-col items-center justify-center mt-8 gap-2">
                    {currentTrial.primingLabel ? (
                        currentTrial.primingImage ? (
                            <img
                                src={currentTrial.primingImage}
                                alt={currentTrial.primingLabel}
                                className="max-h-32 max-w-xs object-contain"
                            />
                        ) : (
                            <span className="text-2xl font-semibold text-gray-500 select-none">
                                {currentTrial.primingLabel}
                            </span>
                        )
                    ) : (
                        <span className="text-5xl font-bold text-gray-400 select-none">+</span>
                    )}
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
                <StepProgressPill step={currentBlock.step} total={totalBlocks} percent={blockProgress} />

                {/* Stimulus */}
                <div className="flex flex-col items-center justify-center min-h-[200px] my-8 gap-2">
                    {currentTrial.stimulusImage ? (
                        <img
                            src={currentTrial.stimulusImage}
                            alt={currentTrial.stimulusLabel}
                            className="max-h-48 max-w-xs object-contain"
                        />
                    ) : (
                        <span className="text-3xl font-bold text-gray-900">
                            {currentTrial.stimulusLabel}
                        </span>
                    )}
                    {/* Secondary label (Comparing Attribute: criteria below object name) */}
                    {currentTrial.stimulusSecondaryLabel && (
                        <span className="text-xl text-gray-600">
                            {currentTrial.stimulusSecondaryLabel}
                        </span>
                    )}
                </div>

                {/* Category buttons */}
                <div className="flex gap-4 w-full max-w-lg">
                    <button
                        onClick={() => handleSelect('left')}
                        className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
                    >
                        {isYesNo ? currentBlock.leftLabel : `A = ${currentBlock.leftLabel}`}
                    </button>
                    <button
                        onClick={() => handleSelect('right')}
                        className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
                    >
                        {isYesNo ? currentBlock.rightLabel : `L = ${currentBlock.rightLabel}`}
                    </button>
                </div>
            </div>
        );
    }

    // -----------------------------------------------------------------------
    // Feedback screen (IAT/Priming only, not Yes/No)
    // -----------------------------------------------------------------------

    if (phase === 'feedback') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                {currentBlock && (
                    <StepProgressPill step={currentBlock.step} total={totalBlocks} percent={blockProgress} />
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
// Step progress pill
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
