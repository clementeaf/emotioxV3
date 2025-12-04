import { useCallback, useEffect, useState } from 'react';
import { useTestStore } from '../stores/useTestStore';
import { useModuleResponsesQuery } from './useApiQueries';
import { useFormDataStore } from '../stores/useFormDataStore';

interface UseFormLoadingStateProps {
  questionKey: string;
  onDataLoaded?: (data: Record<string, unknown>) => void;
}

interface UseFormLoadingStateReturn {
  isLoading: boolean;
  hasLoadedData: boolean;
  formValues: Record<string, unknown>;
  setFormValues: (values: Record<string, unknown>) => void;
  handleInputChange: (key: string, value: unknown) => void;
  saveToStore: (data: Record<string, unknown>) => void;
}

export const useFormLoadingState = ({
  questionKey,
  onDataLoaded
}: UseFormLoadingStateProps): UseFormLoadingStateReturn => {
  // 🎯 USAR SOLO BACKEND - NO STORE LOCAL
  const { researchId, participantId } = useTestStore();
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // 🎯 DETECTAR RECARGA DE PÁGINA - No cargar preferencias previas al recargar
  // Solo aplicar en la primera pregunta después de recargar
  const [hasHandledReload, setHasHandledReload] = useState(false);
  const isPageReload = useState(() => {
    // Verificar si es una recarga de página usando performance.navigation o performance.getEntriesByType
    const navigationType = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return navigationType?.type === 'reload';
  })[0];

  // Query para obtener respuestas existentes del backend
  const { data: moduleResponses, isLoading: isLoadingResponses } = useModuleResponsesQuery(
    researchId || '',
    participantId || ''
  );

  // 🎯 ESTABILIZAR LA FUNCIÓN DE CALLBACK
  const stableOnDataLoaded = useCallback((data: Record<string, unknown>) => {
    if (onDataLoaded) {
      onDataLoaded(data);
    }
  }, [onDataLoaded]);

  // 🎯 RESETEAR FORMVALUES CUANDO CAMBIA LA PREGUNTA - Evitar datos del step anterior
  useEffect(() => {
    setFormValues({});
    setHasLoadedData(false);
    setIsLoading(true);
  }, [questionKey]);

  useEffect(() => {
    // Solo procesar si ya no estamos cargando las respuestas
    if (isLoadingResponses) {
      return;
    }

    // 🎯 NO CARGAR PREFERENCIAS PREVIAS AL RECARGAR LA PÁGINA
    // Solo aplicar esta lógica en la primera pregunta después de recargar
    if (isPageReload && !hasHandledReload) {
      setHasHandledReload(true);
      setIsLoading(false);
      return;
    }

    // Buscar respuesta existente para este questionKey en el backend
    if (moduleResponses?.responses && Array.isArray(moduleResponses.responses)) {
      const existingResponse = moduleResponses.responses.find(
        (response) => response.questionKey === questionKey
      );

      if (existingResponse?.response) {
        const responseData = existingResponse.response as Record<string, unknown>;
        setFormValues(responseData);
        setHasLoadedData(true);
        setIsLoading(false);

        // Callback opcional cuando se cargan los datos
        stableOnDataLoaded(responseData);
        return;
      }
    }

    // 🎯 SOLO BACKEND - NO STORE LOCAL
    // Si no hay datos en el backend para esta pregunta, resetear formValues
    // Esto evita que se muestren datos de la pregunta anterior
    setFormValues({});
    setHasLoadedData(false);
    setIsLoading(false);
  }, [moduleResponses, isLoadingResponses, questionKey, stableOnDataLoaded, isPageReload, hasHandledReload]);

  const handleInputChange = useCallback((key: string, value: unknown) => {
    setFormValues(prevValues => {
      const newValues = {
        ...prevValues,
        [key]: value
      };
      return newValues;
    });
  }, []);

  // 🚨 USEEFFECT ELIMINADO: Causaba race condition donde datos del step anterior
  // se guardaban con la key del step actual. El guardado ahora se maneja
  // explícitamente a través de saveToStore() y handleInputChange()

  const saveToStore = useCallback((data: Record<string, unknown>) => {
    // 🎯 DEBUG: Log para linear_scale
    if (questionKey.includes('linear_scale') || questionKey.includes('cognitive')) {
      console.log('[useFormLoadingState] saveToStore llamado:', {
        questionKey,
        data,
        dataKeys: Object.keys(data)
      });
    }
    
    // 💾 Actualizar estado local inmediatamente
    setFormValues(prevValues => {
      const newLocalValues = {
        ...prevValues,
        ...data
      };
      
      // 🎯 DEBUG: Log para linear_scale
      if (questionKey.includes('linear_scale') || questionKey.includes('cognitive')) {
        console.log('[useFormLoadingState] formValues actualizado:', {
          questionKey,
          newLocalValues
        });
      }
      
      return newLocalValues;
    });
    
    // 💾 Actualizar FormDataStore global de forma síncrona
    // Ya que saveToStore se llama desde setTimeout en useQuestionHandlers,
    // no estamos en el render, así que es seguro actualizar síncronamente
    const { setFormData, getFormData } = useFormDataStore.getState();
    const currentFormData = getFormData(questionKey) || {};
    
    const newGlobalData = {
      ...currentFormData,
      ...data
    };
    
    // 🎯 DEBUG: Log para linear_scale
    if (questionKey.includes('linear_scale') || questionKey.includes('cognitive')) {
      console.log('[useFormLoadingState] FormDataStore actualizado:', {
        questionKey,
        currentFormData,
        newGlobalData
      });
    }
    
    setFormData(questionKey, newGlobalData);
    
    // 🎯 DEBUG: Verificar que se guardó correctamente
    if (questionKey.includes('linear_scale') || questionKey.includes('cognitive')) {
      const verifyData = getFormData(questionKey);
      console.log('[useFormLoadingState] Verificación después de guardar:', {
        questionKey,
        verifyData
      });
    }
  }, [questionKey]);

  return {
    isLoading: isLoading || isLoadingResponses,
    hasLoadedData,
    formValues,
    setFormValues,
    handleInputChange,
    saveToStore
  };
};
