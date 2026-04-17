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
 * Attribute Testing — Implicit Priming Test (2 steps)
 *
 * Step 1 (Practice): Classify targets WITHOUT criteria context.
 *   Stimulus = target image/name. Buttons = target names.
 *
 * Step 2 (Test): Criteria label shown as stimulus + target image below.
 *   Correct answer = the target assigned by the researcher via targetId.
 *   RT differences reveal implicit associations.
 */
export function buildBlocksAttributeTesting(
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
export function buildBlocksObjectsComparing(
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
