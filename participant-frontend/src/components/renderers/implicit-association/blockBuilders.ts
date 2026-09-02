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

const TRIAL_REPETITIONS = 4;

const repeatTrials = (trials: IATTrial[], times: number): IATTrial[] =>
    Array.from({ length: times }, () => trials).flat();

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
            trials: shuffleNoConsecutive(repeatTrials(testTrials, TRIAL_REPETITIONS)),
        },
    ];
}

/**
 * Comparing Attribute — Reaction Time Test
 *
 * Practice: 8 trials — classify objects to learn key mapping.
 * Test: object image (prime, x ms) → criterion text (wait for keypress).
 * Buttons = dimension labels (e.g. Extravagante / Convencional).
 * Both sides valid — RT reveals implicit association.
 */
export function buildBlocksComparingAttribute(
    targets: IATTarget[],
    criteria: IATCriteriaItem[],
    dims: NonNullable<IATExtractedConfig['dimensions']>,
): IATBlock[] {
    if (targets.length === 0 || criteria.length === 0) return [];

    const practiceTrials: IATTrial[] = targets.map((obj, idx) => ({
        stimulusId: obj.id,
        stimulusLabel: obj.name,
        stimulusImage: obj.imageUrl,
        stimulusImageError: obj.imageError,
        correctSide: idx === 0 ? 'left' as const : 'right' as const,
        phase: 'practice' as const,
    }));

    const testTrials: IATTrial[] = [];
    for (const obj of targets) {
        for (const crit of criteria) {
            testTrials.push({
                stimulusId: `${obj.id}__${crit.id}`,
                primingLabel: obj.name,
                primingImage: obj.imageUrl,
                stimulusLabel: crit.label,
                correctSide: 'left',
                phase: 'test',
            });
        }
    }

    return [
        {
            step: 1,
            leftLabel: `< ${dims.left}`,
            rightLabel: `${dims.right} >`,
            leftId: 'dimension-1',
            rightId: 'dimension-2',
            trials: padAndShuffle(practiceTrials, 8),
        },
        {
            step: 2,
            leftLabel: `< ${dims.left}`,
            rightLabel: `${dims.right} >`,
            leftId: 'dimension-1',
            rightId: 'dimension-2',
            trials: shuffleNoConsecutive(repeatTrials(testTrials, TRIAL_REPETITIONS)),
        },
    ];
}

/**
 * Objects Comparing — Implicit Association
 *
 * Practice: 8 trials — classify targets to learn key mapping.
 * Test: target image (prime, x ms) → criterion text (wait for keypress).
 * Buttons = category labels (e.g. Positive / Negative).
 * Both sides valid — RT + choice distribution reveal implicit association.
 */
export function buildBlocksObjectsComparing(
    targets: IATTarget[],
    criteria: IATCriteriaItem[],
    categories: NonNullable<IATExtractedConfig['criteriaCategories']>,
): IATBlock[] {
    if (targets.length < 2 || criteria.length < 2) return [];

    const practiceTrials: IATTrial[] = targets.map((t, idx) => ({
        stimulusId: t.id,
        stimulusLabel: t.name,
        stimulusImage: t.imageUrl,
        stimulusImageError: t.imageError,
        correctSide: idx === 0 ? 'left' as const : 'right' as const,
        phase: 'practice' as const,
    }));

    const testTrials: IATTrial[] = [];
    for (const t of targets) {
        for (const crit of criteria) {
            testTrials.push({
                stimulusId: `${t.id}__${crit.id}`,
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
            leftLabel: categories.left,
            rightLabel: categories.right,
            leftId: categories.leftId,
            rightId: categories.rightId,
            trials: padAndShuffle(practiceTrials, 8),
        },
        {
            step: 2,
            leftLabel: categories.left,
            rightLabel: categories.right,
            leftId: categories.leftId,
            rightId: categories.rightId,
            trials: shuffleNoConsecutive(repeatTrials(testTrials, TRIAL_REPETITIONS)),
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
