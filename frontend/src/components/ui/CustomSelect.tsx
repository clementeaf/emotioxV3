import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  id?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  error = false,
  className,
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Encontrar la opción seleccionada
  const selectedOption = options.find(option => option.value === value);

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manejar teclas de navegación
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          // Navegación por opciones (implementación básica)
          const currentIndex = options.findIndex(opt => opt.value === value);
          const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          const nextOption = options[nextIndex];
          if (nextOption && !nextOption.disabled) {
            onChange(nextOption.value);
          }
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          const currentIndex = options.findIndex(opt => opt.value === value);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          const prevOption = options[prevIndex];
          if (prevOption && !prevOption.disabled) {
            onChange(prevOption.value);
          }
        }
        break;
    }
  };

  const handleOptionClick = (optionValue: string) => {
    if (disabled) return;
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        id={id}
        type="button"
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-left flex items-center justify-between',
          'bg-white text-neutral-900 shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-colors duration-200',
          error ? 'border-red-500' : 'border-neutral-200 hover:border-neutral-300',
          disabled && 'opacity-50 cursor-not-allowed bg-neutral-50',
          isOpen && 'ring-2 ring-blue-500 border-transparent'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={id && `${id}-label`}
      >
        <span className={cn(
          'block truncate',
          !selectedOption && 'text-neutral-500'
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          className={cn(
            'h-4 w-4 text-neutral-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )} 
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div className={cn(
          'absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg',
          'max-h-60 overflow-auto'
        )}>
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-500">
              No options available
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left hover:bg-neutral-50 focus:bg-neutral-50',
                  'focus:outline-none text-sm transition-colors duration-150',
                  'flex items-center justify-between',
                  option.disabled && 'opacity-50 cursor-not-allowed',
                  option.value === value && 'bg-blue-50 text-blue-900'
                )}
                onClick={() => !option.disabled && handleOptionClick(option.value)}
                disabled={option.disabled}
                role="option"
                aria-selected={option.value === value}
              >
                <span className="block truncate">{option.label}</span>
                {option.value === value && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};