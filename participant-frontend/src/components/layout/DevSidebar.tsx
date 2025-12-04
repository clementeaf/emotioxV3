import React, { useMemo } from 'react';
import { useParticipantStore } from '../../stores/useParticipantStore';
import { MOCK_MODULES } from '../../data/mockModules';
import type { ModuleConfig } from '../../types/module';

interface DevSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
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
        'thank-you': 'Thank You',
        csat: 'CSAT',
        nps: 'NPS',
        ces: 'CES',
        cv: 'CV',
        nev: 'NEV',
        voc: 'VOC',
        'short-text': 'Short Text',
        'long-text': 'Long Text',
        'single-choice': 'Single Choice',
        'multiple-choice': 'Multiple Choice',
        'linear-scale': 'Linear Scale',
        'ranking': 'Ranking',
        'navigation-flow': 'Navigation Flow',
        'preference-test': 'Preference Test'
    };

    return displayNames[moduleKey] || moduleName;
}

/**
 * Agrupa los módulos por etapas
 * @param modules - Objeto con todos los módulos
 * @returns Array de grupos con sus módulos
 */
function getGroupedModules(modules: Record<string, ModuleConfig>): { title: string; items: [string, ModuleConfig][] }[] {
    const groups = [
        {
            title: 'General',
            keys: ['welcome']
        },
        {
            title: 'SmartVOC',
            keys: ['csat', 'nps', 'ces', 'cv', 'nev', 'voc']
        },
        {
            title: 'Cognitive Tasks',
            keys: ['short-text', 'long-text', 'single-choice', 'multiple-choice', 'linear-scale', 'ranking', 'navigation-flow', 'preference-test']
        },
        {
            title: 'Conclusion',
            keys: ['thank-you']
        }
    ];

    return groups.map(group => ({
        title: group.title,
        items: group.keys
            .filter(key => modules[key])
            .map(key => [key, modules[key]] as [string, ModuleConfig])
    }));
}

export const DevSidebar: React.FC<DevSidebarProps> = ({ isOpen, onToggle }) => {
    const { currentStep, setCurrentStep } = useParticipantStore();

    const groupedModules = useMemo(() => getGroupedModules(MOCK_MODULES), []);

    // Calculate global index for numbering
    let globalIndex = 0;

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="fixed top-4 left-4 z-50 bg-blue-600 text-white p-2 rounded-lg shadow-lg hover:bg-blue-700 transition-all"
                aria-label="Toggle sidebar"
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

            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 h-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-r border-gray-200 transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                style={{ width: '280px' }}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Dev Navigation
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Development mode only
                        </p>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <nav className="space-y-6">
                            {groupedModules.map((group) => (
                                <div key={group.title}>
                                    <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        {group.title}
                                    </h3>
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
                                                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-3 ${isActive
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                                        }`}
                                                >
                                                    <span
                                                        className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold ${isActive
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-blue-100 text-blue-600'
                                                            }`}
                                                    >
                                                        {globalIndex}
                                                    </span>
                                                    <span className="truncate">{displayName}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>
                    </div>
                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="text-xs text-gray-400 text-center">
                            DEV MODE
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
};
