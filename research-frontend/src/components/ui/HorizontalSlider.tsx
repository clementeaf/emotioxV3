import { useState, useId } from 'react';
import { cn } from '../../lib/utils';

interface HorizontalSliderProps {
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

export const HorizontalSlider = ({
    id: propId,
    label,
    min = 1,
    max = 5,
    startLabel,
    endLabel,
    value,
    onChange,
    disabled = false,
    className,
}: HorizontalSliderProps) => {
    const generatedId = useId();
    const id = propId || generatedId;
    
    // Use controlled value if provided, otherwise use internal state
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<number>(
        value ? parseInt(value) : min
    );
    const selectedValue = isControlled ? parseInt(value || String(min)) : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const newValue = parseInt(e.target.value);
        if (!isControlled) {
            setInternalValue(newValue);
        }
        if (onChange) {
            onChange(String(newValue));
        }
    };

    const percentage = ((selectedValue - min) / (max - min)) * 100;

    return (
        <div className={cn("w-full space-y-3", className)}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
            )}

            <div className="space-y-2">
                {/* Slider */}
                <div className="relative">
                    <input
                        type="range"
                        id={id}
                        name={id}
                        min={min}
                        max={max}
                        value={selectedValue}
                        onChange={handleChange}
                        disabled={disabled}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer horizontal-slider"
                        style={{
                            background: `linear-gradient(to right, #2563eb 0%, #2563eb ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`
                        }}
                    />
                </div>

                {/* Value display and labels */}
                <div className="flex items-center justify-between px-1">
                    <div className="flex flex-col items-start min-w-0">
                        <span className="text-sm font-medium text-gray-700">
                            {min}
                        </span>
                        {startLabel && (
                            <span className="text-xs text-gray-500 mt-1">{startLabel}</span>
                        )}
                    </div>
                    <div className="flex flex-col items-center flex-shrink-0 px-4">
                        <span className="text-lg font-semibold text-blue-600">
                            {selectedValue}
                        </span>
                    </div>
                    <div className="flex flex-col items-end min-w-0">
                        <span className="text-sm font-medium text-gray-700">
                            {max}
                        </span>
                        {endLabel && (
                            <span className="text-xs text-gray-500 mt-1 text-right">{endLabel}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

