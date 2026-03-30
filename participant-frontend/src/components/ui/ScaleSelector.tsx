import React from 'react';

export interface SentimentZones {
    /** Values in this range are negative (high effort / bad) */
    negative: [number, number];
    /** Values in this range are neutral */
    neutral: [number, number];
    /** Values in this range are positive (low effort / good) */
    positive: [number, number];
}

interface ScaleSelectorProps {
    min: number;
    max: number;
    value: number | null;
    onChange: (value: number) => void;
    startLabel?: string;
    endLabel?: string;
    variant?: 'buttons' | 'slider';
    /** Optional sentiment coloring for scale buttons (e.g. CES) */
    sentimentZones?: SentimentZones;
}

/** Returns Tailwind classes for a button based on its sentiment zone */
function getSentimentClasses(num: number, selected: boolean, zones?: SentimentZones): string {
    if (!zones) {
        // Default: blue when selected, gray otherwise
        return selected
            ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110'
            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:scale-105';
    }

    if (selected) {
        if (num >= zones.negative[0] && num <= zones.negative[1]) {
            return 'bg-red-500 border-red-500 text-white shadow-lg scale-110';
        }
        if (num >= zones.neutral[0] && num <= zones.neutral[1]) {
            return 'bg-amber-400 border-amber-400 text-white shadow-lg scale-110';
        }
        return 'bg-green-500 border-green-500 text-white shadow-lg scale-110';
    }

    // Unselected: tinted border/hover per zone
    if (num >= zones.negative[0] && num <= zones.negative[1]) {
        return 'bg-white border-red-200 text-red-600 hover:border-red-400 hover:bg-red-50 hover:scale-105';
    }
    if (num >= zones.neutral[0] && num <= zones.neutral[1]) {
        return 'bg-white border-amber-200 text-amber-600 hover:border-amber-400 hover:bg-amber-50 hover:scale-105';
    }
    return 'bg-white border-green-200 text-green-600 hover:border-green-400 hover:bg-green-50 hover:scale-105';
}

export const ScaleSelector: React.FC<ScaleSelectorProps> = ({
    min,
    max,
    value,
    onChange,
    startLabel,
    endLabel,
    variant = 'buttons',
    sentimentZones,
}) => {
    const handleChange = (newValue: number): void => {
        onChange(newValue);
    };
    // Generate array of numbers from min to max
    const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    if (variant === 'slider') {
        return (
            <div className="w-full space-y-6 px-2">
                <div className="relative w-full h-12 flex items-center">
                    {/* Track line */}
                    <div className="absolute w-full h-2 bg-gray-200 rounded-full"></div>

                    {/* Filled track */}
                    {value !== null && (
                        <div
                            className="absolute h-2 bg-blue-600 rounded-full transition-all duration-150"
                            style={{
                                width: `${((value - min) / (max - min)) * 100}%`
                            }}
                        ></div>
                    )}

                    {/* Input range (invisible but interactive) */}
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={1}
                        value={value || min}
                        onChange={(e) => handleChange(parseInt(e.target.value))}
                        className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                    />

                    {/* Thumb (visual representation) */}
                    {value !== null && (
                        <div
                            className="absolute w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-lg z-10 pointer-events-none transition-all duration-150"
                            style={{
                                left: `calc(${((value - min) / (max - min)) * 100}% - 12px)`
                            }}
                        ></div>
                    )}

                    {/* Ticks */}
                    <div className="absolute w-full flex justify-between px-1 pointer-events-none">
                        {numbers.map((num) => (
                            <div key={num} className="flex flex-col items-center gap-2">
                                <div className={`w-1 h-3 ${num === value ? 'bg-blue-600' : 'bg-gray-300'} rounded-full`}></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Values and Labels */}
                <div className="flex justify-between items-start text-sm">
                    <div className="flex flex-col items-start max-w-[40%]">
                        <span className="font-bold text-gray-900 mb-1">{min}</span>
                        <span className="text-gray-600 text-xs">{startLabel}</span>
                    </div>

                    {value !== null && (
                        <div className="text-blue-600 font-bold text-lg -mt-2">
                            {value}
                        </div>
                    )}

                    <div className="flex flex-col items-end max-w-[40%]">
                        <span className="font-bold text-gray-900 mb-1">{max}</span>
                        <span className="text-gray-600 text-right text-xs">{endLabel}</span>
                    </div>
                </div>
            </div>
        );
    }

    const renderButton = (num: number) => (
        <button
            key={num}
            type="button"
            onClick={() => handleChange(num)}
            className={`
                w-9 h-9 sm:w-12 sm:h-12 rounded-full border-2 font-medium text-xs sm:text-base
                transition-all flex items-center justify-center flex-shrink-0
                ${getSentimentClasses(num, value === num, sentimentZones)}
            `}
        >
            {num}
        </button>
    );

    return (
        <div className="w-full space-y-4">
            {/* Scale buttons */}
            {numbers.length >= 10 ? (
                <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="flex justify-center items-center gap-2 sm:gap-3 flex-wrap">
                        {numbers.slice(0, Math.ceil(numbers.length / 2)).map(renderButton)}
                    </div>
                    <div className="flex justify-center items-center gap-2 sm:gap-3 flex-wrap">
                        {numbers.slice(Math.ceil(numbers.length / 2)).map(renderButton)}
                    </div>
                </div>
            ) : (
                <div className="flex justify-center items-center gap-2 sm:gap-3 flex-wrap">
                    {numbers.map(renderButton)}
                </div>
            )}

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
