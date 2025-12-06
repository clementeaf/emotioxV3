import { useState, useEffect } from 'react';
import { useResponse } from '../../hooks/useResponse';

interface LinearScaleQuestionProps {
    moduleId: string;
    componentId: string;
    title?: string;
    description?: string;
    minValue?: number;
    maxValue?: number;
    minLabel?: string;
    maxLabel?: string;
    required?: boolean;
}

export const LinearScaleQuestion = ({
    moduleId,
    componentId,
    title,
    description,
    minValue = 1,
    maxValue = 5,
    minLabel,
    maxLabel,
    required = false,
}: LinearScaleQuestionProps) => {
    const [selectedValue, setSelectedValue] = useState<number | null>(null);
    const { save } = useResponse({ moduleId, componentId });

    useEffect(() => {
        if (selectedValue !== null) {
            save(selectedValue, {
                min: minValue,
                max: maxValue,
            });
        }
    }, [selectedValue, minValue, maxValue, save]);

    const handleSelect = (value: number) => {
        setSelectedValue(value);
    };

    const values = Array.from({ length: maxValue - minValue + 1 }, (_, i) => minValue + i);

    return (
        <div className="w-full space-y-6">
            {title && (
                <h2 className="text-xl font-semibold text-gray-900">
                    {title}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </h2>
            )}

            {description && (
                <p className="text-gray-600">{description}</p>
            )}

            <div className="space-y-4">
                {/* Scale buttons */}
                <div className="flex justify-center gap-2">
                    {values.map(value => {
                        const isSelected = selectedValue === value;
                        return (
                            <button
                                key={value}
                                onClick={() => handleSelect(value)}
                                className={`
                                    w-12 h-12 rounded-lg border-2 font-semibold transition-all
                                    ${isSelected
                                        ? 'border-purple-500 bg-purple-500 text-white scale-110'
                                        : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300 hover:scale-105'
                                    }
                                `}
                            >
                                {value}
                            </button>
                        );
                    })}
                </div>

                {/* Labels */}
                {(minLabel || maxLabel) && (
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>{minLabel || ''}</span>
                        <span>{maxLabel || ''}</span>
                    </div>
                )}
            </div>

            {selectedValue !== null && (
                <p className="text-sm text-center text-gray-500">
                    Valor seleccionado: {selectedValue}
                </p>
            )}
        </div>
    );
};
