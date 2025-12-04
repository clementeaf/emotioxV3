import React from 'react';

// 🎯 TIPOS REUTILIZABLES
export interface QuestionConfig {
  maxSelections?: number;
  multiple?: boolean;
  min?: number;
  max?: number;
  startLabel?: string;
  endLabel?: string;
  leftLabel?: string;
  rightLabel?: string;
  instructions?: string;
  placeholder?: string;
  emojis?: string[];
  type?: string;
}

export interface Question {
  title: string;
  questionKey: string;
  type: string;
  config?: QuestionConfig;
  choices?: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  description: string;
}

export interface FormData {
  value?: unknown;
  selectedValue?: unknown;
}

interface UseQuestionInitializationProps {
  question: Question;
  currentStepKey: string;
  initialFormData?: FormData;
  formValues?: FormData;
  hasLoadedData?: boolean;
}

export const useQuestionInitialization = ({
  question,
  currentStepKey,
  initialFormData,
  formValues,
  hasLoadedData
}: UseQuestionInitializationProps) => {
  const [value, setValueInternal] = React.useState<unknown>(null);
  const hasUserInteractedRef = React.useRef(false);
  
  // 🎯 RESETEAR TODO CUANDO CAMBIA EL STEP - Evitar datos del step anterior
  React.useEffect(() => {
    hasUserInteractedRef.current = false;
    setValueInternal(null);
  }, [currentStepKey]);
  
  // Wrapper de setValue que marca interacción del usuario
  const setValue = React.useCallback((newValue: unknown) => {
    hasUserInteractedRef.current = true;
    setValueInternal(newValue);
  }, []);

  // 🎯 FUNCIÓN PARA OBTENER VALOR INICIAL SEGÚN TIPO DE PREGUNTA
  const getInitialValue = React.useCallback((questionType: string, config?: QuestionConfig): unknown => {
    if (questionType === 'emojis' && config?.maxSelections && config.maxSelections > 1) {
      return [];
    } else if (questionType === 'text' || questionType === 'cognitive_short_text' || questionType === 'cognitive_long_text') {
      return '';
    } else if (questionType === 'choice' && config?.multiple) {
      return [];
    } else if (questionType === 'linear_scale') {
      // 🎯 Para escalas lineales, usar el valor mínimo como inicial (puede ser 0)
      return config?.min !== undefined ? config.min : 0;
    } else {
      return null;
    }
  }, []);

  const convertBackendValue = React.useCallback((
    backendValue: unknown, 
    questionType: string, 
    config?: QuestionConfig
  ): unknown => {
    // 🎯 Convertir strings separados por comas a arrays para opciones múltiples
    if ((questionType === 'emojis' || questionType === 'detailed') && 
        config?.maxSelections && 
        config.maxSelections > 1 && 
        typeof backendValue === 'string') {
      return backendValue.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
    // 🎯 Para opciones múltiples (choice con multiple: true), asegurar que sea array
    if (questionType === 'choice' && config?.multiple) {
      if (typeof backendValue === 'string') {
        // Si viene como string separado por comas (ej: "1,2"), separarlo
        if (backendValue.includes(',')) {
          return backendValue.split(',').map(item => item.trim()).filter(item => item.length > 0);
        }
        // Si es un string simple, intentar parsearlo como JSON primero
        try {
          const parsed = JSON.parse(backendValue);
          return Array.isArray(parsed) ? parsed : [backendValue];
        } catch {
          // Si no es JSON válido, tratarlo como un valor único
          return [backendValue];
        }
      }
      // Si ya es array, retornarlo; si es null/undefined, retornar array vacío
      return Array.isArray(backendValue) ? backendValue : (backendValue ? [backendValue] : []);
    }
    return backendValue;
  }, []);

  // 🎯 PRIMERO: Cargar datos del backend si están disponibles
  React.useEffect(() => {
    if (hasUserInteractedRef.current) {
      return;
    }
    
    // Prioridad 1: initialFormData (datos pasados directamente)
    if (initialFormData && Object.keys(initialFormData).length > 0) {
      let backendValue = initialFormData.value || initialFormData.selectedValue;
      backendValue = convertBackendValue(backendValue, question.type, question.config);
      
      const isTextType = question.type === 'text' || 
                        question.type === 'cognitive_short_text' || 
                        question.type === 'cognitive_long_text';
      
      if (isTextType && (backendValue === null || backendValue === undefined)) {
        setValueInternal('');
      } else {
        setValueInternal(backendValue);
      }
      return;
    }

    // Prioridad 2: formValues (datos cargados desde el backend)
    if (hasLoadedData && formValues && Object.keys(formValues).length > 0) {
      let savedValue = formValues.value || formValues.selectedValue;
      
      // 🎯 Convertir valor del backend al formato correcto según el tipo de pregunta
      savedValue = convertBackendValue(savedValue, question.type, question.config);
      
      const isTextType = question.type === 'text' || 
                        question.type === 'cognitive_short_text' || 
                        question.type === 'cognitive_long_text';
      
      if (isTextType && (savedValue === null || savedValue === undefined)) {
        setValueInternal('');
      } else {
        setValueInternal(savedValue);
      }
      return;
    }
  }, [currentStepKey, formValues, question.type, question.config, hasLoadedData, initialFormData, convertBackendValue]);

  // 🎯 SEGUNDO: Establecer valor inicial solo si no hay datos cargados
  React.useEffect(() => {
    // Solo establecer valor inicial si el usuario no ha interactuado Y no hay datos cargados
    if (hasUserInteractedRef.current) {
      return;
    }
    
    // Si ya hay datos cargados (initialFormData o formValues), no resetear
    const hasInitialData = initialFormData && Object.keys(initialFormData).length > 0;
    const hasFormValues = hasLoadedData && formValues && Object.keys(formValues).length > 0;
    const hasData = hasInitialData || hasFormValues;
    
    if (!hasData) {
      const initialValue = getInitialValue(question.type, question.config);
      hasUserInteractedRef.current = false; // Reset en nueva pregunta
      setValueInternal(initialValue);
    }
  }, [currentStepKey, question.type, question.config, getInitialValue, initialFormData, formValues, hasLoadedData]);

  return { 
    value, 
    setValue,
    getInitialValue,
    convertBackendValue 
  };
};