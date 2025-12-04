import React from 'react';

interface Option {
    id: string;
    label: string;
    value: string;
}

interface ChoiceSelectorProps {
    type: 'single' | 'multiple';
    options: Option[];
    value: string | string[]; // string for single, string[] for multiple
    onChange: (value: string | string[]) => void;
}

export const ChoiceSelector: React.FC<ChoiceSelectorProps> = ({
    type,
    options,
    value,
    onChange
}) => {
    const handleSingleChange = (optionValue: string) => {
        onChange(optionValue);
    };

    const handleMultipleChange = (optionValue: string) => {
        const currentValues = Array.isArray(value) ? value : [];
        const newValues = currentValues.includes(optionValue)
            ? currentValues.filter(v => v !== optionValue)
            : [...currentValues, optionValue];
        onChange(newValues);
    };

    return (
        <div className="w-full space-y-3">
            {options.map((option) => {
                const isSelected = type === 'single'
                    ? value === option.value
                    : (Array.isArray(value) && value.includes(option.value));

                return (
                    <label
                        key={option.id}
                        className={`
              flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all
              ${isSelected
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }
            `}
                    >
                        <div className={`
              flex-shrink-0 flex items-center justify-center w-6 h-6 mr-4 border-2
              ${type === 'single' ? 'rounded-full' : 'rounded-md'}
              ${isSelected
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300 bg-white'
                            }
            `}>
                            {isSelected && (
                                type === 'single' ? (
                                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                ) : (
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )
                            )}
                        </div>

                        <span className={`text-base ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                            {option.label || option.value}
                        </span>

                        <input
                            type={type === 'single' ? 'radio' : 'checkbox'}
                            className="hidden"
                            name="choice-selector"
                            value={option.value}
                            checked={isSelected}
                            onChange={() => type === 'single'
                                ? handleSingleChange(option.value)
                                : handleMultipleChange(option.value)
                            }
                        />
                    </label>
                );
            })}
        </div>
    );
};
