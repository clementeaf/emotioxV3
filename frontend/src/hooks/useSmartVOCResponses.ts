import { moduleResponsesAPI } from '@/api/config';
import { useQuery } from '@tanstack/react-query';

interface SmartVOCResults {
  totalResponses: number;
  uniqueParticipants: number;
  npsScore: number;
  averageScore: number;
  promoters: number;
  detractors: number;
  neutrals: number;
  cpvValue: number;
  satisfaction: number;
  retention: number;
  impact: string;
  trend: string;
  timeSeriesData: Array<{
    date: string;
    score: number;
    nps: number;
    nev: number;
    count: number;
  }>;
  monthlyNPSData: Array<{
    month: string;
    promoters: number;
    neutrals: number;
    detractors: number;
    npsRatio: number;
  }>;
  smartVOCResponses: Array<{
    questionKey: string;
    response: unknown;
    participantId: string;
    participantName: string;
    timestamp: string;
  }>;
  vocResponses: Array<{
    text: string;
    participantId: string;
    participantName: string;
    timestamp: string;
  }>;
  npsScores: number[];
  csatScores: number[];
  cesScores: number[];
  nevScores: number[];
  cvScores: number[];
  cvScore: number;
  cvPositive: number;
  cvNegative: number;
  cvNeutral: number;
}

// Función para procesar datos SmartVOC desde la estructura agrupada por questionKey
// groupedResponses: Record<string, Array<{participantId, value, responseTime, timestamp, metadata}>>
interface GroupedResponseItem {
  questionKey: string;
  responses: Array<{
    participantId: string;
    value: unknown;
    responseTime?: string;
    timestamp: string;
    metadata?: unknown;
  }>;
}

