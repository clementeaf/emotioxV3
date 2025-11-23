import { useState, useEffect } from 'react';
import { cn } from '../ui/Button';

interface ScaleRatingProps {
    id?: string;
    label?: string;
    min?: number;
    max?: number;
    startLabel?: string;
    endLabel?: string;
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
    required?: boolean;
    className?: string;
}

export const ScaleRating = ({
    id,
    label,
    min = 0,
    max = 10,
    startLabel,
    endLabel,
    value,
    onChange,
    disabled = false,
    className,
}: ScaleRatingProps) => {
    const [selectedValue, setSelectedValue] = useState<string>(value || '');

    useEffect(() => {
        if (value !== undefined) {
            setSelectedValue(value);
        }
    }, [value]);

    const handleSelect = (val: string) => {
        if (disabled) return;
        setSelectedValue(val);
        if (onChange) {
            onChange(val);
        }
    };

    const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    return (
        <div className={cn("w-full space-y-3", className)}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}

            <div className="flex flex-col space-y-2">
                <div className="flex flex-wrap gap-1 sm:gap-2 justify-between">
                    {range.map((num) => (
                        <button
                            key={num}
                            type="button"
                            onClick={() => handleSelect(String(num))}
                            disabled={disabled}
                            className={cn(
                                "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg border text-sm font-medium transition-all duration-200",
                                selectedValue === String(num)
                                    ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600",
                                disabled && "opacity-50 cursor-not-allowed hover:border-gray-200 hover:text-gray-700"
                            )}
                        >
                            {num}
                        </button>
                    ))}
                </div>

                {(startLabel || endLabel) && (
                    <div className="flex justify-between text-xs text-gray-500 px-1">
                        <span>{startLabel}</span>
                        <span>{endLabel}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
