import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { useSessionStore } from '../../stores/useSessionStore';
import type { ModuleConfig } from '../../types/module';

interface DevSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    modules?: Record<string, ModuleConfig>;
    stepsOrder?: string[];
    isPreviewMode?: boolean;
}

// --- Icons (avoid inline SVG duplication) ---

const IconBurger: React.FC = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const IconClose: React.FC = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const IconCollapse: React.FC = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
);

const IconExpand: React.FC = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
);

// --- Helpers (outside component to avoid re-creation) ---

const DISPLAY_NAMES: Record<string, string> = {
    welcome: 'Welcome',
    screener: 'Screener',
    demographics: 'Demographics',
    'thank-you': 'Thank You',
};

function getDisplayName(key: string, moduleName: string): string {
    return DISPLAY_NAMES[key] || moduleName;
}

function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

const SMARTVOC_NAMES = new Set(['CSAT', 'NPS', 'CES', 'CV', 'NEV', 'VOC']);
const COGNITIVE_NAMES = new Set([
    'Short Text', 'Long Text', 'Single Choice', 'Multiple Choice',
    'Linear Scale', 'Ranking', 'Navigation Flow', 'Preference Test',
]);
type NavGroup = 'general' | 'smartvoc' | 'implicitAssociation' | 'cognitive' | 'eyeTracking' | 'other' | 'conclusion';

const GROUP_TITLES: Record<NavGroup, string> = {
    general: 'General',
    smartvoc: 'SmartVOC',
    implicitAssociation: 'Implicit Association',
    cognitive: 'Cognitive Tasks',
    eyeTracking: 'Eye Tracking',
    other: 'Other',
    conclusion: 'Conclusion',
};

function getModuleGroup(key: string, mod: ModuleConfig): NavGroup {
    // Special keys mapped directly
    if (key === 'welcome' || key === 'demographics' || key === 'screener') return 'general';
    if (key === 'thank-you') return 'conclusion';

    const name = mod.name || '';
    const lower = name.toLowerCase();

    if (SMARTVOC_NAMES.has(name) || [...SMARTVOC_NAMES].some(s => name.includes(s))) return 'smartvoc';
    if (lower.includes('attribute testing') || lower.includes('comparing attribute') ||
        lower.includes('objects comparing') || lower.includes('object comparing')) return 'implicitAssociation';
    if (lower.includes('eye tracking') || lower.includes('eyetracking')) return 'eyeTracking';
    if (COGNITIVE_NAMES.has(name)) return 'cognitive';

    return 'other';
}

function buildGroupedModules(
    modules: Record<string, ModuleConfig>,
    stepsOrder?: string[]
): { title: string; items: [string, ModuleConfig][] }[] {
    const groups = Object.fromEntries(
        (Object.keys(GROUP_TITLES) as NavGroup[]).map(k => [k, { title: GROUP_TITLES[k], items: [] as [string, ModuleConfig][] }])
    ) as Record<NavGroup, { title: string; items: [string, ModuleConfig][] }>;

    const keys = stepsOrder?.length ? stepsOrder.filter(k => modules[k]) : Object.keys(modules);

    for (const key of keys) {
        const mod = modules[key];
        if (!mod) continue;
        groups[getModuleGroup(key, mod)].items.push([key, mod]);
    }

    return Object.values(groups).filter(g => g.items.length > 0);
}

// --- Component ---

