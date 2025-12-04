import React from 'react';

interface ScaleSelectorProps {
    min: number;
    max: number;
    value: number | null;
    onChange: (value: number) => void;
    startLabel?: string;
    endLabel?: string;
}

export const ScaleSelector: React.FC<ScaleSelectorProps> = ({
    min,
    max,
    value,
    onChange,
    startLabel,
    endLabel
}) => {
    // Generate array of numbers from min to max
    const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    return (
        <div className="w-full space-y-4">
            {/* Scale buttons */}
            <div className="flex justify-between items-center gap-2">
                {numbers.map((num) => (
                    <button
                        key={num}
                        type="button"
                        onClick={() => onChange(num)}
                        className={`
              flex-1 h-12 rounded-lg border-2 font-medium text-base transition-all
              ${value === num
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105'
                                : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                            }
            `}
                    >
                        {num}
                    </button>
                ))}
            </div>

            {/* Labels */}
            {(startLabel || endLabel) && (
                <div className="flex justify-between items-center text-sm text-gray-600">
                    <span className="text-left">{startLabel || ''}</span>
                    <span className="text-right">{endLabel || ''}</span>
                </div>
            )}
        </div>
    );
};
