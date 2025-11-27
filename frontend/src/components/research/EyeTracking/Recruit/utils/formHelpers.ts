import { 
  DemographicQuestionKeys, 
  LinkConfigKeys,
  ParameterOptionKeys 
} from 'shared/interfaces/eyeTrackingRecruit.interface';
import { EyeTrackingRecruitFormData } from '../types/formData.types';

// Form Helpers and Utilities
export const createInitialFormData = (researchId: string): EyeTrackingRecruitFormData => ({
  researchId,
  questionKey: '',
  demographicQuestions: {
    age: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingAges: [],
      quotas: [],
      quotasEnabled: false,
    },
    country: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingCountries: [],
      quotas: [],
      quotasEnabled: false,
    },
    gender: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingGenders: [],
      quotas: [],
      quotasEnabled: false,
    },
    educationLevel: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingEducation: [],
      quotas: [],
      quotasEnabled: false,
    },
    householdIncome: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingIncomes: [],
      quotas: [],
      quotasEnabled: false,
    },
    employmentStatus: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingEmploymentStatuses: [],
      quotas: [],
      quotasEnabled: false,
    },
    dailyHoursOnline: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingHours: [],
      quotas: [],
      quotasEnabled: false,
    },
    technicalProficiency: {
      enabled: false,
      required: false,
      options: [],
      disqualifyingProficiencies: [],
      quotas: [],
      quotasEnabled: false,
    },
  },
  linkConfig: {
    customUrl: {
      enabled: false,
      value: '',
    },
    expiry: {
      enabled: false,
      type: '7days',
      value: '7',
      customDate: '',
    },
    participantLimit: {
      enabled: false,
      value: 100,
    },
    customScreeningUrl: {
      enabled: false,
      value: '',
    },
  },
  totalTargetParticipants: 0,
  totalCompletedParticipants: 0,
  totalScreenedOutParticipants: 0,
  publicLink: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const transformFormDataToAPI = (formData: EyeTrackingRecruitFormData) => {
  const demographicQuestions: Record<string, unknown> = {};

  // Transform demographic questions
  Object.entries(formData.demographicQuestions).forEach(([key, value]) => {
    if (value.enabled) {
      demographicQuestions[key] = {
        enabled: value.enabled,
        required: value.required,
        options: value.options || [],
        ...(value.quotasEnabled && { 
          quotas: value.quotas || [],
          quotasEnabled: true 
        }),
      };

      // Add disqualifying options based on key
      const disqualifyingKey = `disqualifying${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const disqualifyingValue = (value as Record<string, unknown>)[disqualifyingKey];
      if (disqualifyingValue && Array.isArray(disqualifyingValue) && disqualifyingValue.length > 0) {
        (demographicQuestions[key] as Record<string, unknown>)[disqualifyingKey] = disqualifyingValue;
      }
    }
  });

  // Transform link config
  const linkConfig: Record<string, unknown> = {};
  if (formData.linkConfig.customUrl.enabled) {
    linkConfig.customUrl = formData.linkConfig.customUrl.value;
  }
  if (formData.linkConfig.expiry.enabled) {
    linkConfig.expiry = {
      type: formData.linkConfig.expiry.type,
      value: formData.linkConfig.expiry.value,
      ...(formData.linkConfig.expiry.type === 'custom' && {
        customDate: formData.linkConfig.expiry.customDate,
      }),
    };
  }
  if (formData.linkConfig.participantLimit.enabled) {
    linkConfig.participantLimit = formData.linkConfig.participantLimit.value;
  }
  if (formData.linkConfig.customScreeningUrl.enabled) {
    linkConfig.customScreeningUrl = formData.linkConfig.customScreeningUrl.value;
  }

  return {
    researchId: formData.researchId,
    demographicQuestions,
    linkConfig,
    totalTargetParticipants: formData.totalTargetParticipants,
  };
};

export const transformAPIToFormData = (apiData: Record<string, unknown>): Partial<EyeTrackingRecruitFormData> => {
  const formData: Partial<EyeTrackingRecruitFormData> = {
    id: apiData.id as string,
    researchId: apiData.researchId as string,
    totalTargetParticipants: apiData.totalTargetParticipants as number || 0,
    totalCompletedParticipants: apiData.totalCompletedParticipants as number || 0,
    totalScreenedOutParticipants: apiData.totalScreenedOutParticipants as number || 0,
    publicLink: apiData.publicLink as string,
    createdAt: apiData.createdAt as string,
    updatedAt: apiData.updatedAt as string,
  };

  // Transform demographic questions
  if (apiData.demographicQuestions) {
    formData.demographicQuestions = {} as EyeTrackingRecruitFormData['demographicQuestions'];
    
    const questions = apiData.demographicQuestions as Record<string, unknown>;
    Object.keys(questions).forEach((key) => {
      const question = questions[key] as Record<string, unknown>;
      (formData.demographicQuestions as Record<string, unknown>)[key] = {
        enabled: true,
        required: question.required || false,
        options: question.options || [],
        quotas: question.quotas || [],
        quotasEnabled: !!question.quotasEnabled,
      };

      // Handle disqualifying options
      const disqualifyingKey = `disqualifying${key.charAt(0).toUpperCase() + key.slice(1)}`;
      if (question[disqualifyingKey]) {
        ((formData.demographicQuestions as Record<string, unknown>)[key] as Record<string, unknown>)[disqualifyingKey] = 
          question[disqualifyingKey];
      }
    });
  }

  // Transform link config
  if (apiData.linkConfig) {
    const linkConfig = apiData.linkConfig as Record<string, unknown>;
    formData.linkConfig = {
      customUrl: {
        enabled: !!linkConfig.customUrl,
        value: linkConfig.customUrl as string || '',
      },
      expiry: {
        enabled: !!linkConfig.expiry,
        type: (linkConfig.expiry as Record<string, unknown>)?.type as string || '7days',
        value: (linkConfig.expiry as Record<string, unknown>)?.value as string || '7',
        customDate: (linkConfig.expiry as Record<string, unknown>)?.customDate as string,
      },
      participantLimit: {
        enabled: linkConfig.participantLimit !== undefined,
        value: linkConfig.participantLimit as number || 100,
      },
      customScreeningUrl: {
        enabled: !!linkConfig.customScreeningUrl,
        value: linkConfig.customScreeningUrl as string || '',
      },
    };
  }

  return formData;
};