import { useState, useRef, useEffect, useId, type KeyboardEvent } from 'react';
import { cn } from '../ui/Button';

interface AutocompleteOption {
    value: string;
    label: string;
}

interface AutocompleteProps {
    id?: string;
    label?: string;
    error?: string;
    options: AutocompleteOption[];
    value?: string;
    onChange?: (value: string) => void;
    onSelect?: (option: AutocompleteOption) => void;
    onCreateNew?: (label: string) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    createNewLabel?: string;
}

/**
 * Autocomplete component with search and create new functionality
 * Allows typing to search existing options or create new ones
 * @param props - Autocomplete props
 */
export const Autocomplete = ({
    id: propId,
    label,
    error,
    options,
    value,
    onChange,
    onSelect,
    onCreateNew,
    placeholder = 'Type to search...',
    disabled = false,
    // required = false,
    className,
    createNewLabel = 'Create new',
}: AutocompleteProps) => {
    const generatedId = useId();
    const id = propId || generatedId;
    const [inputValue, setInputValue] = useState<string>('');
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    const [showCreateOption, setShowCreateOption] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) {
            const selectedOption = options.find((opt) => opt.value === value);
            if (selectedOption) {
                // eslint-disable-next-line
                setInputValue(selectedOption.label);
            } else {
                setInputValue(value);
            }
        } else {
            setInputValue('');
        }
    }, [value, options]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(inputValue.toLowerCase())
    );

    const exactMatch = options.find(
        (option) => option.label.toLowerCase() === inputValue.toLowerCase()
    );

    useEffect(() => {
        // eslint-disable-next-line
        setShowCreateOption(
            inputValue.trim().length > 0 && !exactMatch && onCreateNew !== undefined
        );
    }, [inputValue, exactMatch, onCreateNew]);

    const handleInputChange = (newValue: string): void => {
        setInputValue(newValue);
        setIsOpen(true);
        setHighlightedIndex(-1);
        if (onChange) {
            onChange(newValue);
        }
    };

    const handleSelectOption = (option: AutocompleteOption): void => {
        setInputValue(option.label);
        setIsOpen(false);
        setHighlightedIndex(-1);
        if (onChange) {
            onChange(option.value);
        }
        if (onSelect) {
            onSelect(option);
        }
    };

    const handleCreateNew = (): void => {
        if (onCreateNew && inputValue.trim()) {
            onCreateNew(inputValue.trim());
            setIsOpen(false);
            setHighlightedIndex(-1);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsOpen(true);
            return;
        }

        if (!isOpen) return;

        const totalOptions = filteredOptions.length + (showCreateOption ? 1 : 0);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev < totalOptions - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    handleSelectOption(filteredOptions[highlightedIndex]);
                } else if (highlightedIndex === filteredOptions.length && showCreateOption) {
                    handleCreateNew();
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    useEffect(() => {
        if (listRef.current && highlightedIndex >= 0) {
            const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
                    {label}
                </label>
            )}
            <div ref={containerRef} className="relative">
                <input
                    ref={inputRef}
                    id={id}
                    name={id}
                    type="text"
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={cn(
                        'flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
                        error && 'border-red-300 focus:ring-red-400 focus:border-red-400',
                        className
                    )}
                    style={{ backgroundColor: 'white' }}
                />
                {isOpen && (filteredOptions.length > 0 || showCreateOption) && (
                    <div
                        ref={listRef}
                        className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-auto"
                    >
                        {filteredOptions.map((option, index) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelectOption(option)}
                                className={cn(
                                    'w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 transition-colors',
                                    highlightedIndex === index && 'bg-blue-50 text-blue-600'
                                )}
                                style={{
                                    backgroundColor: highlightedIndex === index ? '#eff6ff' : 'white',
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                        {showCreateOption && (
                            <button
                                type="button"
                                onClick={handleCreateNew}
                                className={cn(
                                    'w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 transition-colors border-t border-gray-200',
                                    highlightedIndex === filteredOptions.length && 'bg-blue-50'
                                )}
                                style={{
                                    backgroundColor: highlightedIndex === filteredOptions.length ? '#eff6ff' : 'white',
                                }}
                            >
                                {createNewLabel}: "{inputValue}"
                            </button>
                        )}
                    </div>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
};

export type { AutocompleteOption };

