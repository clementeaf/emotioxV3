// Global set to track which researches have been checked for Welcome/Thank You
// This persists across StrictMode remounts and component unmounts
export const checkedResearchIds = new Set<string>();

// Stages that can only exist once per research (singletons)
export const SINGLETON_STAGES = new Set(['Welcome Screen', 'Thank You Screen', 'Research Configuration']);

export const IAT_MODULE_TYPES = [
    { name: 'Attribute Testing', description: '2 targets, up to 5 criteria' },
    { name: 'Comparing Attribute', description: 'Up to 3 objects, 2 dimensions, up to 15 criteria' },
    { name: 'Objects Comparing', description: 'Up to 5 targets, positive/negative criteria' },
];

/**
 * Sorts stages in the correct order:
 * 1. Welcome Screen (first)
 * 2. Research Configuration (second)
 * 3. Other stages (middle, in their original order)
 * 4. Thank You Screen (last)
 */
export const sortStages = <T extends { name: string }>(stages: T[]): T[] => {
    const getStageOrder = (name: string): number => {
        const lowerName = name.toLowerCase();
        if (lowerName === 'welcome screen') return 0;
        if (lowerName === 'research configuration') return 1;
        if (lowerName === 'thank you screen') return 999;
        return 2; // All other stages go in the middle
    };

    return [...stages].sort((a, b) => {
        const orderA = getStageOrder(a.name);
        const orderB = getStageOrder(b.name);
        return orderA - orderB;
    });
};

/**
 * Determines if a stage is a single module or a collection of modules
 */
export const isStageSingleModule = (stage: { name: string; stage_type?: string; modules?: Array<{ name: string }> }): boolean => {
    if (stage.stage_type === 'single_module') return true;
    if (stage.stage_type === 'module_collection') return false;

    if (!stage.modules || stage.modules.length === 0) return false;
    if (stage.modules.length > 1) return false;
    return stage.modules[0].name.toLowerCase() === stage.name.toLowerCase();
};