export const DevSidebar: React.FC<DevSidebarProps> = ({ isOpen, onToggle, modules, stepsOrder, isPreviewMode }) => {
    const { currentStep, setCurrentStep } = useParticipantStore();
    const { getSessionSummary } = useSessionStore();
    const sidebarRef = useRef<HTMLDivElement>(null);
    const burgerRef = useRef<HTMLButtonElement>(null);

    const activeModules = useMemo(() => modules && Object.keys(modules).length > 0 ? modules : {}, [modules]);
    const groupedModules = useMemo(() => buildGroupedModules(activeModules, stepsOrder), [activeModules, stepsOrder]);
    const sessionSummary = getSessionSummary();

    // Close sidebar on outside click (mobile only)
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (sidebarRef.current?.contains(target) || burgerRef.current?.contains(target)) return;
            if (window.innerWidth < 768) onToggle();
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onToggle]);

    // Flat index across all groups for numbering
    const flatItems = useMemo(() => groupedModules.flatMap(g => g.items), [groupedModules]);
    const getIndex = useCallback(
        (key: string) => flatItems.findIndex(([k]) => k === key) + 1,
        [flatItems]
    );

    return (
        <>
            {/* Burger — mobile only */}
            <button
                ref={burgerRef}
                onClick={onToggle}
                className={`fixed left-4 z-50 md:hidden bg-white shadow-lg border border-gray-200 rounded-lg p-2 text-gray-700 hover:bg-gray-50 transition-colors ${isPreviewMode ? 'top-16' : 'top-4'}`}
                aria-label="Toggle navigation menu"
            >
                {isOpen ? <IconClose /> : <IconBurger />}
            </button>

            {/* Overlay — mobile only */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onToggle} />
            )}

            {/* Sidebar panel */}
            <div
                ref={sidebarRef}
                className={`fixed top-4 bottom-4 bg-white shadow-2xl border border-gray-100 rounded-2xl transition-all duration-300 z-40 flex flex-col overflow-hidden
                    ${isOpen ? 'left-4 w-[280px]' : '-left-full md:left-4 md:w-20'}
                `}
            >
                {/* Header */}
                <div className={`p-6 border-b border-gray-200 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
                    {isOpen ? (
                        <>
                            <div className="overflow-hidden whitespace-nowrap">
                                <h2 className="text-lg font-semibold text-gray-900">Dev Nav</h2>
                                <p className="text-xs text-gray-500 mt-1">Dev mode</p>
                            </div>
                            <button
                                onClick={onToggle}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100 flex-shrink-0 ml-2"
                                aria-label="Collapse sidebar"
                            >
                                <IconCollapse />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onToggle}
                            className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded-md hover:bg-blue-50"
                            aria-label="Expand sidebar"
                        >
                            <IconExpand />
                        </button>
                    )}
                </div>

                {/* Nav */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-4 scrollbar-hide">
                    <nav className="space-y-6">
                        {groupedModules.map(group => (
                            <div key={group.title}>
                                {isOpen && (
                                    <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 truncate">
                                        {group.title}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {group.items.map(([key, mod]) => {
                                        const isActive = currentStep === key;
                                        const name = getDisplayName(key, mod.name);
                                        const idx = getIndex(key);

                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setCurrentStep(key)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-3
                                                    ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'}
                                                    ${!isOpen ? 'justify-center' : ''}
                                                `}
                                                title={!isOpen ? name : undefined}
                                            >
                                                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold flex-shrink-0
                                                    ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}
                                                `}>
                                                    {idx}
                                                </span>
                                                {isOpen && <span className="truncate">{name}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Session metrics footer */}
                {isOpen && (
                    <div className="p-4 border-t border-gray-200 space-y-3">
                        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Session Metrics
                        </div>
                        <dl className="space-y-2 text-xs text-gray-600">
                            {([
                                ['Device', sessionSummary.device?.deviceType],
                                ['Browser', sessionSummary.device?.browserName],
                                ['Duration', formatDuration(sessionSummary.metrics.duration)],
                                ['Focus time', formatDuration(sessionSummary.metrics.focusTime)],
                                ['Interactions', sessionSummary.metrics.interactionCount],
                                ['Steps', sessionSummary.metrics.stepChanges],
                            ] as const).map(([label, value]) => (
                                <div key={label} className="flex justify-between">
                                    <dt>{label}:</dt>
                                    <dd className="font-medium text-gray-900">{value || 'Unknown'}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-200">
                            DEV MODE
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
