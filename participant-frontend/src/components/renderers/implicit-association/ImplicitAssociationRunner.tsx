import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParticipantStore } from '../../../stores/useParticipantStore';
import { mediaService } from '../../../services/media.service';
import type { ImplicitAssociationRendererProps, IATTrialResult, IATPhase } from './types';
import { extractConfig } from './configExtraction';
import { buildBlocks } from './blockBuilders';
import { InstructionList, StepProgressPill } from './components';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ImplicitAssociationRenderer: React.FC<ImplicitAssociationRendererProps> = ({ module, onComplete }) => {
    const { t } = useTranslation();
    const { saveResponse } = useParticipantStore();

    const config = useMemo(() => extractConfig(module), [module]);
    const { primingTime, exerciseInstructions, testInstructions, showResults, responseKeys } = config;

    // Key labels based on researcher config
    const leftKey = responseKeys === 'arrows' ? '←' : 'A';
    const rightKey = responseKeys === 'arrows' ? '→' : 'L';

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
    const onCompleteRef = useRef(onComplete);

    const currentBlock = blocks[blockIndex] ?? null;
    const currentTrial = currentBlock?.trials[trialIndex] ?? null;

    useEffect(() => { trialIndexRef.current = trialIndex; }, [trialIndex]);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
    useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

    // Save results when complete — uses ref for onComplete to avoid
    // cleanup cancelling the timer when handleNext changes reference
    useEffect(() => {
        if (phase === 'complete' && !savedRef.current) {
            savedRef.current = true;
            saveResponse(module.id, 'iat-trials', JSON.stringify(results));
            const timer = setTimeout(() => onCompleteRef.current?.(), 800);
            timersRef.current.push(timer);
        }
    }, [phase, results, module.id, saveResponse]);

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
                                    : responseKeys === 'arrows'
                                    ? t('iat.introDescriptionArrows', 'You will be presented with words or images to classify into categories using the ← or → arrow keys.')
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
                        <li><span className="font-semibold">3)</span> {responseKeys === 'arrows'
                            ? t('iat.rule3Arrows', 'Keep your fingers on the ← and → arrow keys to enable a rapid response.')
                            : t('iat.rule3', 'Keep your index fingers on the A and L keys to enable a rapid response.')}</li>
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
                    <div className="flex items-center gap-3 text-gray-500 text-sm">
                        <kbd className="inline-flex items-center gap-1 px-4 py-1.5 bg-gray-100 border border-gray-300 rounded-md text-xs font-mono text-gray-600 shadow-[0_1px_0_1px_rgba(0,0,0,0.08)]">
                            ␣ space
                        </kbd>
                        <span>{t('iat.takeNoteBegin', 'or tap one of the buttons to begin')}</span>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={startTrial}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            {isYesNo ? currentBlock.leftLabel : `${leftKey} = ${currentBlock.leftLabel}`}
                        </button>
                        <button
                            onClick={startTrial}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                            {isYesNo ? currentBlock.rightLabel : `${rightKey} = ${currentBlock.rightLabel}`}
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
                    ) : currentTrial.stimulusImageError ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-28 h-28 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                </svg>
                            </div>
                            <span className="text-lg font-semibold text-gray-500">{currentTrial.stimulusLabel}</span>
                        </div>
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
                        {isYesNo ? currentBlock.leftLabel : `${leftKey} = ${currentBlock.leftLabel}`}
                    </button>
                    <button
                        onClick={() => handleSelect('right')}
                        className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
                    >
                        {isYesNo ? currentBlock.rightLabel : `${rightKey} = ${currentBlock.rightLabel}`}
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
