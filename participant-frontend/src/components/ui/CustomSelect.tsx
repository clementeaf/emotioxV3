import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

interface SelectOption {
    value: string;
    label: string;
}

interface CustomSelectProps {
    id?: string;
    label?: string;
    options: SelectOption[];
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
    className?: string;
}

export const CustomSelect = ({
    id: propId,
    label,
    options,
    placeholder = 'Seleccionar...',
    value = '',
    onChange,
    disabled = false,
    className,
}: CustomSelectProps) => {
    const generatedId = useId();
    const id = propId || generatedId;
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const selectRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                selectRef.current && !selectRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        if (selectRef.current) {
            const rect = selectRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
            });
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue: string) => {
        setIsOpen(false);
        onChange?.(optionValue);
    };

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label}
                </label>
            )}
            <div ref={selectRef} className="relative w-full">
                <button
                    type="button"
                    id={id}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        'flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
                        className
                    )}
                >
                    <span className={cn(value ? 'text-gray-800' : 'text-gray-400', 'truncate')}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <svg
                        className={cn('h-4 w-4 text-gray-400 transition-transform flex-shrink-0', isOpen && 'rotate-180')}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                            width: `${dropdownPosition.width}px`,
                        }}
                    >
                        {options.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">Sin opciones</div>
                        ) : (
                            options.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={cn(
                                        'w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 transition-colors',
                                        value === option.value && 'bg-indigo-50 text-indigo-600 font-medium'
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))
                        )}
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};

export type { SelectOption };
