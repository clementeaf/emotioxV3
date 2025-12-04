import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface SelectOption {
    value: string;
    label: string;
}

interface CustomSelectProps {
    id?: string;
    label?: string;
    error?: string;
    options: SelectOption[];
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
    required?: boolean;
    className?: string;
}

/**
 * Custom select component with white background
 * Custom dropdown that doesn't render over the input
 * @param props - Select props including label, error, options, and placeholder
 */
export const CustomSelect = ({
    id: propId,
    label,
    error,
    options,
    placeholder = 'Select an option',
    value,
    onChange,
    disabled = false,
    // required = false,
    className,
}: CustomSelectProps) => {
    const generatedId = useId();
    const id = propId || generatedId;
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [selectedValue, setSelectedValue] = useState<string>(value || '');
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const selectRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value !== undefined) {
            // eslint-disable-next-line
            setSelectedValue(value);
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            const target = event.target as Node;
            const clickedInsideSelect = selectRef.current && selectRef.current.contains(target);
            const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);

            if (!clickedInsideSelect && !clickedInsideDropdown) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);

            // Calculate dropdown position
            if (selectRef.current) {
                const rect = selectRef.current.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: rect.width
                });
            }
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const selectedOption = options.find((opt) => opt.value === selectedValue);

    const handleSelect = (optionValue: string): void => {
        setSelectedValue(optionValue);
        setIsOpen(false);
        if (onChange) {
            onChange(optionValue);
        }
    };

    return (
        <div className="w-full min-w-0 overflow-hidden">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label}
                </label>
            )}
            <div ref={selectRef} className="relative w-full min-w-0 overflow-hidden">
                <button
                    type="button"
                    id={id}
                    name={id}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        'flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors min-w-0',
                        error && 'border-red-300 focus:ring-red-400 focus:border-red-400',
                        className
                    )}
                    style={{ backgroundColor: 'white' }}
                >
                    <span className={cn(selectedValue ? 'text-gray-800' : 'text-gray-400', 'truncate min-w-0')}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <svg
                        className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isOpen && dropdownPosition && createPortal(
                    <div
                        ref={dropdownRef}
                        className="fixed z-[9999] rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-auto"
                        style={{
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            width: `${dropdownPosition.width}px`
                        }}
                    >
                        {options.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
                        ) : (
                            options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        'w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 transition-colors',
                                        selectedValue === option.value && 'bg-blue-50 text-blue-600'
                                    )}
                                    style={{ backgroundColor: selectedValue === option.value ? '#eff6ff' : 'white' }}
                                >
                                    {option.label}
                                </button>
                            ))
                        )}
                    </div>,
                    document.body
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
};

export type { SelectOption };
