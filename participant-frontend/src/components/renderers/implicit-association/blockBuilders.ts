import type { IATTarget, IATCriteriaItem, IATTrial, IATBlock, IATExtractedConfig } from './types';

// ---------------------------------------------------------------------------
// Shuffle & pad
// ---------------------------------------------------------------------------

export const shuffle = <T,>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

export const padAndShuffle = (trials: IATTrial[], min: number): IATTrial[] => {
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
 * Shuffles an array ensuring no two consecutive items share the same stimulusId.
 * Falls back to plain shuffle after 50 attempts.
 */
export const shuffleNoConsecutive = (trials: IATTrial[]): IATTrial[] => {
    for (let attempt = 0; attempt < 50; attempt++) {
        const shuffled = shuffle(trials);
        const hasConsecutive = shuffled.some((t, i) => i > 0 && t.stimulusId === shuffled[i - 1].stimulusId);
        if (!hasConsecutive) return shuffled;
    }
    return shuffle(trials);
};

/**
 * Attribute Testing — Implicit Association via free classification
 *
 * Step 1 (Practice): 8 trials — classify targets to learn key mapping. Not scored.
 *
 * Step 2 (Test): Each criterion appears 4 times in random order (no consecutive
 *   repeats). Stimulus = criterion word. Buttons = target names.
 *   Both sides are valid — there is no "correct" answer.
 *   The implicit association is revealed by choice distribution and RT.
 *   Stimulus stays until keypress or 2000ms timeout.
 */
export function buildBlocksAttributeTesting(
    targets: IATTarget[],
    criteria: IATCriteriaItem[],
): IATBlock[] {
    if (targets.length < 2 || criteria.length === 0) return [];

    const tLeft = targets[0];
    const tRight = targets[targets.length - 1];

    const practiceTrials: IATTrial[] = [];
    for (let idx = 0; idx < targets.length; idx++) {
        const t = targets[idx];
        practiceTrials.push({
            stimulusId: t.id,
            stimulusLabel: t.name,
            stimulusImage: t.imageUrl,
            stimulusImageError: t.imageError,
            correctSide: idx === 0 ? 'left' : 'right',
            phase: 'practice',
        });
    }

    const testTrials: IATTrial[] = [];
    for (const crit of criteria) {
        for (const t of targets) {
            testTrials.push({
                stimulusId: `${crit.id}__${t.id}`,
                primingLabel: t.name,
                primingImage: t.imageUrl,
                stimulusLabel: crit.label,
                correctSide: 'left',
                phase: 'test',
            });
        }
    }

    return [
        {
            step: 1,
            leftLabel: tLeft.name,
            rightLabel: tRight.name,
            leftId: tLeft.id,
            rightId: tRight.id,
            trials: padAndShuffle(practiceTrials, 8),
        },
        {
            step: 2,
            leftLabel: tLeft.name,
            rightLabel: tRight.name,
            leftId: tLeft.id,
            rightId: tRight.id,
            trials: shuffleNoConsecutive(testTrials),
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
export function buildBlocksComparingAttribute(
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
                stimulusImageError: obj.imageError,
                stimulusSecondaryLabel: crit.label,
                correctSide: 'left',
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
 * Objects Comparing — Classic IAT (Greenwald et al. 1998, 7 blocks)
 *
 * Block 1: Target practice          — classify targets (A=left, B=right)
 * Block 2: Attribute practice       — classify criteria (Good=left, Bad=right)
 * Block 3: Combined congruent pract — A+Good=left, B+Bad=right (mixed)
 * Block 4: Combined congruent test  — same pairing, more trials
 * Block 5: Target practice REVERSED — B=left, A=right (key reversal)
 * Block 6: Combined incongruent pract — B+Good=left, A+Bad=right
 * Block 7: Combined incongruent test  — same pairing, more trials
 *
 * D-score = f(blocks 3,4 vs 6,7) per Greenwald improved method.
 */
export function buildBlocksObjectsComparing(
    targets: IATTarget[],
    criteria: IATCriteriaItem[],
    categories: NonNullable<IATExtractedConfig['criteriaCategories']>,
): IATBlock[] {
    if (targets.length < 2 || criteria.length < 2) return [];

    const tLeft = targets[0];
    const tRight = targets[targets.length - 1];
    const half = Math.ceil(criteria.length / 2);

    const targetSide = (idx: number) => idx < targets.length / 2 ? 'left' as const : 'right' as const;
    const critSide = (idx: number) => idx < half ? 'left' as const : 'right' as const;

    // Helpers to build trial sets
    const makeTargetTrials = (reversed: boolean): IATTrial[] =>
        targets.map((t, idx) => ({
            stimulusId: t.id,
            stimulusLabel: t.name,
            stimulusImage: t.imageUrl,
            stimulusImageError: t.imageError,
            correctSide: reversed
                ? (targetSide(idx) === 'left' ? 'right' as const : 'left' as const)
                : targetSide(idx),
            phase: 'test' as const,
        }));

    const makeCriteriaTrials = (): IATTrial[] =>
        criteria.map((crit, idx) => ({
            stimulusId: crit.id,
            stimulusLabel: crit.label,
            stimulusImage: crit.imageUrl,
            correctSide: critSide(idx),
            phase: 'test' as const,
        }));

    const makeCombinedTrials = (reversed: boolean): IATTrial[] => [
        ...makeTargetTrials(reversed),
        ...makeCriteriaTrials(),
    ];

    // Congruent labels: target-1 + criteria-1 on same side
    const congruentLeft = `${tLeft.name} / ${categories.left}`;
    const congruentRight = `${tRight.name} / ${categories.right}`;
    // Incongruent labels: target sides reversed, criteria stay
    const incongruentLeft = `${tRight.name} / ${categories.left}`;
    const incongruentRight = `${tLeft.name} / ${categories.right}`;

    return [
        // Block 1: Target practice
        {
            step: 1,
            leftLabel: tLeft.name,
            rightLabel: tRight.name,
            leftId: tLeft.id,
            rightId: tRight.id,
            trials: padAndShuffle(makeTargetTrials(false), 20),
        },
        // Block 2: Attribute practice
        {
            step: 2,
            leftLabel: categories.left,
            rightLabel: categories.right,
            leftId: categories.leftId,
            rightId: categories.rightId,
            trials: padAndShuffle(makeCriteriaTrials(), 20),
        },
        // Block 3: Combined congruent practice
        {
            step: 3,
            leftLabel: congruentLeft,
            rightLabel: congruentRight,
            leftId: 'congruent-left',
            rightId: 'congruent-right',
            trials: padAndShuffle(makeCombinedTrials(false), 20),
        },
        // Block 4: Combined congruent test
        {
            step: 4,
            leftLabel: congruentLeft,
            rightLabel: congruentRight,
            leftId: 'congruent-left',
            rightId: 'congruent-right',
            trials: padAndShuffle(makeCombinedTrials(false), 40),
        },
        // Block 5: Target practice REVERSED
        {
            step: 5,
            leftLabel: tRight.name,
            rightLabel: tLeft.name,
            leftId: tRight.id,
            rightId: tLeft.id,
            trials: padAndShuffle(makeTargetTrials(true), 20),
        },
        // Block 6: Combined incongruent practice
        {
            step: 6,
            leftLabel: incongruentLeft,
            rightLabel: incongruentRight,
            leftId: 'incongruent-left',
            rightId: 'incongruent-right',
            trials: padAndShuffle(makeCombinedTrials(true), 20),
        },
        // Block 7: Combined incongruent test
        {
            step: 7,
            leftLabel: incongruentLeft,
            rightLabel: incongruentRight,
            leftId: 'incongruent-left',
            rightId: 'incongruent-right',
            trials: padAndShuffle(makeCombinedTrials(true), 40),
        },
    ];
}

/** Route to the correct block builder */
export function buildBlocks(config: IATExtractedConfig, targets: IATTarget[], criteria: IATCriteriaItem[]): IATBlock[] {
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
