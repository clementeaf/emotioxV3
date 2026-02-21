import { useState, useEffect } from 'react';
import { useResponse } from '../../hooks/useResponse';

interface Option {
    id: string;
    label: string;
}

interface ChoiceQuestionProps {
    moduleId: string;
    componentId: string;
    title?: string;
    description?: string;
    options: Option[];
    isMultiple?: boolean;
    required?: boolean;
    onComplete?: () => void;
}

export const ChoiceQuestion = ({
    moduleId,
    componentId,
    title,
    description,
    options,
    isMultiple = false,
    required = false,
    onComplete,
}: ChoiceQuestionProps) => {
    const { value: storedValue, save } = useResponse({ moduleId, componentId });

    // Derive selectedIds from store — single source of truth
    const [selectedIds, setSelectedIds] = useState<string[]>(() => {
        if (!storedValue) return [];
        if (Array.isArray(storedValue)) return storedValue as string[];
        if (typeof storedValue === 'string') return [storedValue];
        return [];
    });

    useEffect(() => {
        // Save selection
        if (selectedIds.length > 0) {
            const value = isMultiple ? selectedIds : selectedIds[0];
            save(value, {
                selectedCount: selectedIds.length,
                isMultiple,
            });
        }
    }, [selectedIds, isMultiple, save]);

    const handleSelect = (optionId: string) => {
        if (isMultiple) {
            setSelectedIds(prev =>
                prev.includes(optionId)
                    ? prev.filter(id => id !== optionId)
                    : [...prev, optionId]
            );
        } else {
            setSelectedIds([optionId]);
            // Auto-advance for single choice after a short delay
            if (onComplete) {
                setTimeout(() => {
                    onComplete();
                }, 500);
            }
        }
    };

    const isSelected = (optionId: string) => selectedIds.includes(optionId);

    return (
        <div className="w-full space-y-4">
            {title && (
                <h2 className="text-xl font-semibold text-gray-900">
                    {title}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </h2>
            )}

            {description && (
                <p className="text-gray-600">{description}</p>
            )}

            <div className="space-y-3">
                {options.map(option => {
                    const selected = isSelected(option.id);
                    return (
                        <button
                            key={option.id}
                            onClick={() => handleSelect(option.id)}
                            className={`
                                w-full px-4 py-3 rounded-lg border-2 text-left transition-all
                                ${selected
                                    ? 'border-purple-500 bg-purple-50 text-purple-900'
                                    : 'border-gray-300 bg-white text-gray-900 hover:border-purple-300'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                {/* Checkbox/Radio indicator */}
                                <div className={`
                                    flex items-center justify-center w-5 h-5 border-2 rounded transition-colors
                                    ${isMultiple ? 'rounded-md' : 'rounded-full'}
                                    ${selected
                                        ? 'border-purple-500 bg-purple-500'
                                        : 'border-gray-400 bg-white'
                                    }
                                `}>
                                    {selected && (
                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>

                                <span className="flex-1">{option.label}</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {selectedIds.length > 0 && (
                <p className="text-sm text-gray-500">
                    {isMultiple
                        ? `${selectedIds.length} ${selectedIds.length === 1 ? 'opción seleccionada' : 'opciones seleccionadas'}`
                        : 'Opción seleccionada'
                    }
                </p>
            )}
        </div>
    );
};