const processSmartVOCData = (groupedResponses: Record<string, Array<{
  participantId: string;
  value: unknown;
  responseTime?: string;
  timestamp: string;
  metadata?: unknown;
}>> | GroupedResponseItem[]): SmartVOCResults => {
  // Si es un array (formato antiguo), convertir a Record
  let responsesByQuestionKey: Record<string, Array<{
    participantId: string;
    value: unknown;
    responseTime?: string;
    timestamp: string;
    metadata?: unknown;
  }>>;
  
  if (Array.isArray(groupedResponses)) {
    // Formato antiguo: Array<{questionKey, responses}>
    responsesByQuestionKey = {};
    groupedResponses.forEach((item: GroupedResponseItem) => {
      if (item.questionKey && Array.isArray(item.responses)) {
        responsesByQuestionKey[item.questionKey] = item.responses;
      }
    });
  } else {
    // Formato nuevo: Record<string, Array<...>>
    responsesByQuestionKey = groupedResponses || {};
  }

  if (!responsesByQuestionKey || Object.keys(responsesByQuestionKey).length === 0) {
    return {
      totalResponses: 0,
      uniqueParticipants: 0,
      npsScore: 0,
      averageScore: 0,
      promoters: 0,
      detractors: 0,
      neutrals: 0,
      cpvValue: 0,
      satisfaction: 0,
      retention: 0,
      impact: 'Bajo',
      trend: 'Negativa',
      timeSeriesData: [],
      monthlyNPSData: [],
      smartVOCResponses: [],
      vocResponses: [],
      npsScores: [],
      csatScores: [],
      cesScores: [],
      nevScores: [],
      cvScores: [],
      cvScore: 0,
      cvPositive: 0,
      cvNegative: 0,
      cvNeutral: 0
    };
  }

  // Extraer todas las respuestas SmartVOC
  const allSmartVOCResponses: Array<{
    questionKey: string;
    response: unknown;
    participantId: string;
    participantName: string;
    timestamp: string;
  }> = [];
  const npsScores: number[] = [];
  const csatScores: number[] = [];
  const cesScores: number[] = [];
  const nevScores: number[] = [];
  const cvScores: number[] = [];
  const vocResponses: Array<{
    text: string;
    participantId: string;
    participantName: string;
    timestamp: string;
  }> = [];

  // Función para parsear valores
  const parseResponseValue = (response: unknown): number => {
    if (typeof response === 'number') return response;
    if (response !== null && typeof response === 'object' && 'value' in response) {
      const responseObj = response as { value: unknown };
      if (typeof responseObj.value === 'number') return responseObj.value;
      if (typeof responseObj.value === 'string') {
        const parsed = parseFloat(responseObj.value);
        return isNaN(parsed) ? 0 : parsed;
      }
    }
    if (typeof response === 'string') {
      const parsed = parseFloat(response);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const parseResponseText = (response: unknown): string => {
    if (typeof response === 'string') return response;
    if (response !== null && typeof response === 'object' && 'value' in response) {
      const responseObj = response as { value: unknown };
      return String(responseObj.value);
    }
    if (response !== null && typeof response === 'object') {
      return JSON.stringify(response);
    }
    return String(response);
  };

  // Procesar cada pregunta agrupada por questionKey
  Object.entries(responsesByQuestionKey).forEach(([questionKey, responses]) => {
    if (!questionKey.toLowerCase().includes('smartvoc')) return;

    console.log(`[processSmartVOCData] Procesando ${questionKey} con ${responses.length} respuestas`);

    // Procesar cada respuesta de esta pregunta
    responses.forEach((response) => {
      console.log(`[processSmartVOCData] ${questionKey} - response completo:`, response);
      console.log(`[processSmartVOCData] ${questionKey} - response.value:`, response.value, 'tipo:', typeof response.value);

      const smartVOCResponse = {
        questionKey,
        response: response.value,
        participantId: response.participantId,
        participantName: 'Participante',
        timestamp: response.timestamp || new Date().toISOString()
      };

      allSmartVOCResponses.push(smartVOCResponse);

      const responseValue = parseResponseValue(response.value);
      console.log(`[processSmartVOCData] ${questionKey} - responseValue parseado:`, responseValue);

      // Categorizar por tipo de pregunta
      if (questionKey.toLowerCase().includes('nps')) {
        if (responseValue >= 0 && !isNaN(responseValue)) {
          npsScores.push(responseValue);
          console.log(`[processSmartVOCData] ✅ NPS agregado: ${responseValue}, total: ${npsScores.length}`);
        } else {
          console.log(`[processSmartVOCData] ❌ NPS rechazado: ${responseValue}`);
        }
      } else if (questionKey.toLowerCase().includes('csat')) {
        if (responseValue >= 0 && !isNaN(responseValue)) {
          csatScores.push(responseValue);
          console.log(`[processSmartVOCData] ✅ CSAT agregado: ${responseValue}, total: ${csatScores.length}`);
        } else {
          console.log(`[processSmartVOCData] ❌ CSAT rechazado: ${responseValue}`);
        }
      } else if (questionKey.toLowerCase().includes('ces')) {
        if (responseValue >= 0 && !isNaN(responseValue)) {
          cesScores.push(responseValue);
          console.log(`[processSmartVOCData] ✅ CES agregado: ${responseValue}, total: ${cesScores.length}`);
        } else {
          console.log(`[processSmartVOCData] ❌ CES rechazado: ${responseValue}`);
        }
      } else if (questionKey.toLowerCase().includes('nev')) {
        // NEV ahora devuelve string de emociones, no array
        if (response.value) {
          let emotions: string[] = [];
          
          if (typeof response.value === 'string') {
            emotions = response.value.split(',').map((e: string) => e.trim());
          } else if (Array.isArray(response.value)) {
            emotions = response.value;
          }
          
          const positiveEmotions = ['Feliz', 'Satisfecho', 'Confiado', 'Valorado', 'Cuidado', 'Seguro', 'Enfocado', 'Indulgente', 'Estimulado', 'Exploratorio', 'Interesado', 'Enérgico'];
          const negativeEmotions = ['Descontento', 'Frustrado', 'Irritado', 'Decepción', 'Estresado', 'Infeliz', 'Desatendido', 'Apresurado'];
          
          const positiveCount = emotions.filter((emotion: string) => positiveEmotions.includes(emotion)).length;
          const negativeCount = emotions.filter((emotion: string) => negativeEmotions.includes(emotion)).length;

          // Calcular score NEV: (positivas - negativas) / total * 100
          const totalEmotions = emotions.length;
          if (totalEmotions > 0) {
            const nevScore = Math.round(((positiveCount - negativeCount) / totalEmotions) * 100);
            nevScores.push(nevScore);
          }
        }
      } else if (questionKey.toLowerCase().includes('cv')) {
        if (responseValue >= 0 && !isNaN(responseValue)) {
          cvScores.push(responseValue);
        }
      } else if (questionKey.toLowerCase().includes('voc')) {
        vocResponses.push({
          text: parseResponseText(response.value),
          participantId: response.participantId,
          participantName: 'Participante',
          timestamp: response.timestamp
        });
      }
    });
  });

  // Calcular métricas
  const totalResponses = allSmartVOCResponses.length;
  const uniqueParticipants = new Set(allSmartVOCResponses.map(r => r.participantId)).size;

  // Calcular NPS - Manejar escalas 0-6 y 0-10 dinámicamente
  const maxNpsScore = npsScores.length > 0 ? Math.max(...npsScores) : 10;
  const isScale0to6 = maxNpsScore <= 6;

  let promoters, detractors, neutrals;

  if (isScale0to6) {
    // Escala 0-6: 0-2 detractores, 3 neutral, 4-6 promotores
    promoters = npsScores.filter(score => score >= 4).length;
    detractors = npsScores.filter(score => score <= 2).length;
    neutrals = npsScores.filter(score => score === 3).length;
  } else {
    // Escala 0-10: 0-6 detractores, 7-8 neutral, 9-10 promotores
    promoters = npsScores.filter(score => score >= 9).length;
    detractors = npsScores.filter(score => score <= 6).length;
    neutrals = npsScores.filter(score => score >= 7 && score <= 8).length;
  }
  const npsScore = npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : 0;

  // Calcular CV - Manejar escalas 1-5, 1-7 y 1-10 dinámicamente
  const maxCvScore = cvScores.length > 0 ? Math.max(...cvScores) : 5;
  let cvPositive, cvNegative, cvNeutral;

  if (maxCvScore <= 5) {
    // Escala 1-5: 1-2 negativo, 3 neutral, 4-5 positivo
    cvPositive = cvScores.filter(score => score >= 4).length;
    cvNegative = cvScores.filter(score => score <= 2).length;
    cvNeutral = cvScores.filter(score => score === 3).length;
  } else if (maxCvScore <= 7) {
    // Escala 1-7: 1-3 negativo, 4 neutral, 5-7 positivo
    cvPositive = cvScores.filter(score => score >= 5).length;
    cvNegative = cvScores.filter(score => score <= 3).length;
    cvNeutral = cvScores.filter(score => score === 4).length;
  } else {
    // Escala 1-10: 1-4 negativo, 5-6 neutral, 7-10 positivo
    cvPositive = cvScores.filter(score => score >= 7).length;
    cvNegative = cvScores.filter(score => score <= 4).length;
    cvNeutral = cvScores.filter(score => score >= 5 && score <= 6).length;
  }
  const cvScore = cvScores.length > 0 ? Math.round(((cvPositive - cvNegative) / cvScores.length) * 100) : 0;

  // Calcular promedio de scores
  const allScores = [...csatScores, ...cesScores, ...nevScores, ...cvScores].filter(score => score > 0);
  const averageScore = allScores.length > 0 ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10 : 0;

  // Generar time series data - incluir todas las fechas que tengan CUALQUIER respuesta SmartVOC
  const responsesByDate: { [key: string]: Array<{
    questionKey: string;
    response: unknown;
    participantId: string;
    participantName: string;
    timestamp: string;
  }> } = {};
  allSmartVOCResponses.forEach(response => {
    // Usar zona horaria local para agrupar fechas correctamente
    const date = new Date(response.timestamp || new Date());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    if (!responsesByDate[dateKey]) {
      responsesByDate[dateKey] = [];
    }
    responsesByDate[dateKey].push(response);
  });

  const timeSeriesData = Object.keys(responsesByDate).map(date => {
    const dateResponses = responsesByDate[date];
    const dateNpsScores = dateResponses
      .filter(r => r.questionKey.toLowerCase().includes('nps'))
      .map(r => parseResponseValue(r.response))
      .filter(score => score > 0);

    const dateNevScores = dateResponses
      .filter(r => r.questionKey.toLowerCase().includes('nev'))
      .map(r => {
        // 🎯 Procesar NEV como string de emociones
        if (r.response) {
          let emotions: string[] = [];
          
          if (typeof r.response === 'string') {
            emotions = r.response.split(',').map((e: string) => e.trim());
          } else if (Array.isArray(r.response)) {
            emotions = r.response;
          }
          
          const positiveEmotions = ['Feliz', 'Satisfecho', 'Confiado', 'Valorado', 'Cuidado', 'Seguro', 'Enfocado', 'Indulgente', 'Estimulado', 'Exploratorio', 'Interesado', 'Enérgico'];
          const negativeEmotions = ['Descontento', 'Frustrado', 'Irritado', 'Decepción', 'Estresado', 'Infeliz', 'Desatendido', 'Apresurado'];

          const positiveCount = emotions.filter((emotion: string) => positiveEmotions.includes(emotion)).length;
          const negativeCount = emotions.filter((emotion: string) => negativeEmotions.includes(emotion)).length;

          const totalEmotions = emotions.length;
          if (totalEmotions > 0) {
            return Math.round(((positiveCount - negativeCount) / totalEmotions) * 100);
          }
        }
        return 0;
      })
      .filter(score => score !== 0);

    // Calcular promedios - si no hay datos de NPS/NEV para esta fecha, usar 0
    const avgNps = dateNpsScores.length > 0 ? dateNpsScores.reduce((a, b) => a + b, 0) / dateNpsScores.length : 0;
    const avgNev = dateNevScores.length > 0 ? dateNevScores.reduce((a, b) => a + b, 0) / dateNevScores.length : 0;

    return {
      date,
      score: averageScore,
      nps: avgNps,
      nev: avgNev,
      count: dateResponses.length
    };
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  console.log('[useSmartVOCResponses] timeSeriesData generado:', timeSeriesData);

  // Generar datos para CPVCard
  const cpvValue = csatScores.length > 0 ? Math.round((csatScores.reduce((a, b) => a + b, 0) / csatScores.length) * 10) / 10 : 0;

  // Generar datos para NPSQuestion
  const monthlyNPSData = timeSeriesData.map(item => ({
    month: new Date(item.date + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short' }),
    promoters: totalResponses > 0 ? Math.round((promoters / totalResponses) * item.count) : 0,
    neutrals: totalResponses > 0 ? Math.round((neutrals / totalResponses) * item.count) : 0,
    detractors: totalResponses > 0 ? Math.round((detractors / totalResponses) * item.count) : 0,
    npsRatio: npsScore,
    date: item.date // Incluir fecha original para filtrado
  }));

  return {
    totalResponses,
    uniqueParticipants,
    npsScore,
    averageScore,
    promoters,
    detractors,
    neutrals,
    cpvValue,
    satisfaction: csatScores.length > 0 ? Math.round((csatScores.reduce((a, b) => a + b, 0) / csatScores.length) * 10) / 10 : 0,
    retention: totalResponses > 0 ? Math.round(((promoters + neutrals) / totalResponses) * 100) : 0,
    impact: totalResponses > 0 && promoters > detractors ? 'Alto' : totalResponses > 0 ? 'Medio' : 'Bajo',
    trend: totalResponses > 0 && promoters > detractors ? 'Positiva' : totalResponses > 0 ? 'Neutral' : 'Negativa',
    timeSeriesData,
    monthlyNPSData,
    smartVOCResponses: allSmartVOCResponses,
    vocResponses,
    npsScores,
    csatScores,
    cesScores,
    nevScores,
    cvScores,
    cvScore,
    cvPositive,
    cvNegative,
    cvNeutral
  };
};

export const useSmartVOCResponses = (researchId: string) => {
  // Usar query key específico para SmartVOC para evitar conflictos con otros hooks
  const query = useQuery<SmartVOCResults>({
    queryKey: ['smartVOCResponses', 'research', researchId],
    queryFn: async () => {
      if (!researchId) {
        throw new Error('Research ID es requerido');
      }

      // Usar el mismo endpoint que CognitiveTask: /module-responses/research/{researchId}
      const response = await moduleResponsesAPI.getResponsesByResearch(researchId);

      if (!response) {
        throw new Error('No se recibieron datos del servidor');
      }

      // La respuesta tiene estructura: { data: { questionKey: [...] } }
      const groupedResponses = (response.data || response) as Record<string, Array<{
        participantId: string;
        value: unknown;
        responseTime?: string;
        timestamp: string;
        metadata?: unknown;
      }>>;

      console.log('[useSmartVOCResponses] groupedResponses:', groupedResponses);
      console.log('[useSmartVOCResponses] keys:', Object.keys(groupedResponses || {}));
      console.log('[useSmartVOCResponses] smartvoc keys:', Object.keys(groupedResponses || {}).filter(k => k.toLowerCase().includes('smartvoc')));

      // Procesar datos SmartVOC desde las respuestas agrupadas por questionKey
      const result = processSmartVOCData(groupedResponses);
      console.log('[useSmartVOCResponses] Resultado final:', {
        csatScores: result.csatScores,
        cesScores: result.cesScores,
        cvScores: result.cvScores,
        npsScores: result.npsScores,
        totalResponses: result.totalResponses
      });
      return result;
    },
    enabled: !!researchId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1
  });

  return {
    data: query.data || null,
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch
  };
};