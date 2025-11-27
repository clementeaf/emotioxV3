'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AgeQuota,
  CountryQuota,
  DailyHoursOnlineQuota,
  DemographicQuestionKeys,
  EducationLevelQuota,
  EmploymentStatusQuota,
  EyeTrackingRecruitStats,
  GenderQuota,
  HouseholdIncomeQuota,
  LinkConfigKeys,
  ParameterOptionKeys,
  TechnicalProficiencyQuota,
} from 'shared/interfaces/eyeTrackingRecruit.interface';

import { useErrorLog } from '@/components/utils/ErrorLogger';
import { useEyeTrackingSharedData } from '@/hooks/useEyeTrackingSharedData';
import { eyeTrackingApi } from '@/api/domains/eye-tracking';
import { QuestionType } from 'shared/interfaces/question-types.enum';


// Interfaces
interface ErrorModalData {
  title?: string;
  message: string;
  type: 'error' | 'info' | 'warning';
}

interface UseEyeTrackingRecruitProps {
  researchId: string;
}

// Definición de interfaces para datos del formulario
// 🎯 LAS INTERFACES DE CUOTAS SE IMPORTAN DESDE shared/interfaces/eyeTrackingRecruit.interface.ts

interface EyeTrackingRecruitFormData {
  id?: string;
  researchId: string;
  questionKey: string;
  lastUpdated?: string; // Para manejar datos optimistas
  demographicQuestions: {
    age: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingAges?: string[];
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas?: AgeQuota[];
      quotasEnabled?: boolean;
    };
    country: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingCountries?: string[];
      priorityCountries?: string[];
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas?: CountryQuota[];
      quotasEnabled?: boolean;
    };
    gender: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingGenders?: string[];
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas?: GenderQuota[];
      quotasEnabled?: boolean;
    };
    educationLevel: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingEducation?: string[];
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas?: EducationLevelQuota[];
      quotasEnabled?: boolean;
    };
    householdIncome: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingIncomes?: string[];
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas?: HouseholdIncomeQuota[];
      quotasEnabled?: boolean;
    };
    employmentStatus: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingEmploymentStatuses?: string[];
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas?: EmploymentStatusQuota[];
      quotasEnabled?: boolean;
    };
    dailyHoursOnline: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingHours?: string[];
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas?: DailyHoursOnlineQuota[];
      quotasEnabled?: boolean;
    };
    technicalProficiency: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingProficiencies?: string[];
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas?: TechnicalProficiencyQuota[];
      quotasEnabled?: boolean;
    };
  };
  linkConfig: {
    allowMobile: boolean;
    trackLocation: boolean;
    allowMultipleAttempts: boolean;
    showProgressBar: boolean; // 🎯 NUEVO: Configuración de barra de progreso
  };
  participantLimit: {
    enabled: boolean;
    value: number;
  };
  backlinks: {
    complete: string;
    disqualified: string;
    overquota: string;
  };
  researchUrl: string;
  parameterOptions: {
    saveDeviceInfo: boolean;
    saveLocationInfo: boolean;
    saveResponseTimes: boolean;
    saveUserJourney: boolean;
  };
}

interface UseEyeTrackingRecruitResult {
  // Estados del formulario
  loading: boolean;
  saving: boolean;
  formData: EyeTrackingRecruitFormData;
  setFormData: React.Dispatch<React.SetStateAction<EyeTrackingRecruitFormData>>;
  stats: EyeTrackingRecruitStats | null;

  // 🎯 NUEVOS ESTADOS PARA FEEDBACK VISUAL OPTIMISTA
  lastSaved: string | null;
  hasUnsavedChanges: boolean;

  // Estados para los switches principales
  demographicQuestionsEnabled: boolean;
  setDemographicQuestionsEnabled: (value: boolean) => void;
  linkConfigEnabled: boolean;
  setLinkConfigEnabled: (value: boolean) => void;

  // Métodos para manipular el formulario
  handleDemographicChange: (key: DemographicQuestionKeys, value: boolean) => void;
  handleDemographicRequired: (key: DemographicQuestionKeys, required: boolean) => void;
  handleLinkConfigChange: (key: LinkConfigKeys, value: boolean) => void;
  handleBacklinkChange: (key: string, value: string) => void;
  handleParamOptionChange: (key: ParameterOptionKeys, value: boolean) => void;
  setLimitParticipants: (value: boolean) => void;
  setParticipantLimit: (value: number) => void;
  updateAgeOptions: (options: string[]) => void;
  updateDisqualifyingAges: (disqualifyingAges: string[]) => void;
  updateCountryOptions: (options: string[]) => void;
  updateDisqualifyingCountries: (disqualifyingCountries: string[]) => void;
  updatePriorityCountries: (priorityCountries: string[]) => void;
  updateGenderOptions: (options: string[]) => void;
  updateDisqualifyingGenders: (disqualifyingGenders: string[]) => void;
  updateEducationOptions: (options: string[]) => void;
  updateDisqualifyingEducation: (disqualifyingEducation: string[]) => void;
  updateHouseholdIncomeOptions: (options: string[]) => void;
  updateDisqualifyingHouseholdIncomes: (disqualifyingIncomes: string[]) => void;
  updateEmploymentStatusOptions: (options: string[]) => void;
  updateDisqualifyingEmploymentStatuses: (disqualifyingEmploymentStatuses: string[]) => void;
  updateDailyHoursOnlineOptions: (options: string[]) => void;
  updateDisqualifyingDailyHoursOnline: (disqualifyingHours: string[]) => void;
  updateTechnicalProficiencyOptions: (options: string[]) => void;
  updateDisqualifyingTechnicalProficiencies: (disqualifyingProficiencies: string[]) => void;

  // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE EDAD CON CUOTAS
  handleAgeConfigSave: (validAges: string[], disqualifyingAges: string[]) => void;
  handleAgeQuotasSave: (quotas: AgeQuota[]) => void;
  toggleAgeQuotasEnabled: (enabled: boolean) => void;

  // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE PAÍS CON CUOTAS
  handleCountryQuotasSave: (quotas: CountryQuota[]) => void;
  toggleCountryQuotasEnabled: (enabled: boolean) => void;

  // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE GÉNERO CON CUOTAS
  handleGenderQuotasSave: (quotas: GenderQuota[]) => void;
  toggleGenderQuotasEnabled: (enabled: boolean) => void;

  // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE NIVEL DE EDUCACIÓN CON CUOTAS
  handleEducationLevelQuotasSave: (quotas: EducationLevelQuota[]) => void;
  toggleEducationLevelQuotasEnabled: (enabled: boolean) => void;

  // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE INGRESOS FAMILIARES CON CUOTAS
  handleHouseholdIncomeQuotasSave: (quotas: HouseholdIncomeQuota[]) => void;
  toggleHouseholdIncomeQuotasEnabled: (enabled: boolean) => void;

  // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE SITUACIÓN LABORAL CON CUOTAS
  handleEmploymentStatusQuotasSave: (quotas: EmploymentStatusQuota[]) => void;
  toggleEmploymentStatusQuotasEnabled: (enabled: boolean) => void;

  // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE HORAS DIARIAS EN LÍNEA CON CUOTAS
  handleDailyHoursOnlineQuotasSave: (quotas: DailyHoursOnlineQuota[]) => void;
  toggleDailyHoursOnlineQuotasEnabled: (enabled: boolean) => void;

  // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE COMPETENCIA TÉCNICA CON CUOTAS
  handleTechnicalProficiencyQuotasSave: (quotas: TechnicalProficiencyQuota[]) => void;
  toggleTechnicalProficiencyQuotasEnabled: (enabled: boolean) => void;

  // Acciones
  saveForm: () => void;
  handleConfirmSave: () => Promise<void>;
  generateRecruitmentLink: () => string;
  generateQRCode: () => void;
  copyLinkToClipboard: () => void;

  // Estados para los modales
  modalError: ErrorModalData | null;
  modalVisible: boolean;
  showConfirmModal: boolean;
  apiErrors: { visible: boolean, title: string, message: string } | undefined;

  // Métodos para los modales
  closeModal: () => void;

  // Nuevos estados para QR
  qrCodeData: string | null;
  showQRModal: boolean;
  closeQRModal: () => void;
}

// Configuraciones por defecto
const DEFAULT_STATS: EyeTrackingRecruitStats = {
  complete: {
    count: 0,
    percentage: 0
  },
  disqualified: {
    count: 0,
    percentage: 0
  },
  overquota: {
    count: 0,
    percentage: 0
  }
};

// Añadir esta función auxiliar para garantizar que options sea siempre un array
const ensureOptionsArray = (options?: string[]): string[] => {
  return options || [];
};

// Configuración sin opciones hardcodeadas - el usuario debe definir sus propias opciones
const DEFAULT_CONFIG: EyeTrackingRecruitFormData = {
  researchId: '',
  questionKey: QuestionType.DEMOGRAPHICS,
  demographicQuestions: {
    age: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingAges: [],
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas: [],
      quotasEnabled: false
    },
    country: {
      enabled: false,
      required: false,
      options: [],
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas: [],
      quotasEnabled: false
    },
    gender: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingGenders: [],
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas: [],
      quotasEnabled: false
    },
    educationLevel: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingEducation: [],
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas: [],
      quotasEnabled: false
    },
    householdIncome: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingIncomes: [],
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas: [],
      quotasEnabled: false
    },
    employmentStatus: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingEmploymentStatuses: [],
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas: [],
      quotasEnabled: false
    },
    dailyHoursOnline: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingHours: [],
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas: [],
      quotasEnabled: false
    },
    technicalProficiency: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingProficiencies: [],
      // 🎯 NUEVO: SISTEMA DE CUOTAS DINÁMICAS
      quotas: [],
      quotasEnabled: false
    }
  },
  linkConfig: {
    allowMobile: false,
    trackLocation: false,
    allowMultipleAttempts: false,
    showProgressBar: false
  },
  participantLimit: {
    enabled: false,
    value: 50
  },
  backlinks: {
    complete: '',
    disqualified: '',
    overquota: ''
  },
  researchUrl: '',
  parameterOptions: {
    saveDeviceInfo: false,
    saveLocationInfo: false,
    saveResponseTimes: false,
    saveUserJourney: false
  }
};

// Interfaz para el contexto de la mutación
interface MutationContext {
  previousDataMap: Map<string, EyeTrackingRecruitFormData | undefined>;
  queryKeys: unknown[][];
  mainQueryKey: unknown[];
}

// Interfaz para la respuesta de la API
interface ApiResponse {
  id?: string;
  researchId?: string;
  demographicQuestions?: Record<string, unknown>;
  linkConfig?: Record<string, boolean>;
  participantLimit?: Record<string, unknown>;
  backlinks?: Record<string, string>;
  researchUrl?: string;
  parameterOptions?: Record<string, boolean>;
  lastUpdated?: string;
}

