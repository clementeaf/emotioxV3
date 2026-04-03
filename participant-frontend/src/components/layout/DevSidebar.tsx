import React, { useMemo, useEffect } from 'react';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { MOCK_MODULES } from '../../data/mockModules';
import type { ModuleConfig } from '../../types/module';

interface DevSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    modules?: Record<string, ModuleConfig>; // Optional: actual modules from backend
    stepsOrder?: string[];
    isPreviewMode?: boolean;
}

/**
 * Obtiene el nombre corto para mostrar en el sidebar
 * @param moduleKey - Clave del módulo
 * @param moduleName - Nombre completo del módulo
 * @returns Nombre corto para mostrar
 */
function getModuleDisplayName(moduleKey: string, moduleName: string): string {
    const displayNames: Record<string, string> = {
        welcome: 'Welcome',
        demographics: 'Demographics',
        'thank-you': 'Thank You',
    };

    return displayNames[moduleKey] || moduleName;
}

const SMARTVOC_NAMES = new Set(['CSAT', 'NPS', 'CES', 'CV', 'NEV', 'VOC']);
const COGNITIVE_NAMES = new Set(['Short Text', 'Long Text', 'Single Choice', 'Multiple Choice', 'Linear Scale', 'Ranking', 'Navigation Flow', 'Preference Test']);

type DevNavGroup =
    | 'general'
    | 'smartvoc'
    | 'screener'
    | 'implicitAssociation'
    | 'cognitive'
    | 'eyeTracking'
    | 'other'
    | 'conclusion';

/**
 * Buckets modules for the dev sidebar. Mirrors DynamicStep renderer selection (by module.name).
 */
function getModuleGroup(key: string, mod: ModuleConfig): DevNavGroup {
    if (key === 'welcome' || key === 'demographics') {
        return 'general';
    }
    if (key === 'thank-you') {
        return 'conclusion';
    }
    const name = mod.name || '';
    const lower = name.toLowerCase();
    if (SMARTVOC_NAMES.has(name) || [...SMARTVOC_NAMES].some((s) => name.includes(s))) {
        return 'smartvoc';
    }
    if (lower === 'screener' || lower.includes('screener')) {
        return 'screener';
    }
    if (
        lower.includes('attribute testing') ||
        lower.includes('comparing attribute') ||
        lower.includes('objects comparing') ||
        lower.includes('object comparing')
    ) {
        return 'implicitAssociation';
    }
    if (lower === 'eye tracking' || lower.includes('eye tracking') || lower.includes('eyetracking')) {
        return 'eyeTracking';
    }
    if (COGNITIVE_NAMES.has(name)) {
        return 'cognitive';
    }
    return 'other';
}

/**
 * Agrupa los módulos por etapas.
 * Supports both name-based keys (welcome, demographics, thank-you) and UUID keys.
 */
function getGroupedModules(modules: Record<string, ModuleConfig>, stepsOrder?: string[]): { title: string; items: [string, ModuleConfig][] }[] {
    const groups: Record<DevNavGroup, { title: string; items: [string, ModuleConfig][] }> = {
        general: { title: 'General', items: [] },
        smartvoc: { title: 'SmartVOC', items: [] },
        screener: { title: 'Screener', items: [] },
        implicitAssociation: { title: 'Implicit Association', items: [] },
        cognitive: { title: 'Cognitive Tasks', items: [] },
        eyeTracking: { title: 'Eye Tracking', items: [] },
        other: { title: 'Other', items: [] },
        conclusion: { title: 'Conclusion', items: [] },
    };

    // Use stepsOrder to maintain correct ordering, fallback to Object.keys
    const keys = stepsOrder && stepsOrder.length > 0
        ? stepsOrder.filter(k => modules[k])
        : Object.keys(modules);

    for (const key of keys) {
        const mod = modules[key];
        if (!mod) continue;
        const group = getModuleGroup(key, mod);
        groups[group].items.push([key, mod]);
    }

    return Object.values(groups).filter((g) => g.items.length > 0);
}

