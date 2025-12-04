import React from 'react';

interface ScaleSelectorProps {
    min: number;
    max: number;
    value: number | null;
    onChange: (value: number) => void;
    startLabel?: string;
    endLabel?: string;
    variant?: 'buttons' | 'slider';
}

export const ScaleSelector: React.FC<ScaleSelectorProps> = ({
    min,
    max,
    value,
    onChange,
    startLabel,
    endLabel,
    variant = 'buttons'
}) => {
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
                        onChange={(e) => onChange(parseInt(e.target.value))}
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
