import { smartVocApi } from '@/api/domains/smart-voc';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
// ❌ ELIMINADO: cognitiveTaskService - usar domain hooks directamente
// import cognitiveTaskAPI from '../services/cognitiveTaskService';
import { moduleResponseService } from '../services/moduleResponseService';
import { useResearchById } from '@/api/domains/research';

// Singleton global para evitar múltiples llamadas simultáneas
class GlobalAPISingleton {
  private static instance: GlobalAPISingleton;
  private promises: Map<string, Promise<any>> = new Map();
  private isInitialized: Map<string, boolean> = new Map();
  private callCount: Map<string, number> = new Map();
  private listeners: Map<string, Set<() => void>> = new Map();
  private componentCount: Map<string, number> = new Map();

  private constructor() { }

  static getInstance(): GlobalAPISingleton {
    if (!GlobalAPISingleton.instance) {
      GlobalAPISingleton.instance = new GlobalAPISingleton();
    }
    return GlobalAPISingleton.instance;
  }

  // Registrar componente que usa el hook
  registerComponent(researchId: string) {
    const key = `component-${researchId}`;
    this.componentCount.set(key, (this.componentCount.get(key) || 0) + 1);
  }

  // Desregistrar componente
  unregisterComponent(researchId: string) {
    const key = `component-${researchId}`;
    const currentCount = this.componentCount.get(key) || 0;
    this.componentCount.set(key, Math.max(0, currentCount - 1));
  }

  async getSmartVOCForm(researchId: string): Promise<any> {
    const key = `smartVOCForm-${researchId}`;

    // Incrementar contador de llamadas
    this.callCount.set(key, (this.callCount.get(key) || 0) + 1);
    const currentCall = this.callCount.get(key) || 0;


    if (this.promises.has(key)) {
      return await this.promises.get(key);
    }

    const promise = smartVocApi.getByResearchId(researchId);
    this.promises.set(key, promise);
    this.isInitialized.set(key, true);

    try {
      const result = await promise;
      // Notificar a todos los listeners
      this.notifyListeners(key, result);
      return result;
    } catch (error) {
      throw error;
    } finally {
      // Limpiar después de 5 minutos para mejor performance
      setTimeout(() => {
        this.promises.delete(key);
        this.isInitialized.delete(key);
        this.callCount.delete(key);
        this.listeners.delete(key);
      }, 5 * 60 * 1000); // 5 minutos
    }
  }

  async getGroupedResponses(researchId: string): Promise<any> {
    const key = `groupedResponses-${researchId}`;

    // Incrementar contador de llamadas
    this.callCount.set(key, (this.callCount.get(key) || 0) + 1);
    const currentCall = this.callCount.get(key) || 0;


    if (this.promises.has(key)) {
      return await this.promises.get(key);
    }

    const promise = moduleResponseService.getResponsesGroupedByQuestion(researchId);
    this.promises.set(key, promise);
    this.isInitialized.set(key, true);

    try {
      const result = await promise;
      // Notificar a todos los listeners
      this.notifyListeners(key, result);
      return result;
    } catch (error) {
      throw error;
    } finally {
      // Limpiar después de 5 minutos para mejor performance
      setTimeout(() => {
        this.promises.delete(key);
        this.isInitialized.delete(key);
        this.callCount.delete(key);
        this.listeners.delete(key);
      }, 5 * 60 * 1000); // 5 minutos
    }
  }

  // Sistema de listeners para notificar cuando los datos cambian
  addListener(key: string, callback: () => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
  }

  removeListener(key: string, callback: () => void) {
    if (this.listeners.has(key)) {
      this.listeners.get(key)!.delete(callback);
    }
  }

  private notifyListeners(key: string, data: any) {
    if (this.listeners.has(key)) {
      this.listeners.get(key)!.forEach(callback => callback());
    }
  }
}

// Instancia global
const globalAPISingleton = GlobalAPISingleton.getInstance();