export const DevSidebar: React.FC<DevSidebarProps> = ({ isOpen, onToggle, modules, stepsOrder, isPreviewMode }) => {
    const { currentStep, setCurrentStep } = useParticipantStore();
    const { getSessionSummary } = useSessionStore();

    // Use actual modules from backend if provided, otherwise fall back to mocks
    const activeModules = modules && Object.keys(modules).length > 0 ? modules : MOCK_MODULES;
    const groupedModules = useMemo(() => getGroupedModules(activeModules, stepsOrder), [activeModules, stepsOrder]);
    const sessionSummary = getSessionSummary();

    // Calculate global index for numbering
    let globalIndex = 0;

    // Format duration
    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent): void => {
            const target = event.target as HTMLElement;
            const sidebar = document.querySelector('[data-dev-sidebar]');
            const burgerButton = document.querySelector('[data-burger-button]');

            if (sidebar && !sidebar.contains(target) && !burgerButton?.contains(target)) {
                // Only close on mobile (screen width < 768px)
                if (window.innerWidth < 768) {
                    onToggle();
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onToggle]);

    return (
        <>
            {/* Burger Menu Button - Mobile Only */}
            <button
                data-burger-button
                onClick={onToggle}
                className={`fixed left-4 z-50 md:hidden bg-white shadow-lg border border-gray-200 rounded-lg p-2 text-gray-700 hover:bg-gray-50 transition-colors ${isPreviewMode ? 'top-16' : 'top-4'}`}
                aria-label="Toggle navigation menu"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    {isOpen ? (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    ) : (
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    )}
                </svg>
            </button>

            {/* Overlay - Mobile Only */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <div
                data-dev-sidebar
                className={`fixed top-4 bottom-4 bg-white shadow-2xl border border-gray-100 rounded-2xl transition-all duration-300 z-40 flex flex-col overflow-hidden
                    ${isOpen
                        ? 'left-4 md:left-4'
                        : '-left-full md:left-4 md:w-20'
                    }
                    ${isOpen ? 'w-[280px] md:w-[280px]' : 'md:w-20'}
                `}
            >
                {/* Header */}
                <div className={`p-6 border-b border-gray-200 flex items-center ${isOpen ? 'justify-between' : 'justify-center'}`}>
                    {isOpen ? (
                        <>
                            <div className="overflow-hidden whitespace-nowrap">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Dev Nav
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">
                                    Dev mode
                                </p>
                            </div>
                            <button
                                onClick={onToggle}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100 flex-shrink-0 ml-2"
                                aria-label="Collapse sidebar"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                                    />
                                </svg>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onToggle}
                            className="text-blue-600 hover:text-blue-700 transition-colors p-1 rounded-md hover:bg-blue-50"
                            aria-label="Expand sidebar"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-2 sm:p-4 scrollbar-hide">
                    <nav className="space-y-6">
                        {groupedModules.map((group) => (
                            <div key={group.title}>
                                {isOpen && (
                                    <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                                        {group.title}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {group.items.map(([moduleKey, module]) => {
                                        const isActive = currentStep === moduleKey;
                                        const displayName = getModuleDisplayName(
                                            moduleKey,
                                            module.name
                                        );
                                        globalIndex++;

                                        return (
                                            <button
                                                key={moduleKey}
                                                onClick={() => {
                                                    setCurrentStep(moduleKey);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-3 ${isActive
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                                    } ${!isOpen ? 'justify-center' : ''}`}
                                                title={!isOpen ? displayName : undefined}
                                            >
                                                <span
                                                    className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold flex-shrink-0 ${isActive
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-blue-100 text-blue-600'
                                                        }`}
                                                >
                                                    {globalIndex}
                                                </span>
                                                {isOpen && (
                                                    <span className="truncate">{displayName}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>
                {/* Footer */}
                {isOpen && (
                    <div className="p-4 border-t border-gray-200 space-y-3">
                        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Session Metrics
                        </div>
                        <div className="space-y-2 text-xs text-gray-600">
                            <div className="flex justify-between">
                                <span>Device:</span>
                                <span className="font-medium text-gray-900">
                                    {sessionSummary.device?.deviceType || 'Unknown'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Browser:</span>
                                <span className="font-medium text-gray-900">
                                    {sessionSummary.device?.browserName || 'Unknown'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Duration:</span>
                                <span className="font-medium text-gray-900">
                                    {formatDuration(sessionSummary.metrics.duration)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Focus time:</span>
                                <span className="font-medium text-gray-900">
                                    {formatDuration(sessionSummary.metrics.focusTime)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Interactions:</span>
                                <span className="font-medium text-gray-900">
                                    {sessionSummary.metrics.interactionCount}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Steps:</span>
                                <span className="font-medium text-gray-900">
                                    {sessionSummary.metrics.stepChanges}
                                </span>
                            </div>
                        </div>
                        <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-200">
                            DEV MODE
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
