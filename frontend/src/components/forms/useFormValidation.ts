import { useState, useCallback, useMemo } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface FieldConfig {
  [key: string]: ValidationRule;
}

export interface UseFormValidationProps<T> {
  initialValues: T;
  validationRules: FieldConfig;
  onSubmit?: (values: T) => Promise<void> | void;
}

export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationRules,
  onSubmit
}: UseFormValidationProps<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validar un campo específico
  const validateField = useCallback((fieldName: keyof T, value: any): string | null => {
    const rules = validationRules[fieldName as string];
    if (!rules) return null;

    // Required
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return 'Este campo es requerido';
    }

    // Skip other validations if empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // Min length
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      return `Debe tener al menos ${rules.minLength} caracteres`;
    }

    // Max length
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      return `No puede tener más de ${rules.maxLength} caracteres`;
    }

    // Pattern
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      return 'Formato inválido';
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) return customError;
    }

    return null;
  }, [validationRules]);

  // Validar todos los campos
  const validateAllFields = useCallback((valuesToValidate: T = values): Partial<Record<keyof T, string>> => {
    const newErrors: Partial<Record<keyof T, string>> = {};

    Object.keys(validationRules).forEach((fieldName) => {
      const error = validateField(fieldName as keyof T, valuesToValidate[fieldName as keyof T]);
      if (error) {
        newErrors[fieldName as keyof T] = error;
      }
    });

    return newErrors;
  }, [values, validationRules, validateField]);

  // Actualizar valor de campo
  const setValue = useCallback((fieldName: keyof T, value: any) => {
    setValues(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Validar el campo si ya ha sido tocado
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error || undefined
      }));
    }
  }, [touched, validateField]);

  // Marcar campo como tocado
  const setFieldTouched = useCallback((fieldName: keyof T) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    // Validar el campo al marcarlo como tocado
    const error = validateField(fieldName, values[fieldName]);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error || undefined
    }));
  }, [values, validateField]);

  // Handle blur
  const handleBlur = useCallback((fieldName: keyof T) => {
    setFieldTouched(fieldName);
  }, [setFieldTouched]);

  // Handle change
  const handleChange = useCallback((fieldName: keyof T, value: any) => {
    setValue(fieldName, value);
  }, [setValue]);

  // Resetear formulario
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Submit del formulario
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Marcar todos los campos como tocados
    const allFieldsTouched = Object.keys(validationRules).reduce((acc, fieldName) => ({
      ...acc,
      [fieldName]: true
    }), {});
    setTouched(allFieldsTouched);

    // Validar todo
    const validationErrors = validateAllFields();
    setErrors(validationErrors);

    // Si hay errores, no enviar
    if (Object.keys(validationErrors).length > 0) {
      return false;
    }

    // Ejecutar onSubmit si está definido
    if (onSubmit) {
      try {
        setIsSubmitting(true);
        await onSubmit(values);
        return true;
      } catch (error) {
        return false;
      } finally {
        setIsSubmitting(false);
      }
    }

    return true;
  }, [validationRules, validateAllFields, onSubmit, values]);

  // Estados computados
  const isValid = useMemo(() => {
    return Object.keys(validateAllFields()).length === 0;
  }, [validateAllFields]);

  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  const touchedFields = useMemo(() => {
    return Object.keys(touched).filter(key => touched[key as keyof T]);
  }, [touched]);

  return {
    // Estado
    values,
    errors,
    touched,
    isSubmitting,
    
    // Estados computados
    isValid,
    isDirty,
    touchedFields,
    
    // Acciones
    setValue,
    setTouched: setFieldTouched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    validateField,
    validateAllFields
  };
}