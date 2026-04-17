import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { CustomSelect } from '../ui/CustomSelect';
import type { EnabledDemographic } from '../../pages/research/research-builder';
import type { ConditionalityConfig } from '../../utils/moduleRequired';
import { isDemographicCondition, isModuleCondition, isLinkedModuleCondition } from '../../utils/moduleRequired';

export interface StudyModuleOption {
    id: string;
    name: string;
    orderIndex: number;
    componentId: string;
    options: Array<{ id: string; label: string }>;
}

export interface LinkableModule {
    id: string;
    name: string;
    orderIndex: number;
}

interface ConditionalityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: ConditionalityConfig) => void;
    moduleName: string;
    demographics: EnabledDemographic[];
    initialConfig?: ConditionalityConfig | null;
    studyModules?: StudyModuleOption[];
    linkableModules?: LinkableModule[];
    currentModuleOrderIndex?: number;
}

type ConditionSource = 'demographic' | 'study-question' | 'linked-module';

/**
 * Modal for configuring conditionality rules on a question/section.
 * Supports demographic-based and study-question-based conditions.
 */
export const ConditionalityModal = ({
    isOpen,
    onClose,
    onSave,
    moduleName,
    demographics,
    initialConfig,
    studyModules = [],
    linkableModules = [],
    currentModuleOrderIndex = Infinity,
}: ConditionalityModalProps) => {
    const [conditionSource, setConditionSource] = useState<ConditionSource>('demographic');
    // Demographic state
    const [selectedQuestion, setSelectedQuestion] = useState('');
    const [selectedOption, setSelectedOption] = useState('');
    // Study question state
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedValues, setSelectedValues] = useState<string[]>([]);
    // Linked module state
    const [linkedModuleId, setLinkedModuleId] = useState('');

    // Only show modules that come before the current module
    const availableStudyModules = useMemo(
        () => studyModules.filter(m => m.orderIndex < currentModuleOrderIndex),
        [studyModules, currentModuleOrderIndex]
    );

    const availableLinkableModules = useMemo(
        () => linkableModules.filter(m => m.orderIndex < currentModuleOrderIndex),
        [linkableModules, currentModuleOrderIndex]
    );

    const hasStudyModules = availableStudyModules.length > 0;
    const hasLinkableModules = availableLinkableModules.length > 0;

    // Reset state when modal opens, seeding from initialConfig if present
    useEffect(() => {
        if (isOpen) {
            if (initialConfig) {
                if (isLinkedModuleCondition(initialConfig)) {
                    setConditionSource('linked-module');
                    setLinkedModuleId(initialConfig.linkedModuleId);
                    setSelectedQuestion('');
                    setSelectedOption('');
                    setSelectedModuleId('');
                    setSelectedValues([]);
                } else if (isModuleCondition(initialConfig)) {
                    setConditionSource('study-question');
                    setSelectedModuleId(initialConfig.sourceModuleId);
                    setSelectedValues([...initialConfig.selectedValues]);
                    setSelectedQuestion('');
                    setSelectedOption('');
                    setLinkedModuleId('');
                } else if (isDemographicCondition(initialConfig)) {
                    setConditionSource('demographic');
                    setSelectedQuestion(initialConfig.demographicKey);
                    setSelectedOption(initialConfig.demographicValue);
                    setSelectedModuleId('');
                    setSelectedValues([]);
                    setLinkedModuleId('');
                }
            } else {
                setConditionSource('demographic');
                setSelectedQuestion(demographics.length === 1 ? demographics[0].key : '');
                setSelectedOption('');
                setSelectedModuleId('');
                setSelectedValues([]);
                setLinkedModuleId('');
            }
        }
    }, [isOpen, demographics, initialConfig]);

    const selectedDemographic = useMemo(
        () => demographics.find(d => d.key === selectedQuestion),
        [demographics, selectedQuestion]
    );

    const questionOptions = useMemo(
        () => demographics.map(d => ({ value: d.key, label: d.label })),
        [demographics]
    );

    const answerOptions = useMemo(
        () => selectedDemographic?.validValues.map(val => ({ value: val, label: val })) || [],
        [selectedDemographic]
    );

    const selectedStudyModule = useMemo(
        () => availableStudyModules.find(m => m.id === selectedModuleId),
        [availableStudyModules, selectedModuleId]
    );

    const studyModuleOptions = useMemo(
        () => availableStudyModules.map(m => ({ value: m.id, label: m.name })),
        [availableStudyModules]
    );

    const handleQuestionChange = (key: string) => {
        setSelectedQuestion(key);
        setSelectedOption('');
    };

    const handleSourceChange = (source: string) => {
        setConditionSource(source as ConditionSource);
        // Reset selections when switching source
        setSelectedQuestion('');
        setSelectedOption('');
        setSelectedModuleId('');
        setSelectedValues([]);
        setLinkedModuleId('');
    };

    const handleModuleChange = (moduleId: string) => {
        setSelectedModuleId(moduleId);
        setSelectedValues([]);
    };

    const handleValueToggle = (valueId: string) => {
        setSelectedValues(prev =>
            prev.includes(valueId)
                ? prev.filter(v => v !== valueId)
                : [...prev, valueId]
        );
    };

    const canSave = conditionSource === 'demographic'
        ? Boolean(selectedQuestion && selectedOption)
        : conditionSource === 'study-question'
            ? Boolean(selectedModuleId && selectedValues.length > 0)
            : Boolean(linkedModuleId);

    const handleSave = () => {
        if (!canSave) return;
        if (conditionSource === 'demographic') {
            onSave({ action: 'show', demographicKey: selectedQuestion, demographicValue: selectedOption });
        } else if (conditionSource === 'study-question') {
            const mod = selectedStudyModule;
            if (!mod) return;
            onSave({
                action: 'show',
                sourceModuleId: selectedModuleId,
                sourceComponentId: mod.componentId,
                selectedValues,
                matchMode: 'any',
            });
        } else {
            onSave({ action: 'show', linkedModuleId });
        }
    };

    const linkableModuleOptions = useMemo(
        () => availableLinkableModules.map(m => ({ value: m.id, label: m.name })),
        [availableLinkableModules]
    );

    const sourceOptions = [
        { value: 'demographic', label: 'Demographic' },
        ...(hasStudyModules ? [{ value: 'study-question', label: 'Study question' }] : []),
        ...(hasLinkableModules ? [{ value: 'linked-module', label: 'Link with module' }] : []),
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Show conditionality"
            size="md"
        >
            <div className="space-y-5">
                {/* Question header */}
                <div>
                    <h3 className="text-base font-semibold text-gray-900">{moduleName}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Please, select the configuration for this question
                    </p>
                </div>

                {/* Condition row: Show / this section if */}
                <div className="flex items-center gap-3">
                    <CustomSelect
                        options={[{ value: 'show', label: 'Show' }]}
                        value="show"
                        className="w-auto"
                    />
                    <span className="text-sm text-gray-700">this section if</span>
                </div>

                {/* Condition source selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition source</label>
                    <CustomSelect
                        options={sourceOptions}
                        value={conditionSource}
                        onChange={handleSourceChange}
                    />
                </div>

                {/* Demographic condition (existing) */}
                {conditionSource === 'demographic' && (
                    <>
                        <CustomSelect
                            options={questionOptions}
                            value={selectedQuestion}
                            onChange={handleQuestionChange}
                            placeholder="Select a question"
                        />

                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 shrink-0">answer is</span>
                            <CustomSelect
                                options={answerOptions}
                                value={selectedOption}
                                onChange={setSelectedOption}
                                placeholder="Select an option"
                                disabled={!selectedDemographic}
                            />
                        </div>
                    </>
                )}

                {/* Study question condition (new) */}
                {conditionSource === 'study-question' && (
                    <>
                        <CustomSelect
                            options={studyModuleOptions}
                            value={selectedModuleId}
                            onChange={handleModuleChange}
                            placeholder="Select a study question"
                        />

                        {selectedStudyModule && (
                            <div>
                                <span className="block text-sm text-gray-700 mb-2">
                                    answer is any of:
                                </span>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {selectedStudyModule.options.map(opt => (
                                        <label
                                            key={opt.id}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedValues.includes(opt.id)}
                                                onChange={() => handleValueToggle(opt.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-900">{opt.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Linked module condition */}
                {conditionSource === 'linked-module' && (
                    <>
                        <p className="text-sm text-gray-600">
                            Show this section only if the selected module is also shown to the participant.
                        </p>
                        <CustomSelect
                            options={linkableModuleOptions}
                            value={linkedModuleId}
                            onChange={setLinkedModuleId}
                            placeholder="Select a module to link with"
                        />
                    </>
                )}

                {/* Warning banner */}
                <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-semibold text-gray-900">
                        The target you&apos;re using for this condition is optional.
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                        If participants don&apos;t answer that question this condition won&apos;t be
                        triggered, you may want to make it required.
                    </p>
                </div>

                {/* Save button */}
                <button
                    type="button"
                    disabled={!canSave}
                    className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSave}
                >
                    Save configuration
                </button>
            </div>
        </Modal>
    );
};
