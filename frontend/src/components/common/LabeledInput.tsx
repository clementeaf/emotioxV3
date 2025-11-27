import React from 'react';

interface LabeledInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  id?: string;
  type?: string;
  labelWidth?: string;
}

export const LabeledInput: React.FC<LabeledInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  className = '',
  id,
  type = 'text',
  labelWidth = 'w-32'
}) => {
  const inputId = id || `labeled-input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div className={`flex gap-4 items-center ${className}`}>
      <span className={`text-sm text-gray-500 ${labelWidth} text-right`}>
        {label}
      </span>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          flex-1 h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
          ${error ? 'border-red-500' : 'border-gray-200 bg-gray-50'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
        `}
      />
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default LabeledInput;
