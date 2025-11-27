import React, { memo, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  maxLength?: number;
  minLength?: number;
}

export const FormField: React.FC<FormFieldProps> = memo(({
  id,
  label,
  value,
  type = 'text',
  placeholder,
  error,
  required = false,
  disabled = false,
  className,
  onChange,
  onBlur,
  autoComplete,
  maxLength,
  minLength
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      <Input
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        error={!!error}
        disabled={disabled}
        autoComplete={autoComplete}
        maxLength={maxLength}
        minLength={minLength}
      />
      
      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';