// Estados globales compartidos
const globalStates = {
  smartVOCFormData: new Map<string, any>(),
  groupedResponsesData: new Map<string, any>(),
  cognitiveTaskConfig: new Map<string, any>(),
  smartVOCFormLoading: new Map<string, boolean>(),
  groupedResponsesLoading: new Map<string, boolean>(),
  cognitiveTaskConfigLoading: new Map<string, boolean>(),
  smartVOCFormError: new Map<string, Error | null>(),
  groupedResponsesError: new Map<string, Error | null>(),
  cognitiveTaskConfigError: new Map<string, Error | null>(),
};

interface QuestionResponse {
  participantId: string;
  value: any;
  timestamp: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

interface QuestionWithResponses {
  questionKey: string;
  responses: QuestionResponse[];
}

interface GroupedResponsesResponse {
  data: QuestionWithResponses[];
  status: number;
}

interface CPVData {
  cpvValue: number;
  satisfaction: number;
  retention: number;
  impact: string;
  trend: string;
  csatPercentage: number;
  cesPercentage: number;
  cvValue: number;
  nevValue: number;
  npsValue: number;
  peakValue: number;
  promoters: number;
  neutrals: number;
  detractors: number;
}

interface TrustFlowData {
  stage: string;
  nps: number;
  nev: number;
  timestamp: string;
}

interface SmartVOCResults {
  totalResponses: number;
  uniqueParticipants: number;
  npsScore: number;
  csatScores: number[];
  cesScores: number[];
  nevScores: number[];
  cvScores: number[];
  vocResponses: any[];
  smartVOCResponses: any[];
}

interface CognitiveTaskConfig {
  id: string;
  researchId: string;
  questions: Array<{
    id: string;
    questionKey: string;
    title: string;
    description?: string;
    type: string;
    required: boolean;
    choices?: Array<{
      id: string;
      text: string;
      isQualify: boolean;
      isDisqualify: boolean;
    }>;
    answerPlaceholder?: string;
    deviceFrame?: boolean;
    files?: any[];
    showConditionally?: boolean;
  }>;
  randomizeQuestions: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CombinedQuestionData {
  questionKey: string;
  title: string;
  description?: string;
  type: string;
  required: boolean;
  options?: Array<{
    id: string;
    text: string;
    responses: number;
    percentage: number;
  }>;
  totalResponses: number;
  responses: any[];
}

/**
 * Hook global único para obtener todos los datos de research
 * Evita llamadas duplicadas usando singleton global y estados compartidos
 */
export const useGlobalResearchData = (researchId: string) => {
  // Query para datos básicos del research (usa nueva arquitectura)
  const researchQuery = useResearchById(researchId);

  // Estados locales que se sincronizan con los globales
  const [smartVOCFormData, setSmartVOCFormData] = useState<any>(globalStates.smartVOCFormData.get(researchId) || null);
  const [isSmartVOCFormLoading, setIsSmartVOCFormLoading] = useState<boolean>(globalStates.smartVOCFormLoading.get(researchId) || false);
  const [smartVOCFormError, setSmartVOCFormError] = useState<Error | null>(globalStates.smartVOCFormError.get(researchId) || null);

  const [groupedResponsesData, setGroupedResponsesData] = useState<any>(globalStates.groupedResponsesData.get(researchId) || null);
  const [isGroupedResponsesLoading, setIsGroupedResponsesLoading] = useState<boolean>(globalStates.groupedResponsesLoading.get(researchId) || false);
  const [groupedResponsesError, setGroupedResponsesError] = useState<Error | null>(globalStates.groupedResponsesError.get(researchId) || null);

  const [cognitiveTaskConfig, setCognitiveTaskConfig] = useState<CognitiveTaskConfig | null>(globalStates.cognitiveTaskConfig.get(researchId) || null);
  const [isCognitiveTaskConfigLoading, setIsCognitiveTaskConfigLoading] = useState<boolean>(globalStates.cognitiveTaskConfigLoading.get(researchId) || false);
  const [cognitiveTaskConfigError, setCognitiveTaskConfigError] = useState<Error | null>(globalStates.cognitiveTaskConfigError.get(researchId) || null);

  // Registrar componente al montar
  useEffect(() => {
    if (researchId) {
      globalAPISingleton.registerComponent(researchId);
    }

    return () => {
      if (researchId) {
        globalAPISingleton.unregisterComponent(researchId);
      }
    };
  }, [researchId]);

  // NO cargar automáticamente Cognitive Task para investigaciones nuevas
  // useEffect(() => {
  //   // Se cargará solo cuando sea específicamente requerido
  // }, []);

  // NO cargar automáticamente SmartVOC para investigaciones nuevas
  // useEffect(() => {
  //   // Se cargará solo cuando sea específicamente requerido
  // }, []);

  // NO cargar automáticamente grouped responses para investigaciones nuevas
  // useEffect(() => {
  //   // Se cargará solo cuando sea específicamente requerido
  // }, []);

  // Derivar SmartVOC data desde groupedResponses
  const smartVOCData = useQuery<SmartVOCResults>({
    queryKey: ['smartVOCData', researchId],
    queryFn: () => {
      if (!groupedResponsesData || !groupedResponsesData.data || !Array.isArray(groupedResponsesData.data)) {
        throw new Error('No grouped data available or invalid format');
      }
      return processSmartVOCData(groupedResponsesData.data);
    },
    enabled: !!groupedResponsesData && !!groupedResponsesData.data && Array.isArray(groupedResponsesData.data),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000,    // 15 minutos
  });

  // Derivar CPV data desde groupedResponses
  const cpvData = useQuery<CPVData>({
    queryKey: ['cpvData', researchId],
    queryFn: () => {
      if (!groupedResponsesData || !groupedResponsesData.data || !Array.isArray(groupedResponsesData.data)) {
        throw new Error('No grouped data available or invalid format');
      }
      return processCPVData(groupedResponsesData.data);
    },
    enabled: !!groupedResponsesData && !!groupedResponsesData.data && Array.isArray(groupedResponsesData.data),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000,    // 15 minutos
  });

  // Derivar TrustFlow data desde groupedResponses
  const trustFlowData = useQuery<TrustFlowData[]>({
    queryKey: ['trustFlowData', researchId],
    queryFn: () => {
      if (!groupedResponsesData || !groupedResponsesData.data || !Array.isArray(groupedResponsesData.data)) {
        throw new Error('No grouped data available or invalid format');
      }
      return processTrustFlowData(groupedResponsesData.data);
    },
    enabled: !!groupedResponsesData && !!groupedResponsesData.data && Array.isArray(groupedResponsesData.data),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000,    // 15 minutos
  });

  // Función para combinar configuración con respuestas
  const combinedCognitiveTaskData = useQuery<CombinedQuestionData[]>({
    queryKey: ['combinedCognitiveTaskData', researchId],
    queryFn: () => {
      if (!cognitiveTaskConfig || !groupedResponsesData || !groupedResponsesData.data) {
        throw new Error('No configuration or responses data available');
      }
      return combineCognitiveTaskData(cognitiveTaskConfig, groupedResponsesData.data);
    },
    enabled: !!cognitiveTaskConfig && !!groupedResponsesData && !!groupedResponsesData.data,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 15 * 60 * 1000,    // 15 minutos
  });

  return {
    // Datos básicos del research (reutiliza useResearchById)
    researchData: researchQuery.data,
    isResearchLoading: researchQuery.isLoading,
    researchError: researchQuery.error,

    // Datos de SmartVOC form (SIN React Query)
    smartVOCFormData,
    isSmartVOCFormLoading,
    smartVOCFormError,

    // Datos principales (SIN React Query)
    groupedResponses: groupedResponsesData?.data || [],
    isLoading: isGroupedResponsesLoading,
    error: groupedResponsesError,

    // Configuración de Cognitive Task
    cognitiveTaskConfig,
    isCognitiveTaskConfigLoading,
    cognitiveTaskConfigError,

    // Datos combinados de Cognitive Task
    combinedCognitiveTaskData: combinedCognitiveTaskData.data || [],
    isCombinedCognitiveTaskLoading: combinedCognitiveTaskData.isLoading,
    combinedCognitiveTaskError: combinedCognitiveTaskData.error,

    // Datos derivados
    smartVOCData: smartVOCData.data,
    cpvData: cpvData.data,
    trustFlowData: trustFlowData.data || [],

    // Estados de carga
    isSmartVOCLoading: smartVOCData.isLoading,
    isCPVLoading: cpvData.isLoading,
    isTrustFlowLoading: trustFlowData.isLoading,

    // Errores
    smartVOCError: smartVOCData.error,
    cpvError: cpvData.error,
    trustFlowError: trustFlowData.error,

    // Refetch functions
    refetch: () => {
      // Limpiar datos globales y recargar
      globalStates.groupedResponsesData.delete(researchId);
      globalStates.groupedResponsesError.delete(researchId);
      setGroupedResponsesData(null);
      setGroupedResponsesError(null);

      if (researchId) {
        globalAPISingleton.getGroupedResponses(researchId).then(data => {
          globalStates.groupedResponsesData.set(researchId, data);
          setGroupedResponsesData(data);
        });
      }
    },
    refetchResearch: researchQuery.refetch,
    refetchSmartVOCForm: () => {
      // Limpiar datos globales y recargar
      globalStates.smartVOCFormData.delete(researchId);
      globalStates.smartVOCFormError.delete(researchId);
      setSmartVOCFormData(null);
      setSmartVOCFormError(null);

      if (researchId) {
        globalAPISingleton.getSmartVOCForm(researchId).then(data => {
          globalStates.smartVOCFormData.set(researchId, data);
          setSmartVOCFormData(data);
        });
      }
    },
    refetchCognitiveTaskConfig: () => {
      // Limpiar datos globales y recargar
      globalStates.cognitiveTaskConfig.delete(researchId);
      globalStates.cognitiveTaskConfigError.delete(researchId);
      setCognitiveTaskConfig(null);
      setCognitiveTaskConfigError(null);

      if (researchId) {
        // ❌ ELIMINADO: cognitiveTaskAPI - usar domain hooks directamente
        // cognitiveTaskAPI.getByResearchId(researchId).then(data => {
        Promise.resolve(null).then(data => {
          globalStates.cognitiveTaskConfig.set(researchId, data as any);
          setCognitiveTaskConfig(data as any);
        });
      }
    },
  };
};

// Función para procesar datos SmartVOC desde grouped responses
function processSmartVOCData(groupedResponses: QuestionWithResponses[]): SmartVOCResults {
  const allSmartVOCResponses: any[] = [];
  const npsScores: number[] = [];
  const csatScores: number[] = [];
  const cesScores: number[] = [];
  const nevScores: number[] = [];
  const cvScores: number[] = [];
  const vocResponses: any[] = [];

  groupedResponses.forEach(questionGroup => {
    if (questionGroup.questionKey && questionGroup.questionKey.toLowerCase().includes('smartvoc') && questionGroup.responses && Array.isArray(questionGroup.responses)) {
      questionGroup.responses.forEach((response: any) => {
        const smartVOCResponse = {
          questionKey: questionGroup.questionKey,
          response: response.value,
          participantId: response.participantId,
          participantName: 'Participante',
          timestamp: response.timestamp || new Date().toISOString()
        };

        allSmartVOCResponses.push(smartVOCResponse);

        const responseValue = parseResponseValue(response.value);

        if (questionGroup.questionKey.toLowerCase().includes('nps')) {
          if (responseValue > 0) npsScores.push(responseValue);
        } else if (questionGroup.questionKey.toLowerCase().includes('csat')) {
          if (responseValue > 0) csatScores.push(responseValue);
        } else if (questionGroup.questionKey.toLowerCase().includes('ces')) {
          if (responseValue > 0) cesScores.push(responseValue);
        } else if (questionGroup.questionKey.toLowerCase().includes('nev')) {
          if (response.value && Array.isArray(response.value)) {
            const emotions = response.value;
            const positiveEmotions = ['Feliz', 'Satisfecho', 'Confiado', 'Valorado', 'Cuidado', 'Seguro', 'Enfocado', 'Indulgente', 'Estimulado', 'Exploratorio', 'Interesado', 'Enérgico'];
            const negativeEmotions = ['Descontento', 'Frustrado', 'Irritado', 'Decepción', 'Estresado', 'Infeliz', 'Desatendido', 'Apresurado'];

            const positiveCount = emotions.filter((emotion: string) => positiveEmotions.includes(emotion)).length;
            const negativeCount = emotions.filter((emotion: string) => negativeEmotions.includes(emotion)).length;

            const totalEmotions = emotions.length;
            if (totalEmotions > 0) {
              const nevScore = Math.round(((positiveCount - negativeCount) / totalEmotions) * 100);
              nevScores.push(nevScore);
            }
          }
        } else if (questionGroup.questionKey.toLowerCase().includes('cv')) {
          if (responseValue > 0) cvScores.push(responseValue);
        } else if (questionGroup.questionKey.toLowerCase().includes('voc')) {
          vocResponses.push({
            text: parseResponseText(response.value),
            participantId: response.participantId,
            participantName: 'Participante',
            timestamp: response.timestamp
          });
        }
      });
    }
  });

  const totalResponses = allSmartVOCResponses.length;
  const uniqueParticipants = new Set(allSmartVOCResponses.map(r => r.participantId)).size;

  const npsScore = npsScores.length > 0
    ? Math.round(((npsScores.filter(score => score >= 9).length - npsScores.filter(score => score <= 6).length) / npsScores.length) * 100)
    : 0;

  return {
    totalResponses,
    uniqueParticipants,
    npsScore,
    csatScores,
    cesScores,
    nevScores,
    cvScores,
    vocResponses,
    smartVOCResponses: allSmartVOCResponses
  };
}

// Función para procesar datos CPV desde grouped responses
function processCPVData(groupedResponses: QuestionWithResponses[]): CPVData {
  const csatScores: number[] = [];
  const cesScores: number[] = [];
  const npsScores: number[] = [];
  const nevScores: number[] = [];
  const cvScores: number[] = [];

  groupedResponses.forEach(questionGroup => {
    if (questionGroup.questionKey && questionGroup.questionKey.toLowerCase().includes('smartvoc') && questionGroup.responses && Array.isArray(questionGroup.responses)) {
      questionGroup.responses.forEach((response: any) => {
        const responseValue = parseResponseValue(response.value);
        if (!isNaN(responseValue) && responseValue > 0) {
          if (questionGroup.questionKey.toLowerCase().includes('csat')) {
            csatScores.push(responseValue);
          } else if (questionGroup.questionKey.toLowerCase().includes('ces')) {
            cesScores.push(responseValue);
          } else if (questionGroup.questionKey.toLowerCase().includes('nps')) {
            npsScores.push(responseValue);
          } else if (questionGroup.questionKey.toLowerCase().includes('cv')) {
            cvScores.push(responseValue);
          }
        }
      });
    }
  });

  const totalResponses = groupedResponses.reduce((acc, q) => acc + (q.responses?.length || 0), 0);
  const cpvValue = csatScores.length > 0 ? Math.round((csatScores.reduce((a, b) => a + b, 0) / csatScores.length) * 10) / 10 : 0;
  const satisfaction = csatScores.length > 0 ? Math.round((csatScores.reduce((a, b) => a + b, 0) / csatScores.length) * 10) / 10 : 0;

  const csatPercentage = csatScores.length > 0 ? Math.round((csatScores.filter(score => score >= 4).length / csatScores.length) * 100) : 0;
  const cesPercentage = cesScores.length > 0 ? Math.round((cesScores.filter(score => score <= 2).length / cesScores.length) * 100) : 0;

  const promoters = npsScores.filter(score => score >= 9).length;
  const neutrals = npsScores.filter(score => score >= 7 && score <= 8).length;
  const detractors = npsScores.filter(score => score <= 6).length;
  const retention = totalResponses > 0 ? Math.round(((promoters + neutrals) / totalResponses) * 100) : 0;

  const impact = totalResponses > 0 && promoters > (npsScores.length - promoters - neutrals) ? 'Alto' : totalResponses > 0 ? 'Medio' : 'Bajo';
  const trend = totalResponses > 0 && promoters > (npsScores.length - promoters - neutrals) ? 'Positiva' : totalResponses > 0 ? 'Neutral' : 'Negativa';

  const peakValue = Math.max(cpvValue, satisfaction, retention);

  return {
    cpvValue,
    satisfaction,
    retention,
    impact,
    trend,
    csatPercentage,
    cesPercentage,
    cvValue: cvScores.length > 0 ? Math.round((cvScores.reduce((a, b) => a + b, 0) / cvScores.length) * 10) / 10 : 0,
    nevValue: nevScores.length > 0 ? Math.round((nevScores.reduce((a, b) => a + b, 0) / nevScores.length) * 10) / 10 : 0,
    npsValue: npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : 0,
    peakValue,
    promoters,
    neutrals,
    detractors
  };
}

// Función para procesar datos TrustFlow desde grouped responses
function processTrustFlowData(groupedResponses: QuestionWithResponses[]): TrustFlowData[] {
  const responsesByDate: { [key: string]: any[] } = {};

  groupedResponses.forEach(questionGroup => {
    if (questionGroup.responses && Array.isArray(questionGroup.responses)) {
      questionGroup.responses.forEach((response: any) => {
        if (response.timestamp) {
          // Usar zona horaria local para agrupar fechas correctamente
          const date = new Date(response.timestamp);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const dateKey = `${year}-${month}-${day}`;
          if (!responsesByDate[dateKey]) {
            responsesByDate[dateKey] = [];
          }
          responsesByDate[dateKey].push({ ...response, questionKey: questionGroup.questionKey });
        }
      });
    }
  });

  return Object.keys(responsesByDate).map(date => {
    const dateResponses = responsesByDate[date];

    const npsScores = dateResponses
      .filter(r => r.questionKey && r.questionKey.toLowerCase().includes('nps'))
      .map(r => parseResponseValue(r.value))
      .filter(score => !isNaN(score) && score > 0);

    const nevScores = dateResponses
      .filter(r => r.questionKey && r.questionKey.toLowerCase().includes('nev'))
      .map(r => {
        if (r.value && Array.isArray(r.value)) {
          const emotions = r.value;
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

    const avgNps = npsScores.length > 0 ? npsScores.reduce((a, b) => a + b, 0) / npsScores.length : 0;
    const avgNev = nevScores.length > 0 ? nevScores.reduce((a, b) => a + b, 0) / nevScores.length : 0;

    // date viene como 'YYYY-MM-DD', agregamos hora del mediodía para evitar problemas de zona horaria
    const dateObj = new Date(date + 'T12:00:00');
    return {
      stage: dateObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      nps: Math.round(avgNps * 10) / 10,
      nev: Math.round(avgNev * 10) / 10,
      timestamp: date
    };
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// Función para combinar configuración con respuestas
function combineCognitiveTaskData(config: CognitiveTaskConfig, groupedResponses: QuestionWithResponses[]): CombinedQuestionData[] {
  return config.questions.map(question => {
    // Encontrar respuestas para esta pregunta
    const questionResponses = groupedResponses.find(q => q.questionKey === question.questionKey);
    const responses = questionResponses?.responses || [];

    // Procesar opciones si existen
    let processedOptions = undefined;
    if (question.choices && question.choices.length > 0) {
      processedOptions = question.choices.map(choice => {
        const choiceResponses = responses.filter(r => {
          const responseValue = parseResponseValue(r.value);
          return responseValue.toString() === choice.id;
        });

        const responseCount = choiceResponses.length;
        const percentage = responses.length > 0 ? Math.round((responseCount / responses.length) * 100) : 0;

        return {
          id: choice.id,
          text: choice.text,
          responses: responseCount,
          percentage
        };
      });
    }

    return {
      questionKey: question.questionKey,
      title: question.title,
      description: question.description,
      type: question.type,
      required: question.required,
      options: processedOptions,
      totalResponses: responses.length,
      responses: responses
    };
  });
}

// Funciones auxiliares
function parseResponseValue(response: any): number {
  if (typeof response === 'number') return response;
  if (typeof response === 'string') {
    const parsed = parseFloat(response);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (response && typeof response === 'object' && 'value' in response) {
    return parseResponseValue(response.value);
  }
  return 0;
}

function parseResponseText(response: any): string {
  if (typeof response === 'string') return response;
  if (response && typeof response === 'object' && 'value' in response) {
    return parseResponseText(response.value);
  }
  return JSON.stringify(response);
}
