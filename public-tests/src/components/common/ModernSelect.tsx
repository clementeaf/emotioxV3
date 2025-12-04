import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  className?: string;
}

export interface ModernSelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ModernSelect: React.FC<ModernSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción',
  disabled = false,
  required = false,
  error,
  label,
  className = '',
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const selectRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement[]>([]);

  const selectedOption = options.find(option => option.value === value);

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manejar navegación con teclado
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else if (focusedIndex >= 0) {
          const selectedOption = options[focusedIndex];
          if (selectedOption && !selectedOption.disabled) {
            onChange(selectedOption.value);
            setIsOpen(false);
            setFocusedIndex(-1);
          }
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          const nextIndex = Math.min(focusedIndex + 1, options.length - 1);
          setFocusedIndex(nextIndex);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          const prevIndex = Math.max(focusedIndex - 1, 0);
          setFocusedIndex(prevIndex);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  const handleOptionClick = (option: SelectOption) => {
    if (!option.disabled) {
      onChange(option.value);
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  };

  const toggleOpen = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setFocusedIndex(isOpen ? -1 : 0);
    }
  };

  // Clases de tamaño
  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-3 px-4 text-base',
    lg: 'py-4 px-5 text-lg'
  };

  // Clases del contenedor principal
  const containerClasses = `
    relative w-full
    ${className}
  `.trim();

  // Clases del trigger
  const triggerClasses = `
    ${sizeClasses[size]}
    w-full
    bg-white
    border border-gray-300
    rounded-lg
    shadow-sm
    cursor-pointer
    transition-all duration-200
    flex items-center justify-between
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-gray-400'}
    ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
    ${isOpen ? 'border-blue-500 ring-2 ring-blue-500' : ''}
  `.trim();

  // Clases del dropdown
  const dropdownClasses = `
    absolute top-full left-0 right-0 mt-1 z-50
    bg-white
    border border-gray-300
    rounded-lg
    shadow-lg
    max-h-60 overflow-y-auto
    transition-all duration-200
    ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}
  `.trim();

  return (
    <div className={containerClasses}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Select Trigger */}
      <div
        ref={selectRef}
        className={triggerClasses}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-required={required}
        aria-invalid={!!error}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        
        {/* Icono de flecha */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown */}
      <div className={dropdownClasses} role="listbox">
        {options.map((option, index) => {
          const optionClasses = `
            ${sizeClasses[size]}
            w-full text-left
            cursor-pointer
            transition-colors duration-150
            ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}
            ${focusedIndex === index ? 'bg-blue-100' : ''}
            ${option.value === value ? 'bg-blue-500 text-white' : 'text-gray-900'}
            ${option.className || ''}
          `.trim();

          return (
            <div
              key={option.value}
              ref={(el) => {
                if (el) optionsRef.current[index] = el;
              }}
              className={optionClasses}
              onClick={() => handleOptionClick(option)}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled}
            >
              {option.label}
              {option.value === value && (
                <svg
                  className="w-4 h-4 ml-2 inline-block"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};