// Función para procesar la respuesta de la API y asegurar que todas las opciones sean arrays
const processApiResponse = (response: ApiResponse | null | undefined): EyeTrackingRecruitFormData => {
  // Empezar con una configuración segura basada en los valores predeterminados
  const safeResponse: EyeTrackingRecruitFormData = {
    ...DEFAULT_CONFIG,
    researchId: response?.researchId || DEFAULT_CONFIG.researchId
  };

  // Si no hay respuesta, devolver la configuración predeterminada
  if (!response) { return safeResponse; }

  try {
    // ID
    if (response.id && typeof response.id === 'string' && response.id.length > 0) {
      safeResponse.id = response.id;
    }

    // Preguntas demográficas
    if (response.demographicQuestions) {
      const demographicKeys: DemographicQuestionKeys[] = [
        'age', 'country', 'gender', 'educationLevel',
        'householdIncome', 'employmentStatus',
        'dailyHoursOnline', 'technicalProficiency'
      ];

      // Procesar cada categoría demográfica
      demographicKeys.forEach(key => {
        const demographicQuestions = response.demographicQuestions;
        if (demographicQuestions && demographicQuestions[key]) {
          const questionData = demographicQuestions[key] as Record<string, unknown>;
          const baseConfig = {
            enabled: Boolean(questionData.enabled) || false,
            required: Boolean(questionData.required) || false,
            options: ensureOptionsArray(questionData.options as string[]) || [],
          };
          
          // Procesar propiedades específicas según el tipo usando type assertion
          if (key === 'age') {
            (safeResponse.demographicQuestions.age as Record<string, unknown>) = {
              ...baseConfig,
              disqualifyingAges: ensureOptionsArray(questionData.disqualifyingAges as string[]),
              quotas: questionData.quotas || [],
              quotasEnabled: Boolean(questionData.quotasEnabled) || false
            };
          } else if (key === 'country') {
            (safeResponse.demographicQuestions.country as Record<string, unknown>) = {
              ...baseConfig,
              disqualifyingCountries: ensureOptionsArray(questionData.disqualifyingCountries as string[]),
              quotas: questionData.quotas || [],
              quotasEnabled: Boolean(questionData.quotasEnabled) || false
            };
          } else if (key === 'gender') {
            (safeResponse.demographicQuestions.gender as Record<string, unknown>) = {
              ...baseConfig,
              disqualifyingGenders: ensureOptionsArray(questionData.disqualifyingGenders as string[]),
              quotas: questionData.quotas || [],
              quotasEnabled: Boolean(questionData.quotasEnabled) || false
            };
          } else if (key === 'educationLevel') {
            (safeResponse.demographicQuestions.educationLevel as Record<string, unknown>) = {
              ...baseConfig,
              disqualifyingEducation: ensureOptionsArray(questionData.disqualifyingEducation as string[]),
              quotas: questionData.quotas || [],
              quotasEnabled: Boolean(questionData.quotasEnabled) || false
            };
          } else if (key === 'householdIncome') {
            (safeResponse.demographicQuestions.householdIncome as Record<string, unknown>) = {
              ...baseConfig,
              disqualifyingIncomes: ensureOptionsArray(questionData.disqualifyingIncomes as string[]),
              quotas: questionData.quotas || [],
              quotasEnabled: Boolean(questionData.quotasEnabled) || false
            };
          } else if (key === 'employmentStatus') {
            (safeResponse.demographicQuestions.employmentStatus as Record<string, unknown>) = {
              ...baseConfig,
              disqualifyingEmploymentStatuses: ensureOptionsArray(questionData.disqualifyingEmploymentStatuses as string[]),
              quotas: questionData.quotas || [],
              quotasEnabled: Boolean(questionData.quotasEnabled) || false
            };
          } else if (key === 'dailyHoursOnline') {
            (safeResponse.demographicQuestions.dailyHoursOnline as Record<string, unknown>) = {
              ...baseConfig,
              disqualifyingHours: ensureOptionsArray(questionData.disqualifyingHours as string[]),
              quotas: questionData.quotas || [],
              quotasEnabled: Boolean(questionData.quotasEnabled) || false
            };
          } else if (key === 'technicalProficiency') {
            (safeResponse.demographicQuestions.technicalProficiency as Record<string, unknown>) = {
              ...baseConfig,
              disqualifyingProficiencies: ensureOptionsArray(questionData.disqualifyingProficiencies as string[]),
              quotas: questionData.quotas || [],
              quotasEnabled: Boolean(questionData.quotasEnabled) || false
            };
          }
        }
      });
    }

    // Configuración de enlaces
    if (response.linkConfig) {
      safeResponse.linkConfig = {
        allowMobile: Boolean(response.linkConfig.allowMobile),
        trackLocation: Boolean(response.linkConfig.trackLocation),
        allowMultipleAttempts: Boolean(response.linkConfig.allowMultipleAttempts),
        showProgressBar: Boolean(response.linkConfig.showProgressBar)
      };
    }

    // Límite de participantes
    if (response.participantLimit) {
      const participantLimit = response.participantLimit as Record<string, unknown>;
      safeResponse.participantLimit = {
        enabled: Boolean(participantLimit.enabled) || false,
        value: Number(participantLimit.value) || 50
      };
    }

    // Enlaces de retorno
    if (response.backlinks) {
      safeResponse.backlinks = {
        complete: response.backlinks.complete || '',
        disqualified: response.backlinks.disqualified || '',
        overquota: response.backlinks.overquota || ''
      };
    }

    // URL de investigación
    if (response.researchUrl) {
      safeResponse.researchUrl = response.researchUrl;
    }

    // Opciones de parámetros
    if (response.parameterOptions) {
      safeResponse.parameterOptions = {
        saveDeviceInfo: response.parameterOptions.saveDeviceInfo || false,
        saveLocationInfo: response.parameterOptions.saveLocationInfo || false,
        saveResponseTimes: response.parameterOptions.saveResponseTimes || false,
        saveUserJourney: response.parameterOptions.saveUserJourney || false
      };
    }

  } catch (error) {
  }

  return safeResponse;
};

