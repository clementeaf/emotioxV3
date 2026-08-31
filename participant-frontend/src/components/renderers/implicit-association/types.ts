import type { ModuleConfig } from '../../../types/module';

export interface ImplicitAssociationRendererProps {
    module: ModuleConfig;
    onComplete?: () => void;
}

export interface IATTarget {
    id: string;
    name: string;
    imageUrl?: string;
    imageStorageKey?: string;
    imageError?: boolean;
}

export interface IATCriteriaItem {
    id: string;
    label: string;
    imageUrl?: string;
    imageStorageKey?: string;
    /** Target ID assigned by researcher — determines correct answer in Attribute Testing */
    targetId?: string;
}

export interface IATTrial {
    /** Shown during priming phase (brief context). Null = fixation cross '+' */
    primingLabel?: string;
    primingImage?: string;
    /** Shown during trial phase (stimulus to classify) */
    stimulusId: string;
    stimulusLabel: string;
    stimulusImage?: string;
    stimulusImageError?: boolean;
    /** Secondary text shown below stimulus (e.g. criteria under object for Comparing Attribute) */
    stimulusSecondaryLabel?: string;
    /** Which button is correct */
    correctSide: 'left' | 'right';
    phase: 'practice' | 'test';
}

export interface IATBlock {
    step: number;
    leftLabel: string;
    rightLabel: string;
    leftId: string;
    rightId: string;
    trials: IATTrial[];
}

export interface IATTrialResult {
    targetId: string;
    criterionId: string;
    rt: number;
    correct: boolean;
    phase: string;
}

export type IATPhase = 'intro' | 'take-note' | 'priming' | 'trial' | 'complete';

export interface IATExtractedConfig {
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
    /** Response key mode: "letters" (A/L) or "arrows" (←/→). Default: "letters" */
    responseKeys: 'letters' | 'arrows';
}
