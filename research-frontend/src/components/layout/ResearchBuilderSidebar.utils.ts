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

export const FIXED_STAGES = new Set(['welcome screen', 'thank you screen']);

export const sortStages = <T extends { name: string; order_index?: number }>(stages: T[]): T[] => {
    const getFixedOrder = (name: string): number | null => {
        const lower = name.toLowerCase();
        if (lower === 'welcome screen') return -2;
        if (lower === 'thank you screen') return 999;
        return null;
    };

    return [...stages].sort((a, b) => {
        const fixA = getFixedOrder(a.name);
        const fixB = getFixedOrder(b.name);
        if (fixA !== null && fixB !== null) return fixA - fixB;
        if (fixA !== null) return fixA < 0 ? -1 : 1;
        if (fixB !== null) return fixB < 0 ? 1 : -1;
        return (a.order_index ?? 0) - (b.order_index ?? 0);
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
