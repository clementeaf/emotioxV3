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
            {/* Sidebar */}
            <div
                className="fixed top-4 left-4 bottom-4 bg-white shadow-2xl border border-gray-100 rounded-2xl transition-all duration-300 z-40 flex flex-col overflow-hidden"
                style={{ width: isOpen ? '280px' : '80px' }}
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
                    <div className="p-4 border-t border-gray-200">
                        <div className="text-xs text-gray-400 text-center">
                            DEV MODE
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