// Hook principal
export function useEyeTrackingRecruit({ researchId }: UseEyeTrackingRecruitProps): UseEyeTrackingRecruitResult {

  const logger = useErrorLog();
  const queryClient = useQueryClient();

  // Estados
  const [formData, setFormData] = useState<EyeTrackingRecruitFormData>(() => {
    const actualResearchId = researchId === 'current' ? '1234' : researchId;
    
    // 🎯 DETECTAR ENTORNO AUTOMÁTICAMENTE
    const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const publicTestsBaseUrl = isDevelopment 
      ? 'http://localhost:5173'  // 🏠 DESARROLLO LOCAL
      : 'https://d35071761848hm.cloudfront.net'; // 🌐 PRODUCCIÓN - URL CORRECTA
    
    const generatedUrl = `${publicTestsBaseUrl}/?researchId=${actualResearchId}`;
    
    return {
      ...DEFAULT_CONFIG,
      researchId: actualResearchId,
      researchUrl: generatedUrl
    };
  });
  const [stats, setStats] = useState<EyeTrackingRecruitStats | null>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 🎯 NUEVOS ESTADOS PARA FEEDBACK VISUAL OPTIMISTA
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Estados para los switches principales
  const [demographicQuestionsEnabled, setDemographicQuestionsEnabledState] = useState(true);
  const [linkConfigEnabled, setLinkConfigEnabledState] = useState(true);

  // Estados para los modales
  const [modalError, setModalError] = useState<ErrorModalData | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [apiErrors, setApiErrors] = useState<{ visible: boolean, title: string, message: string } | undefined>(undefined);

  // Nuevos estados para QR
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);

  // Función para generar el enlace de reclutamiento
  const generateRecruitmentLink = useCallback(() => {
    const actualResearchId = researchId === 'current' ? '1234' : researchId;
    
    // 🎯 DETECTAR ENTORNO AUTOMÁTICAMENTE
    const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const publicTestsBaseUrl = isDevelopment 
      ? 'http://localhost:5173'  // 🏠 DESARROLLO LOCAL
      : 'https://d35071761848hm.cloudfront.net'; // 🌐 PRODUCCIÓN - URL CORRECTA
    
    // 🎯 GENERAR PARTICIPANT ID ÚNICO PARA QUE LOS DATOS SE GUARDEN
    // Si no hay participantId, se activa modo preview y los datos no se guardan
    const participantId = `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const generatedUrl = `${publicTestsBaseUrl}/?researchId=${actualResearchId}&participantId=${participantId}`;
    
    // Debug log para verificar la URL generada
    console.log('[useEyeTrackingRecruit] Generated URL:', generatedUrl, '| Entorno:', isDevelopment ? 'LOCAL' : 'PRODUCCIÓN');
    
    return generatedUrl;
  }, [researchId]);

  // Usar el hook compartido para obtener datos de eye-tracking recruit
  // Optimización: Usar cache compartido y evitar llamadas duplicadas
  const actualResearchId = researchId === 'current' ? '1234' : researchId;
  const { data: eyeTrackingRecruitData, isLoading: isLoadingConfig } = useEyeTrackingSharedData(actualResearchId, {
    type: 'recruit',
    enabled: !!actualResearchId // Solo habilitar si hay researchId válido
  });

  // Procesar datos cuando cambie la respuesta del hook centralizado
  useEffect(() => {
    if (isLoadingConfig) return;

    try {
      if (!eyeTrackingRecruitData) {
        // Si no hay datos, crear configuración predeterminada SOLO si no hay datos locales optimistas
        if (!formData.id) {
          const defaultConfig = createDefaultConfig(actualResearchId);
          setFormData(defaultConfig);
          setDemographicQuestionsEnabledState(false);
          setLinkConfigEnabledState(false);
        }
        return;
      }

      // Verificar si la respuesta contiene los datos necesarios
      if (!(eyeTrackingRecruitData as any)?.id) {
        // Solo crear config por defecto si no hay datos optimistas locales
        if (!formData.id) {
          const defaultConfig = createDefaultConfig(actualResearchId);
          setFormData(defaultConfig);
          setDemographicQuestionsEnabledState(false);
          setLinkConfigEnabledState(false);
        }
        return;
      }

      // 🎯 SIEMPRE USAR DATOS DEL CACHE DE REACT QUERY
      // El cache de React Query mantiene los datos optimistas persistentes

      // Procesar la respuesta para adaptarla a nuestra estructura
      const configData = processApiResponse(eyeTrackingRecruitData as any);

      // Asegurarnos de usar el researchId correcto
      configData.researchId = actualResearchId;

      // Actualizar el estado del formulario solo si no hay datos optimistas
      setFormData(configData);

      // 🎯 CALCULAR estados de switches basado en datos cargados
      // Determinar si hay preguntas demográficas habilitadas
      const hasDemographics = Object.values(configData.demographicQuestions).some(
        (q) => q.enabled
      );
      setDemographicQuestionsEnabledState(hasDemographics);

      // Determinar si hay opciones de configuración de enlace habilitadas
      const hasLinkConfig = Object.values(configData.linkConfig).some(value => value);
      setLinkConfigEnabledState(hasLinkConfig);

      // Marcar que ya no es carga inicial después de procesar datos
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (error: unknown) {
      if ((error as Record<string, unknown>)?.statusCode === 404) {
        // Solo crear config por defecto si no hay datos optimistas
        if (!formData.id) {
          const defaultConfig = createDefaultConfig(actualResearchId);
          setFormData(defaultConfig);
          setDemographicQuestionsEnabledState(false);
          setLinkConfigEnabledState(false);
        }
        return;
      }
      toast.error(`Error al cargar configuración: ${(error as Error)?.message || 'Error desconocido'}`);
    }
  }, [eyeTrackingRecruitData, isLoadingConfig, actualResearchId, isInitialLoad]);

  // Actualizar estado de carga cuando termina la consulta y asignar URL automáticamente
  useEffect(() => {
    if (!isLoadingConfig) {
      setLoading(false);

      // Establecer automáticamente la URL de investigación al cargar
      const generatedLink = generateRecruitmentLink();
      setFormData(prev => ({
        ...prev,
        researchUrl: generatedLink
      }));
    }
  }, [isLoadingConfig, generateRecruitmentLink]);

  // 🎯 NUEVO: Asegurar que la URL se genere siempre al montar el componente
  useEffect(() => {
    if (!loading) {
      const generatedLink = generateRecruitmentLink();
      // Solo actualizar si la URL es diferente o está vacía (evitar loop infinito)
      setFormData(prev => {
        if (!prev.researchUrl || prev.researchUrl !== generatedLink) {
          return {
            ...prev,
            researchUrl: generatedLink
          };
        }
        return prev; // No actualizar si ya es la misma URL
      });
    }
  }, [loading, generateRecruitmentLink]); // Remover formData.researchUrl de dependencias

  // 🎯 DETECTAR CAMBIOS NO GUARDADOS PARA FEEDBACK VISUAL
  useEffect(() => {
    // Solo marcar cambios después de que se haya cargado inicialmente
    if (!loading && !isLoadingConfig) {
      setHasUnsavedChanges(true);
    }
  }, [formData, loading, isLoadingConfig]);

  // 🔄 REFRESCAR CACHE CUANDO EL COMPONENTE SE MONTA (navegación entre formularios)
  useEffect(() => {
    const actualResearchId = researchId === 'current' ? '1234' : researchId;
    
    // 🎯 RESETEAR isInitialLoad cuando cambia el researchId para permitir recálculo de switches
    setIsInitialLoad(true);
    
    // 🚨 NO INVALIDAR CACHE AL NAVEGAR - mantener datos optimistas
    // Solo refetch si realmente no hay datos en cache
    const existingData = queryClient.getQueryData(['eyeTracking', 'recruit', 'shared', actualResearchId]);
    if (!existingData) {
      queryClient.invalidateQueries({ 
        queryKey: ['eyeTracking', 'recruit', 'shared', actualResearchId],
        refetchType: 'active'
      });
    }
  }, [researchId, queryClient]);

  // Función para validar campos requeridos
  const checkRequiredFields = useCallback(() => {
    const errors: string[] = [];

    // Verificar que tenga una URL de investigación - generar automáticamente si está vacía
    if (!formData.researchUrl) {
      // Generar automáticamente la URL si está vacía
      const generatedLink = generateRecruitmentLink();
      setFormData(prev => ({
        ...prev,
        researchUrl: generatedLink
      }));
      // No agregar error ya que acabamos de generar la URL
    }

    // Verificar campos demográficos marcados como required
    Object.entries(formData.demographicQuestions).forEach(([key, value]) => {
      if (value.enabled && value.required) {
        // Aquí podríamos verificar más condiciones si fuera necesario
      }
    });

    // Verificar otras condiciones según sea necesario...

    if (errors.length > 0) {
      return false;
    }

    return true;
  }, [formData, generateRecruitmentLink, setFormData]);

  // Configuración de la mutación para guardar con carga optimista
  const saveConfigMutation = useMutation({
    mutationFn: async (data: EyeTrackingRecruitFormData) => {
      // Determinar si es una actualización o creación basado en si existe un ID
      const isUpdate = data.id && typeof data.id === 'string' && data.id.length > 0;
      
      if (isUpdate) {
        return await eyeTrackingApi.recruit.updateConfig(researchId, data as any);
      } else {
        return await eyeTrackingApi.recruit.createConfig(researchId, data as any);
      }
    },
    // 🎯 CARGA OPTIMISTA: Actualizar inmediatamente múltiples caches
    onMutate: async (newData) => {
      const actualResearchId = researchId === 'current' ? '1234' : researchId;
      
      // 📋 DEFINIR TODOS LOS QUERY KEYS QUE NECESITAMOS SINCRONIZAR
      const queryKeys = [
        ['eyeTrackingRecruit', actualResearchId],
        ['eyeTracking', 'recruit', 'shared', actualResearchId] // 🔧 FIX: Usar el key correcto del hook compartido
      ];
      
      // Cancelar todas las queries en progreso
      await Promise.all(
        queryKeys.map(queryKey => queryClient.cancelQueries({ queryKey }))
      );
      
      // Obtener snapshots de todos los estados anteriores
      const previousDataMap = new Map();
      queryKeys.forEach(queryKey => {
        const data = queryClient.getQueryData(queryKey);
        previousDataMap.set(JSON.stringify(queryKey), data);
      });
      
      // 🚀 ACTUALIZAR OPTIMÍSTICAMENTE TODOS LOS CACHES
      const updateOptimisticData = (old: EyeTrackingRecruitFormData | undefined) => {
        // Crear una estructura completa incluso si no hay datos previos
        const baseData = old || {
          researchId: actualResearchId,
          questionKey: 'DEMOGRAPHICS'
        };
        
        return {
          ...baseData,
          ...newData,
          id: newData.id || (baseData as EyeTrackingRecruitFormData).id,
          researchId: actualResearchId, // Asegurar que siempre tenga el researchId correcto
          lastUpdated: new Date().toISOString()
        };
      };
      
      queryKeys.forEach(queryKey => {
        queryClient.setQueryData(queryKey, updateOptimisticData);
      });
      
      // 🎯 ACTUALIZAR TAMBIÉN EL ESTADO LOCAL PARA FEEDBACK INMEDIATO
      const updatedFormData = updateOptimisticData(formData);
      setFormData(updatedFormData);

      // ✨ MOSTRAR FEEDBACK INMEDIATO AL USUARIO (carga optimista)
      toast.success('¡Configuración guardada!', {
        duration: 2000,
        icon: '⚡'
      });
      
      // 🎯 ACTUALIZAR ESTADOS DE FEEDBACK VISUAL OPTIMISTA
      setLastSaved(new Date().toLocaleTimeString());
      setHasUnsavedChanges(false);
      
      // Feedback visual inmediato ya mostrado arriba
      
      // Retornar contexto completo para rollback
      return { 
        previousDataMap, 
        queryKeys,
        mainQueryKey: ['eyeTrackingRecruit', actualResearchId]
      };
    },
    onSuccess: (result) => {
      const actualResearchId = researchId === 'current' ? '1234' : researchId;
      
      // 🔄 ACTUALIZAR MÚLTIPLES CACHES PARA SINCRONIZACIÓN COMPLETA
      if (result) {
        // 1. Cache principal de eyeTrackingRecruit
        queryClient.setQueryData(['eyeTrackingRecruit', actualResearchId], result);
        
        // 2. Cache del hook compartido (useEyeTrackingSharedData)
        queryClient.setQueryData(['eyeTracking', 'recruit', 'shared', actualResearchId], result);
        
        // 3. NO invalidar queries inmediatamente para preservar carga optimista
        // Las invalidaciones pueden causar re-fetches que sobrescriben los datos optimistas
        // queryClient.invalidateQueries({
        //   queryKey: ['eyeTrackingRecruit'],
        //   exact: false
        // });
        // queryClient.invalidateQueries({
        //   queryKey: ['eyeTracking', 'recruit'],
        //   exact: false
        // });
        
        // 4. Actualizar SOLO el ID - NO sobrescribir el resto del formData
        // El estado local ya tiene los valores correctos (carga optimista)
        // La respuesta del backend puede tener tipos incompatibles (Date vs string)
        if (result.id && !formData.id) {
          setFormData(prev => ({
            ...prev,
            id: result.id
          }));
        }
        // Si ya tenemos ID, no hacemos nada - el estado optimista ya está correcto
        
        // 🚨 IMPORTANTE: Los estados de demographicQuestionsEnabled y linkConfigEnabled 
        // NO se recalculan después de guardar para preservar la intención del usuario
        // Si el usuario desactivó un switch, debe permanecer desactivado incluso si
        // los datos guardados contienen configuraciones que podrían reactivarlo
      }
      
      // 🎯 ACTUALIZAR ESTADOS DE FEEDBACK VISUAL
      setLastSaved(new Date().toLocaleTimeString());
      setHasUnsavedChanges(false);
      
      // Confirmación final ya mostrada de forma optimista
    },
    onError: (error: Error, variables: EyeTrackingRecruitFormData, context: MutationContext | undefined) => {
      // 🔄 ROLLBACK: Revertir todos los cambios optimistas en caso de error
      if (context?.previousDataMap && context?.queryKeys) {
        context.queryKeys.forEach((queryKey: unknown[]) => {
          const keyString = JSON.stringify(queryKey);
          const previousData = context.previousDataMap.get(keyString);
          if (previousData) {
            queryClient.setQueryData(queryKey, previousData);
          }
        });
        
        // 🎯 REVERTIR TAMBIÉN EL ESTADO LOCAL DEL FORMULARIO
        const mainQueryKey = ['eyeTrackingRecruit', researchId === 'current' ? '1234' : researchId];
        const keyString = JSON.stringify(mainQueryKey);
        const previousFormData = context.previousDataMap.get(keyString);
        if (previousFormData) {
          setFormData(previousFormData);
        }
      }
      
      // 🎯 REVERTIR ESTADOS DE FEEDBACK VISUAL
      setLastSaved(null);
      setHasUnsavedChanges(true);
      
      // Mostrar error
      toast.error(`Error al guardar: ${error.message || 'Error desconocido'}`, {
        duration: 4000,
        position: 'top-center'
      });
      
      setApiErrors({
        visible: true,
        title: 'Error al guardar',
        message: error.message || 'Ocurrió un error inesperado'
      });
    },
    onSettled: () => {
      // 🎯 REDUCIR INVALIDACIONES AGRESIVAS - Solo invalidar si es necesario
      const actualResearchId = researchId === 'current' ? '1234' : researchId;
      
      // Solo invalidar queries que no sean las que acabamos de actualizar
      // Esto evita sobreescribir los datos optimistas que funcionaron
      queryClient.invalidateQueries({ 
        queryKey: ['eyeTrackingRecruit'], 
        exact: false,
        predicate: (query) => {
          // No invalidar las queries que acabamos de actualizar
          const key = query.queryKey;
          return !(
            (key[0] === 'eyeTrackingRecruit' && key[1] === actualResearchId) ||
            (key[0] === 'eyeTracking' && key[1] === 'recruit' && key[2] === 'shared' && key[3] === actualResearchId)
          );
        }
      });
    }
  });

  // Handlers para el modal de error
  const closeModal = useCallback(() => {
    setModalVisible(false);
    setModalError(null);
  }, []);

  // Función para cerrar el modal QR
  const closeQRModal = useCallback(() => {
    setShowQRModal(false);
  }, []);

  // Función para mostrar un modal
  const showModal = useCallback((data: ErrorModalData) => {
    setModalError(data);
    setModalVisible(true);
  }, []);

  // Función que ejecuta el guardado real (simplificada para carga optimista)
  const handleConfirmSave = React.useCallback(async () => {
    setSaving(true);

    try {
      // Preparamos los datos para enviar
      const actualResearchId = researchId === 'current' ? '1234' : researchId;

      // Mantener el id cuando existe para operaciones de actualización
      const dataToSave = {
        ...formData,
        researchId: actualResearchId,
        questionKey: formData.questionKey === QuestionType.DEMOGRAPHICS ? formData.questionKey : QuestionType.DEMOGRAPHICS
      };

      // La mutación optimista se encarga del resto (feedback visual, rollback, etc.)
      await saveConfigMutation.mutateAsync(dataToSave);
      
    } catch (error: unknown) {
      // Los errores se manejan en la mutación optimista
      console.error('Error en handleConfirmSave:', error as Error);
    } finally {
      setSaving(false);
    }
  }, [formData, saveConfigMutation, researchId]);

  // Función para guardar el formulario (punto de entrada principal)
  const saveForm = React.useCallback(async () => {
    setSaving(true);
    setApiErrors(undefined);

    try {
      // Validamos los datos antes de enviar
      if (checkRequiredFields()) {
        // Guardar directamente sin modal de confirmación
        await handleConfirmSave();
      } else {
        toast.error('Por favor complete todos los campos requeridos');
      }
    } catch (error: unknown) {
      setApiErrors({
        visible: true,
        title: 'Error al preparar datos',
        message: (error as Error)?.message || 'Ocurrió un error inesperado al preparar los datos para guardar'
      });
    } finally {
      setSaving(false);
    }
  }, [checkRequiredFields, handleConfirmSave]);

  // 🔥 REMOVED: useEffect que forzaba enabled: false cuando demographicQuestionsEnabled era false
  // Esto causaba que los checkboxes individuales se desmarcaran automáticamente
  // Ahora los checkboxes individuales son completamente independientes del checkbox padre

  // 🔥 REMOVED: useEffect que forzaba todos los linkConfig a false cuando linkConfigEnabled era false
  // Ahora los checkboxes de linkConfig son independientes del checkbox padre

  // Métodos para manipular el formulario
  const handleDemographicChange = useCallback((key: DemographicQuestionKeys, value: boolean) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        [key]: {
          ...prevData.demographicQuestions[key],
          enabled: value,
          required: value // Por defecto, si está habilitado, es requerido
        }
      }
    }));
  }, []);

  // Nuevo método para manejar el cambio de required en preguntas demográficas
  const handleDemographicRequired = useCallback((key: DemographicQuestionKeys, required: boolean) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        [key]: {
          ...prevData.demographicQuestions[key],
          required
        }
      }
    }));
  }, []);

  const handleLinkConfigChange = useCallback((key: LinkConfigKeys, value: boolean) => {
    setFormData(prevData => ({
      ...prevData,
      linkConfig: {
        ...prevData.linkConfig,
        [key]: value
      }
    }));
  }, []);

  const handleBacklinkChange = useCallback((key: string, value: string) => {
    setFormData(prevData => ({
      ...prevData,
      backlinks: {
        ...prevData.backlinks,
        [key]: value
      }
    }));
  }, []);

  const handleParamOptionChange = useCallback((key: ParameterOptionKeys, value: boolean) => {
    setFormData(prevData => ({
      ...prevData,
      parameterOptions: {
        ...prevData.parameterOptions,
        [key]: value
      }
    }));
  }, []);

  const setLimitParticipants = useCallback((value: boolean) => {
    setFormData(prevData => ({
      ...prevData,
      participantLimit: {
        ...prevData.participantLimit,
        enabled: value
      }
    }));
  }, []);

  const setParticipantLimit = useCallback((value: number) => {
    setFormData(prevData => ({
      ...prevData,
      participantLimit: {
        ...prevData.participantLimit,
        value: value
      }
    }));
  }, []);

  // Función para actualizar las opciones de edad
  const updateAgeOptions = useCallback((options: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        age: {
          ...prevData.demographicQuestions.age,
          options: options
        }
      }
    }));
  }, []);

  // Función para actualizar las edades descalificantes
  const updateDisqualifyingAges = useCallback((disqualifyingAges: string[]) => {
    setFormData(prevData => {
      // 🎯 COMBINAR LAS EDADES DESCALIFICATORIAS CON LAS OPCIONES EXISTENTES
      const currentOptions = prevData.demographicQuestions.age.options || [];
      const allAges = Array.from(new Set([...currentOptions, ...disqualifyingAges]));


      return {
        ...prevData,
        demographicQuestions: {
          ...prevData.demographicQuestions,
          age: {
            ...prevData.demographicQuestions.age,
            options: allAges, // 🎯 INCLUIR TODAS LAS EDADES
            disqualifyingAges: disqualifyingAges
          }
        }
      };
    });
  }, []);

  // Función para actualizar las opciones de países
  const updateCountryOptions = useCallback((options: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        country: {
          ...prevData.demographicQuestions.country,
          options: options
        }
      }
    }));
  }, []);

  // Función para actualizar los países descalificantes
  const updateDisqualifyingCountries = useCallback((disqualifyingCountries: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        country: {
          ...prevData.demographicQuestions.country,
          disqualifyingCountries: disqualifyingCountries
        }
      }
    }));
  }, []);

  // Función para actualizar los países prioritarios
  const updatePriorityCountries = useCallback((priorityCountries: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        country: {
          ...prevData.demographicQuestions.country,
          priorityCountries: priorityCountries
        }
      }
    }));
  }, []);

  // Función para actualizar las opciones de géneros
  const updateGenderOptions = useCallback((options: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        gender: {
          ...prevData.demographicQuestions.gender,
          options: options
        }
      }
    }));
  }, []);

  // Función para actualizar los géneros descalificantes
  const updateDisqualifyingGenders = useCallback((disqualifyingGenders: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        gender: {
          ...prevData.demographicQuestions.gender,
          disqualifyingGenders: disqualifyingGenders
        }
      }
    }));
  }, []);

  // Función para actualizar las opciones de niveles educativos
  const updateEducationOptions = useCallback((options: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        educationLevel: {
          ...prevData.demographicQuestions.educationLevel,
          options: options
        }
      }
    }));
  }, []);

  // Función para actualizar los niveles educativos descalificantes
  const updateDisqualifyingEducation = useCallback((disqualifyingEducation: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        educationLevel: {
          ...prevData.demographicQuestions.educationLevel,
          disqualifyingEducation: disqualifyingEducation
        }
      }
    }));
  }, []);

  // Función para actualizar las opciones de ingresos familiares
  const updateHouseholdIncomeOptions = useCallback((options: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        householdIncome: {
          ...prevData.demographicQuestions.householdIncome,
          options: options
        }
      }
    }));
  }, []);

  // Función para actualizar los ingresos familiares descalificantes
  const updateDisqualifyingHouseholdIncomes = useCallback((disqualifyingIncomes: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        householdIncome: {
          ...prevData.demographicQuestions.householdIncome,
          disqualifyingIncomes: disqualifyingIncomes
        }
      }
    }));
  }, []);

  // Función para actualizar las opciones de situación laboral
  const updateEmploymentStatusOptions = useCallback((options: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        employmentStatus: {
          ...prevData.demographicQuestions.employmentStatus,
          options: options
        }
      }
    }));
  }, []);

  // Función para actualizar las situaciones laborales descalificantes
  const updateDisqualifyingEmploymentStatuses = useCallback((disqualifyingEmploymentStatuses: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        employmentStatus: {
          ...prevData.demographicQuestions.employmentStatus,
          disqualifyingEmploymentStatuses: disqualifyingEmploymentStatuses
        }
      }
    }));
  }, []);

  // Función para actualizar las opciones de horas diarias en línea
  const updateDailyHoursOnlineOptions = useCallback((options: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        dailyHoursOnline: {
          ...prevData.demographicQuestions.dailyHoursOnline,
          options: options
        }
      }
    }));
  }, []);

  // Función para actualizar las horas diarias en línea descalificantes
  const updateDisqualifyingDailyHoursOnline = useCallback((disqualifyingHours: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        dailyHoursOnline: {
          ...prevData.demographicQuestions.dailyHoursOnline,
          disqualifyingHours: disqualifyingHours
        }
      }
    }));
  }, []);

  // Función para actualizar las opciones de competencia técnica
  const updateTechnicalProficiencyOptions = useCallback((options: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        technicalProficiency: {
          ...prevData.demographicQuestions.technicalProficiency,
          options: options
        }
      }
    }));
  }, []);

  // Función para actualizar las competencias técnicas descalificantes
  const updateDisqualifyingTechnicalProficiencies = useCallback((disqualifyingProficiencies: string[]) => {
    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        technicalProficiency: {
          ...prevData.demographicQuestions.technicalProficiency,
          disqualifyingProficiencies: disqualifyingProficiencies
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA MANEJAR CONFIGURACIÓN DE EDAD
  const handleAgeConfigSave = useCallback((validAges: string[], disqualifyingAges: string[]) => {

    // 🎯 COMBINAR TODAS LAS EDADES (VÁLIDAS + DESCALIFICATORIAS) EN OPTIONS
    const allAges = Array.from(new Set([...validAges, ...disqualifyingAges]));


    setFormData(prevData => {
      const newData = {
        ...prevData,
        demographicQuestions: {
          ...prevData.demographicQuestions,
          age: {
            ...prevData.demographicQuestions.age,
            options: allAges, // 🎯 INCLUIR TODAS LAS EDADES
            disqualifyingAges: disqualifyingAges
          }
        }
      };

      return newData;
    });
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA MANEJAR CUOTAS DE EDAD
  const handleAgeQuotasSave = useCallback((quotas: AgeQuota[]) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        age: {
          ...prevData.demographicQuestions.age,
          quotas: quotas
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA ACTIVAR/DESACTIVAR CUOTAS DE EDAD
  const toggleAgeQuotasEnabled = useCallback((enabled: boolean) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        age: {
          ...prevData.demographicQuestions.age,
          quotasEnabled: enabled
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA MANEJAR CUOTAS DE PAÍS
  const handleCountryQuotasSave = useCallback((quotas: CountryQuota[]) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        country: {
          ...prevData.demographicQuestions.country,
          quotas: quotas
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA ACTIVAR/DESACTIVAR CUOTAS DE PAÍS
  const toggleCountryQuotasEnabled = useCallback((enabled: boolean) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        country: {
          ...prevData.demographicQuestions.country,
          quotasEnabled: enabled
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA MANEJAR CUOTAS DE GÉNERO
  const handleGenderQuotasSave = useCallback((quotas: GenderQuota[]) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        gender: {
          ...prevData.demographicQuestions.gender,
          quotas: quotas
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA ACTIVAR/DESACTIVAR CUOTAS DE GÉNERO
  const toggleGenderQuotasEnabled = useCallback((enabled: boolean) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        gender: {
          ...prevData.demographicQuestions.gender,
          quotasEnabled: enabled
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA MANEJAR CUOTAS DE NIVEL DE EDUCACIÓN
  const handleEducationLevelQuotasSave = useCallback((quotas: EducationLevelQuota[]) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        educationLevel: {
          ...prevData.demographicQuestions.educationLevel,
          quotas: quotas
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA ACTIVAR/DESACTIVAR CUOTAS DE NIVEL DE EDUCACIÓN
  const toggleEducationLevelQuotasEnabled = useCallback((enabled: boolean) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        educationLevel: {
          ...prevData.demographicQuestions.educationLevel,
          quotasEnabled: enabled
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA MANEJAR CUOTAS DE INGRESOS FAMILIARES
  const handleHouseholdIncomeQuotasSave = useCallback((quotas: HouseholdIncomeQuota[]) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        householdIncome: {
          ...prevData.demographicQuestions.householdIncome,
          quotas: quotas
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA ACTIVAR/DESACTIVAR CUOTAS DE INGRESOS FAMILIARES
  const toggleHouseholdIncomeQuotasEnabled = useCallback((enabled: boolean) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        householdIncome: {
          ...prevData.demographicQuestions.householdIncome,
          quotasEnabled: enabled
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA MANEJAR CUOTAS DE SITUACIÓN LABORAL
  const handleEmploymentStatusQuotasSave = useCallback((quotas: EmploymentStatusQuota[]) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        employmentStatus: {
          ...prevData.demographicQuestions.employmentStatus,
          quotas: quotas
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA ACTIVAR/DESACTIVAR CUOTAS DE SITUACIÓN LABORAL
  const toggleEmploymentStatusQuotasEnabled = useCallback((enabled: boolean) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        employmentStatus: {
          ...prevData.demographicQuestions.employmentStatus,
          quotasEnabled: enabled
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA MANEJAR CUOTAS DE HORAS DIARIAS EN LÍNEA
  const handleDailyHoursOnlineQuotasSave = useCallback((quotas: DailyHoursOnlineQuota[]) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        dailyHoursOnline: {
          ...prevData.demographicQuestions.dailyHoursOnline,
          quotas: quotas
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA ACTIVAR/DESACTIVAR CUOTAS DE HORAS DIARIAS EN LÍNEA
  const toggleDailyHoursOnlineQuotasEnabled = useCallback((enabled: boolean) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        dailyHoursOnline: {
          ...prevData.demographicQuestions.dailyHoursOnline,
          quotasEnabled: enabled
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA MANEJAR CUOTAS DE COMPETENCIA TÉCNICA
  const handleTechnicalProficiencyQuotasSave = useCallback((quotas: TechnicalProficiencyQuota[]) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        technicalProficiency: {
          ...prevData.demographicQuestions.technicalProficiency,
          quotas: quotas
        }
      }
    }));
  }, []);

  // 🎯 NUEVA FUNCIÓN PARA ACTIVAR/DESACTIVAR CUOTAS DE COMPETENCIA TÉCNICA
  const toggleTechnicalProficiencyQuotasEnabled = useCallback((enabled: boolean) => {

    setFormData(prevData => ({
      ...prevData,
      demographicQuestions: {
        ...prevData.demographicQuestions,
        technicalProficiency: {
          ...prevData.demographicQuestions.technicalProficiency,
          quotasEnabled: enabled
        }
      }
    }));
  }, []);

  // Acciones
  const generateQRCode = useCallback(() => {
    // 🎯 FIX: Asegurar que tenemos una URL válida antes de generar QR
    const link = formData.researchUrl || generateRecruitmentLink();
    
    if (!link) {
      toast.error('No se pudo generar la URL de investigación');
      return;
    }

    // Generar QR (en una aplicación real, podríamos usar una librería como qrcode.react)
    // Aquí simularemos la generación almacenando la URL en el estado
    setQrCodeData(link);
    setShowQRModal(true);

    // Aquí es donde normalmente generaríamos el QR con una librería
    // Por ejemplo: const qrCodeSvg = await QRCode.toString(link, { type: 'svg' });

    toast.success('Código QR generado correctamente');
  }, [formData.researchUrl, generateRecruitmentLink]);

  const copyLinkToClipboard = useCallback(async () => {
    // 🎯 FIX: Usar la URL del formData si existe, sino generar una nueva
    const link = formData.researchUrl || generateRecruitmentLink();
    
    if (!link) {
      toast.error('No se pudo obtener la URL de investigación');
      return;
    }
    
    try {
      // Intentar usar la API moderna de clipboard (solo funciona en contextos seguros)
      if (navigator.clipboard && typeof window !== 'undefined' && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
        toast.success('Enlace copiado al portapapeles');
        return;
      }
      
      // Fallback: método tradicional para contextos no seguros o navegadores antiguos
      const textArea = document.createElement('textarea');
      textArea.value = link;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, link.length);
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          toast.success('Enlace copiado al portapapeles');
        } else {
          throw new Error('execCommand failed');
        }
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Error al copiar enlace:', error);
      toast.error('Error al copiar enlace. Por favor, copia la URL manualmente.');
    }
  }, [formData.researchUrl, generateRecruitmentLink]);

  // Actualizar el handler de demographicQuestionsEnabled
  const setDemographicQuestionsEnabled = useCallback((enabled: boolean) => {
    if (!enabled) {
      // Desactivar todas las preguntas demográficas
      setFormData(prev => ({
        ...prev,
        demographicQuestions: {
          age: { ...prev.demographicQuestions.age, enabled: false },
          country: { ...prev.demographicQuestions.country, enabled: false },
          gender: { ...prev.demographicQuestions.gender, enabled: false },
          educationLevel: { ...prev.demographicQuestions.educationLevel, enabled: false },
          householdIncome: { ...prev.demographicQuestions.householdIncome, enabled: false },
          employmentStatus: { ...prev.demographicQuestions.employmentStatus, enabled: false },
          dailyHoursOnline: { ...prev.demographicQuestions.dailyHoursOnline, enabled: false },
          technicalProficiency: { ...prev.demographicQuestions.technicalProficiency, enabled: false }
        }
      }));
    }
    setDemographicQuestionsEnabledState(enabled);
  }, []);

  // Actualizar el handler de linkConfigEnabled
  const setLinkConfigEnabled = useCallback((enabled: boolean) => {
    if (!enabled) {
      // Desactivar todas las opciones de configuración del enlace
      setFormData(prev => ({
        ...prev,
        linkConfig: {
          allowMobile: false,
          trackLocation: false,
          allowMultipleAttempts: false,
          showProgressBar: false
        }
      }));
    }
    setLinkConfigEnabledState(enabled);
  }, []);

  // Función auxiliar para crear una configuración predeterminada
  const createDefaultConfig = (researchId: string) => {
    // 🎯 DETECTAR ENTORNO AUTOMÁTICAMENTE
    const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const publicTestsBaseUrl = isDevelopment 
      ? 'http://localhost:5173'  // 🏠 DESARROLLO LOCAL
      : 'https://d35071761848hm.cloudfront.net'; // 🌐 PRODUCCIÓN - URL CORRECTA
    
    // 🎯 GENERAR PARTICIPANT ID ÚNICO PARA QUE LOS DATOS SE GUARDEN
    // Si no hay participantId, se activa modo preview y los datos no se guardan
    const participantId = `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const generatedUrl = `${publicTestsBaseUrl}/?researchId=${researchId}&participantId=${participantId}`;

    const defaultConfig = {
      ...DEFAULT_CONFIG,
      researchId,
      researchUrl: generatedUrl
    };

    // Actualizar el estado del formulario
    setFormData(defaultConfig);

    return defaultConfig;
  };

  return {
    // Estados del formulario
    loading,
    saving,
    formData,
    stats,
    setFormData,

    // 🎯 NUEVOS ESTADOS PARA FEEDBACK VISUAL OPTIMISTA
    lastSaved,
    hasUnsavedChanges,

    // Estados para los switches principales
    demographicQuestionsEnabled,
    setDemographicQuestionsEnabled,
    linkConfigEnabled,
    setLinkConfigEnabled,

    // Estados para los modales
    modalError,
    modalVisible,
    showConfirmModal: false,
    apiErrors,

    // Métodos para los modales
    closeModal,

    // Nuevos estados para QR
    qrCodeData,
    showQRModal,
    closeQRModal,

    // Métodos del formulario
    handleDemographicChange,
    handleDemographicRequired,
    handleLinkConfigChange,
    handleBacklinkChange,
    handleParamOptionChange,
    setLimitParticipants,
    setParticipantLimit,
    updateAgeOptions,
    updateDisqualifyingAges,
    updateCountryOptions,
    updateDisqualifyingCountries,
    updatePriorityCountries,
    updateGenderOptions,
    updateDisqualifyingGenders,
    updateEducationOptions,
    updateDisqualifyingEducation,
    updateHouseholdIncomeOptions,
    updateDisqualifyingHouseholdIncomes,
    updateEmploymentStatusOptions,
    updateDisqualifyingEmploymentStatuses,
    updateDailyHoursOnlineOptions,
    updateDisqualifyingDailyHoursOnline,
    updateTechnicalProficiencyOptions,
    updateDisqualifyingTechnicalProficiencies,

    // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE EDAD CON CUOTAS
    handleAgeConfigSave,
    handleAgeQuotasSave,
    toggleAgeQuotasEnabled,

    // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE PAÍS CON CUOTAS
    handleCountryQuotasSave,
    toggleCountryQuotasEnabled,

    // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE GÉNERO CON CUOTAS
    handleGenderQuotasSave,
    toggleGenderQuotasEnabled,

    // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE NIVEL DE EDUCACIÓN CON CUOTAS
    handleEducationLevelQuotasSave,
    toggleEducationLevelQuotasEnabled,

    // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE INGRESOS FAMILIARES CON CUOTAS
    handleHouseholdIncomeQuotasSave,
    toggleHouseholdIncomeQuotasEnabled,

    // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE SITUACIÓN LABORAL CON CUOTAS
    handleEmploymentStatusQuotasSave,
    toggleEmploymentStatusQuotasEnabled,

    // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE HORAS DIARIAS EN LÍNEA CON CUOTAS
    handleDailyHoursOnlineQuotasSave,
    toggleDailyHoursOnlineQuotasEnabled,

    // 🎯 NUEVAS FUNCIONES PARA MANEJAR CONFIGURACIÓN DE COMPETENCIA TÉCNICA CON CUOTAS
    handleTechnicalProficiencyQuotasSave,
    toggleTechnicalProficiencyQuotasEnabled,

    // Acciones
    saveForm,
    handleConfirmSave,
    generateRecruitmentLink,
    generateQRCode,
    copyLinkToClipboard
  };
}
