// Componentes de formulario reutilizables
export { FormField } from './FormField';
export { SelectField } from './SelectField';
export { FormSection } from './FormSection';
export { FormActions } from './FormActions';

// Hook de validación
export { useFormValidation } from './useFormValidation';
export type { ValidationRule, FieldConfig, UseFormValidationProps } from './useFormValidation';

// Tipos
export interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}