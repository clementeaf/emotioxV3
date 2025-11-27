import React from 'react';
import { moduleResponsesAPI } from '@/api/config';
import { useCognitiveTaskData } from '@/api/domains/cognitive-task';
import { useQuery } from '@tanstack/react-query';

/**
 * Estructura de datos procesados para CognitiveTask
 */
export interface CognitiveTaskResponses {
  /**
   * Configuración de las preguntas del CognitiveTask
   */
  researchConfig: {
    questions: Array<{
      id: string;
      type: string;
      title: string;
      description?: string;
      required: boolean;
      showConditionally: boolean;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  } | null;
  
  /**
   * Respuestas agrupadas por questionKey
   */
  groupedResponses: Record<string, Array<{
    participantId: string;
    value: unknown;
    responseTime?: string;
    timestamp: string;
    metadata?: unknown;
  }>>;
  
  /**
   * Datos procesados por pregunta para visualización
   */
  processedData: Array<{
    questionId: string;
    questionKey: string;
    totalResponses: number;
    sentimentData?: unknown;
    choiceData?: unknown;
    rankingData?: unknown;
    linearScaleData?: unknown;
    ratingData?: unknown;
    preferenceTestData?: unknown;
    imageSelectionData?: unknown;
    navigationFlowData?: unknown;
    [key: string]: unknown;
  }>;
}

/**
 * Procesa las respuestas agrupadas por questionKey para CognitiveTask
 */
const processCognitiveTaskData = (
  groupedResponses: Record<string, Array<{
    participantId: string;
    value: unknown;
    responseTime?: string;
    timestamp: string;
    metadata?: unknown;
  }>>,
  researchConfig: { questions: Array<{ id: string; [key: string]: unknown }> } | null
): CognitiveTaskResponses['processedData'] => {
  if (!groupedResponses || Object.keys(groupedResponses).length === 0) {
    return [];
  }

  const processed: CognitiveTaskResponses['processedData'] = [];

  // Procesar cada questionKey - SOLO los que son de Cognitive Tasks
  Object.entries(groupedResponses).forEach(([questionKey, responses]) => {
    if (!responses || responses.length === 0) {
      return;
    }
    
    // 🎯 Filtrar solo questionKeys de Cognitive Tasks (deben empezar con "cognitive_")
    if (!questionKey.toLowerCase().startsWith('cognitive_')) {
      return;
    }
    
    // 🎯 DEBUG: Log de datos recibidos desde la API
    console.log(`[useCognitiveTaskResponses] Procesando questionKey: ${questionKey}`, {
      questionKey,
      responsesCount: responses.length,
      sampleResponse: responses[0],
      allValues: responses.map(r => ({ participantId: r.participantId, value: r.value, valueType: typeof r.value, isArray: Array.isArray(r.value) }))
    });

    // Encontrar la pregunta correspondiente en la configuración
    // El questionKey del endpoint es: "cognitive_short_text", "cognitive_long_text", etc.
    // El question.type en la configuración es: "short_text", "long_text", etc. (sin prefijo)
    const question = researchConfig?.questions?.find((q: { id: string; type?: string; [key: string]: unknown }) => {
      const questionType = (q.type as string) || '';
      const normalizedType = questionType.replace(/^cognitive_/, ''); // Remover prefijo si existe
      const expectedQuestionKey = `cognitive_${normalizedType}`;
      
      // Comparar questionKey del endpoint con el esperado desde question.type
      if (questionKey === expectedQuestionKey) {
        return true;
      }
      
      // Comparar por questionId si el questionKey contiene el id
      if (questionKey.includes(q.id)) {
        return true;
      }
      
      // Comparar si el questionKey contiene el tipo de pregunta
      if (normalizedType && questionKey.toLowerCase().includes(normalizedType.toLowerCase())) {
        return true;
      }
      
      return false;
    });

    // Usar el questionId de la pregunta encontrada, o el questionKey como fallback
    const questionId = question?.id || questionKey;

    // Procesar respuestas según el tipo de pregunta
    const processedQuestion: {
      questionId: string;
      questionKey: string;
      totalResponses: number;
      rawResponses: Array<{
        participantId: string;
        value: unknown;
        responseTime?: string;
        timestamp: string;
        metadata?: unknown;
      }>;
      sentimentData?: unknown;
      choiceData?: unknown;
      rankingData?: unknown;
      linearScaleData?: unknown;
      ratingData?: unknown;
      preferenceTestData?: unknown;
      imageSelectionData?: unknown;
      navigationFlowData?: unknown;
    } = {
      questionId,
      questionKey,
      totalResponses: responses.length,
      rawResponses: responses,
      sentimentData: undefined,
      choiceData: undefined,
      rankingData: undefined,
      linearScaleData: undefined,
      ratingData: undefined,
      preferenceTestData: undefined,
      imageSelectionData: undefined,
      navigationFlowData: undefined
    };

    // Procesar según el tipo de pregunta
    if (questionKey.includes('short_text') || questionKey.includes('long_text')) {
      // Procesar para análisis de sentimiento
      processedQuestion.sentimentData = {
        responses: responses.map(r => ({
          text: String(r.value || ''),
          participantId: r.participantId,
          timestamp: r.timestamp
        })),
        totalResponses: responses.length
      };
    } else if (questionKey.includes('single_choice') || questionKey.includes('multiple_choice')) {
      // Procesar para visualización de opciones
      // 🎯 multiple_choice puede devolver un array de strings, single_choice devuelve un string
      const choiceCounts: Record<string, number> = {};
      
      // 🎯 Obtener todas las opciones de la configuración para incluir las no seleccionadas
      const allChoices = (Array.isArray(question?.choices) ? question.choices : []) as Array<{ id?: string; text?: string; label?: string }>;
      const choiceMap: Record<string, { id: string; text: string }> = {};
      
      // Mapear opciones por id y text para poder matchear
      allChoices.forEach((choice: { id?: string; text?: string; label?: string }) => {
        const choiceId = choice.id || '';
        const choiceText = choice.text || choice.label || '';
        const key = choiceId || choiceText;
        if (key) {
          choiceMap[key] = { id: choiceId, text: choiceText };
          // Inicializar con 0 para asegurar que todas las opciones aparezcan
          choiceCounts[key] = 0;
        }
      });
      
      responses.forEach(r => {
        // Manejar tanto arrays como strings
        if (Array.isArray(r.value)) {
          // Para multiple_choice: contar cada opción seleccionada
          r.value.forEach((choice: unknown) => {
            const choiceStr = String(choice || '');
            if (choiceStr) {
              // Intentar matchear por id o text
              const matchedKey = Object.keys(choiceMap).find(key => 
                key === choiceStr || 
                choiceMap[key].id === choiceStr || 
                choiceMap[key].text === choiceStr
              ) || choiceStr;
              
              choiceCounts[matchedKey] = (choiceCounts[matchedKey] || 0) + 1;
            }
          });
        } else {
          // Para single_choice: contar la opción única
          const value = String(r.value || '');
          if (value) {
            // Intentar matchear por id o text
            const matchedKey = Object.keys(choiceMap).find(key => 
              key === value || 
              choiceMap[key].id === value || 
              choiceMap[key].text === value
            ) || value;
            
            choiceCounts[matchedKey] = (choiceCounts[matchedKey] || 0) + 1;
          }
        }
      });
      
      // Calcular total de selecciones (puede ser mayor que responses.length para multiple_choice)
      const totalSelections = Object.values(choiceCounts).reduce((sum, count) => sum + count, 0);
      const totalResponsesForPercentage = questionKey.includes('multiple_choice') ? totalSelections : responses.length;
      
      // 🎯 Construir choices incluyendo TODAS las opciones de la configuración
      const choices = allChoices.length > 0 
        ? allChoices.map((choice: { id?: string; text?: string; label?: string }) => {
            const key = choice.id || choice.text || choice.label || '';
            const count = choiceCounts[key] || 0;
            return {
              id: choice.id || '',
              label: choice.text || choice.label || '',
              count,
              percentage: totalResponsesForPercentage > 0 ? Math.round((count / totalResponsesForPercentage) * 100) : 0
            };
          })
        : Object.entries(choiceCounts).map(([label, count]) => ({
            id: label,
            label,
            count,
            percentage: totalResponsesForPercentage > 0 ? Math.round((count / totalResponsesForPercentage) * 100) : 0
          }));
      
      processedQuestion.choiceData = {
        choices,
        totalResponses: responses.length
      };
    } else if (questionKey.includes('linear_scale')) {
      // Procesar para escala lineal
      const values = responses
        .map(r => {
          const num = typeof r.value === 'number' ? r.value : parseFloat(String(r.value || 0));
          return isNaN(num) ? 0 : num;
        })
        .filter(v => v >= 0); // 🎯 Incluir 0 también
      
      // Construir distribution (conteo por valor)
      const distribution: Record<number, number> = {};
      values.forEach((value: number) => {
        distribution[value] = (distribution[value] || 0) + 1;
      });
      
      // Construir responses desde distribution
      const responsesArray = Object.entries(distribution).map(([value, count]) => ({
        value: parseInt(value),
        count
      })).sort((a, b) => a.value - b.value);
      
      // Calcular rango de escala
      const scaleStart = values.length > 0 ? Math.min(...values) : 1;
      const scaleEnd = values.length > 0 ? Math.max(...values) : 5;
      
      processedQuestion.linearScaleData = {
        values, // Mantener para compatibilidad
        responses: responsesArray, // 🎯 Formato que espera LinearScaleResults
        distribution, // 🎯 Distribution para cálculos
        scaleRange: { start: scaleStart, end: scaleEnd },
        average: values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0,
        totalResponses: responses.length
      };
    } else if (questionKey.includes('ranking')) {
      // Procesar para ranking
      // 🎯 El ranking puede venir como array de strings (orden de preferencia) o como objeto con índices
      processedQuestion.rankingData = {
        responses: responses.map(r => {
          // Normalizar el formato del ranking
          let rankingValue = r.value;
          
          // Si es un array de strings, mantenerlo como está
          // Si es un objeto, mantenerlo como está
          // Si es un string, intentar parsearlo
          if (typeof rankingValue === 'string') {
            try {
              rankingValue = JSON.parse(rankingValue);
            } catch {
              // Si no se puede parsear, mantener como string
            }
          }
          
          return {
            participantId: r.participantId,
            ranking: rankingValue,
            timestamp: r.timestamp
          };
        }),
        totalResponses: responses.length
      };
    } else if (questionKey.includes('preference_test')) {
      // Procesar para test de preferencia
      const preferenceCounts: Record<string, number> = {};
      responses.forEach(r => {
        const value = String(r.value || '');
        preferenceCounts[value] = (preferenceCounts[value] || 0) + 1;
      });
      
      processedQuestion.preferenceTestData = {
        preferences: Object.entries(preferenceCounts).map(([option, count]) => ({
          option,
          count,
          percentage: Math.round((count / responses.length) * 100)
        })),
        totalResponses: responses.length
      };
    } else if (questionKey.includes('navigation_flow')) {
      // Procesar para flujo de navegación
      processedQuestion.navigationFlowData = {
        responses: responses.map(r => ({
          participantId: r.participantId,
          data: r.value,
          timestamp: r.timestamp
        })),
        totalResponses: responses.length
      };
    }

    processed.push(processedQuestion);
  });

  return processed;
};

/**
 * Hook para obtener y procesar respuestas de CognitiveTask
 */
export const useCognitiveTaskResponses = (researchId: string | null) => {
  // Obtener respuestas del endpoint
  // Usar el mismo query key que otros hooks para compartir cache
  const responsesQuery = useQuery({
    queryKey: ['moduleResponses', 'research', researchId],
    queryFn: async () => {
      if (!researchId) {
        throw new Error('Research ID es requerido');
      }

      const response = await moduleResponsesAPI.getResponsesByResearch(researchId);

      if (!response) {
        throw new Error('No se recibieron datos del servidor');
      }

      // La respuesta tiene estructura: { data: { questionKey: [...] } }
      return (response.data || response) as Record<string, Array<{
        participantId: string;
        value: unknown;
        responseTime?: string;
        timestamp: string;
        metadata?: unknown;
      }>>;
    },
    enabled: !!researchId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1
  });

  // Obtener configuración de CognitiveTask
  // Usar useCognitiveTaskData directamente para compartir el cache y evitar peticiones duplicadas
  const { data: configData, isLoading: isConfigLoading, error: configError } = useCognitiveTaskData(researchId);

  // Procesar datos cuando ambos queries estén listos
  // Solo procesar cuando tengamos respuestas Y configuración (para mejor mapeo)
  const processedData = React.useMemo(() => {
    if (responsesQuery.data && configData) {
      return processCognitiveTaskData(responsesQuery.data, configData as { questions: Array<{ id: string; [key: string]: unknown }> });
    } else if (responsesQuery.data) {
      return processCognitiveTaskData(responsesQuery.data, null);
    }
    return [];
  }, [responsesQuery.data, configData]);

  // 🎯 No marcar como error si configData es null (puede ser que no haya configuración aún)
  // El API devuelve null para 404, así que configError solo debería existir para errores reales
  // Pero TanStack Query puede marcar 404 como error, así que verificamos el status
  const configErrorObj = configError as { response?: { status?: number } } | null;
  const isConfig404 = configErrorObj?.response?.status === 404;
  
  // 🎯 Si hay configData (aunque sea null), no hay error real
  // Solo hay error si configError existe Y no es 404 Y configData es undefined
  const hasRealConfigError = configError !== null && 
                             configError !== undefined && 
                             !isConfig404 &&
                             configData === undefined;
  
  // 🎯 Solo mostrar error si hay un error real en las respuestas o en la configuración (no 404)
  // Si no hay configuración (404 o null), no es un error, es un estado válido
  const shouldShowError = responsesQuery.isError || hasRealConfigError;
  
  return {
    researchConfig: configData,
    groupedResponses: responsesQuery.data || {},
    processedData,
    isLoading: responsesQuery.isLoading || isConfigLoading,
    isError: shouldShowError,
    error: responsesQuery.error || (hasRealConfigError ? configError : null),
    refetch: () => {
      responsesQuery.refetch();
    }
  };
};

