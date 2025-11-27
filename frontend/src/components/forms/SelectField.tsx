import React, { memo, useCallback, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: Option[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

export const SelectField = memo(forwardRef<HTMLSelectElement, SelectFieldProps>(({
  id,
  label,
  value,
  options,
  placeholder = 'Select an option',
  error,
  required = false,
  disabled = false,
  loading = false,
  className,
  onChange,
  onBlur
}, ref) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-neutral-900"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <select
        ref={ref}
        id={id}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled || loading}
        className={cn(
          'w-full px-3 py-2 rounded-lg border bg-white text-neutral-900',
          error ? 'border-red-500' : 'border-neutral-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          (disabled || loading) && 'opacity-50 cursor-not-allowed',
          'transition-colors duration-200'
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}));

SelectField.displayName = 'SelectField';