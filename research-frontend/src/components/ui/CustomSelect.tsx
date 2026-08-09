import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface CustomSelectProps {
    id?: string;
    label?: string;
    error?: string;
    /** Inline: label and trigger on one row (e.g. Screener header). */
    labelPosition?: 'above' | 'inline';
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
    labelPosition = 'above',
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
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [selectedValue, setSelectedValue] = useState<string>(value || '');
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const selectRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value !== undefined) {
            setSelectedValue(value);
        }
    }, [value]);

    const openDropdown = () => {
        setIsOpen(true);
        requestAnimationFrame(() => setIsVisible(true));
    };

    const closeDropdown = () => {
        setIsVisible(false);
        setTimeout(() => setIsOpen(false), 150);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            const target = event.target as Node;
            const clickedInsideSelect = selectRef.current && selectRef.current.contains(target);
            const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);

            if (!clickedInsideSelect && !clickedInsideDropdown) {
                closeDropdown();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);

            if (selectRef.current) {
                const rect = selectRef.current.getBoundingClientRect();
                const estimatedHeight = Math.min(Math.max(options.length, 1) * 36 + 8, 240);
                const spaceBelow = window.innerHeight - rect.bottom;
                const openUpward = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
                setDropdownPosition({
                    top: openUpward ? rect.top - estimatedHeight - 4 : rect.bottom + 4,
                    left: rect.left,
                    width: rect.width
                });
            }

            const handleScroll = (e: Event) => {
                const target = e.target;
                if (target instanceof Element && target.hasAttribute('data-custom-select-dropdown')) return;
                closeDropdown();
            };
            window.addEventListener('scroll', handleScroll, true);

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                window.removeEventListener('scroll', handleScroll, true);
            };
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, options.length]);

    const selectedOption = options.find((opt) => opt.value === selectedValue);

    const handleSelect = (optionValue: string): void => {
        setSelectedValue(optionValue);
        closeDropdown();
        if (onChange) {
            onChange(optionValue);
        }
    };

    const isInline = labelPosition === 'inline';

    return (
        <div className="w-full min-w-0 overflow-hidden">
            <div
                className={cn(
                    isInline && label && 'flex flex-row flex-wrap items-center gap-3 min-w-0'
                )}
            >
                {label && (
                    <label
                        htmlFor={id}
                        className={cn(
                            'text-sm font-medium text-gray-700',
                            isInline ? 'shrink-0 whitespace-nowrap' : 'mb-1.5 block'
                        )}
                    >
                        {label}
                    </label>
                )}
                <div ref={selectRef} className={cn('relative min-w-0 overflow-hidden', isInline && label ? 'flex-1' : 'w-full')}>
                <button
                    type="button"
                    id={id}
                    name={id}
                    onClick={() => !disabled && (isOpen ? closeDropdown() : openDropdown())}
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
                        data-custom-select-dropdown
                        className={cn(
                            'fixed z-[9999] rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-auto transition-all duration-150',
                            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        )}
                        style={{
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            width: `${dropdownPosition.width}px`
                        }}
                        onWheel={e => e.stopPropagation()}
                    >
                        {options.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
                        ) : (
                            options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => !option.disabled && handleSelect(option.value)}
                                    disabled={option.disabled}
                                    className={cn(
                                        'w-full px-3 py-2 text-left text-sm transition-colors',
                                        option.disabled
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : 'text-gray-800 hover:bg-gray-50',
                                        selectedValue === option.value && !option.disabled && 'bg-blue-50 text-blue-600'
                                    )}
                                    style={{ backgroundColor: selectedValue === option.value && !option.disabled ? '#eff6ff' : 'white' }}
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
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
};

export type { SelectOption };
