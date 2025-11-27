import React from 'react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';

interface FormFieldProps {
  /** Tipo de campo */
  type: 'text' | 'textarea' | 'number' | 'email' | 'toggle';
  /** Etiqueta del campo */
  label: string;
  /** Valor del campo */
  value: any;
  /** Callback de cambio */
  onChange: (value: any) => void;
  /** Placeholder */
  placeholder?: string;
  /** Si está deshabilitado */
  disabled?: boolean;
  /** Si hay error */
  error?: boolean;
  /** Mensaje de error */
  errorMessage?: string;
  /** Configuración específica del tipo */
  config?: {
    min?: number;
    max?: number;
    step?: number;
    rows?: number;
  };
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Componente atómico de campo de formulario
 * Reemplaza la duplicación en ChoiceQuestion, ScaleQuestion, TextQuestion, etc.
 */
export const FormField: React.FC<FormFieldProps> = ({
  type,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  error = false,
  errorMessage,
  config = {},
  className = ''
}) => {
  const commonProps = {
    value: value || '',
    onChange: (e: any) => onChange(e.target?.value ?? e),
    placeholder,
    disabled,
    error,
    helperText: errorMessage,
    className
  };

  const renderField = () => {
    switch (type) {
      case 'text':
      case 'email':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <Input
              type={type}
              {...commonProps}
            />
          </div>
        );

      case 'textarea':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <Textarea
              rows={config.rows || 3}
              {...commonProps}
            />
          </div>
        );

      case 'number':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <Input
              type="number"
              min={config.min}
              max={config.max}
              step={config.step}
              {...commonProps}
            />
          </div>
        );

      case 'toggle':
        return (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {label}
            </label>
            <Switch
              checked={value}
              onChange={onChange}
              disabled={disabled}
            />
          </div>
        );

      default:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
            <Input
              type="text"
              {...commonProps}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      {renderField()}
    </div>
  );
};
