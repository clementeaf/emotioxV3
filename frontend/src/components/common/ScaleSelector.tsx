import React from 'react';
import { FormSelect } from './FormSelect';

interface ScaleRange {
  start: number;
  end: number;
}

interface ScaleSelectorProps {
  value: ScaleRange;
  onChange: (range: ScaleRange) => void;
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const ScaleSelector: React.FC<ScaleSelectorProps> = ({
  value,
  onChange,
  options = [
    { value: '1-5', label: 'Escala 1-5' },
    { value: '1-7', label: 'Escala 1-7' },
    { value: '1-10', label: 'Escala 1-10' },
    { value: '0-10', label: 'Escala 0-10' },
    { value: '0-6', label: 'Escala 0-6' }
  ],
  disabled = false,
  error,
  className = ''
}) => {
  const currentValue = `${value.start}-${value.end}`;
  
  const handleChange = (selectedValue: string) => {
    const [start, end] = selectedValue.split('-').map(Number);
    onChange({ start, end });
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="text-sm font-medium text-gray-900">Escala</span>
      <FormSelect
        label=""
        value={currentValue}
        onChange={handleChange}
        options={options}
        disabled={disabled}
        error={error}
        className="flex-1"
      />
    </div>
  );
};

export default ScaleSelector;
