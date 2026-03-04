import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useResponse } from '../../hooks/useResponse';
import { ScaleSelector } from '../ui/ScaleSelector';

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
    onComplete?: () => void;
}

/**
 * Linear Scale Question component with horizontal slider
 * @param moduleId - Module identifier
 * @param componentId - Component identifier
 * @param title - Question title
 * @param description - Question description
 * @param minValue - Minimum value for the scale (default: 1)
 * @param maxValue - Maximum value for the scale (default: 5)
 * @param minLabel - Label for the minimum value
 * @param maxLabel - Label for the maximum value
 * @param required - Whether the question is required
 * @param onComplete - Callback when a value is selected
 * @returns Linear scale question with horizontal slider
 */
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
    onComplete,
}: LinearScaleQuestionProps) => {
    const { t } = useTranslation();
    const { value: storedValue, save } = useResponse({ moduleId, componentId });

    const [selectedValue, setSelectedValue] = useState<number | null>(() => {
        return typeof storedValue === 'number' ? storedValue : null;
    });

    useEffect(() => {
        if (selectedValue !== null) {
            save(selectedValue, {
                min: minValue,
                max: maxValue,
            });
        }
    }, [selectedValue, minValue, maxValue, save]);

    const handleChange = (value: number): void => {
        setSelectedValue(value);
    };

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
                <ScaleSelector
                    min={minValue}
                    max={maxValue}
                    value={selectedValue}
                    onChange={handleChange}
                    startLabel={minLabel}
                    endLabel={maxLabel}
                    variant="slider"
                />
            </div>

            {selectedValue !== null && (
                <div className="space-y-3">
                    <p className="text-sm text-center text-gray-500">
                        {t('linearScale.selectedValue', { value: selectedValue })}
                    </p>
                    {onComplete && (
                        <button
                            onClick={onComplete}
                            className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                        >
                            {t('common.continue')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
