import {
  AgeQuota,
  CountryQuota,
  DailyHoursOnlineQuota,
  EducationLevelQuota,
  EmploymentStatusQuota,
  GenderQuota,
  HouseholdIncomeQuota,
  TechnicalProficiencyQuota,
} from 'shared/interfaces/eyeTrackingRecruit.interface';

// Form Data Types
export interface EyeTrackingRecruitFormData {
  id?: string;
  researchId: string;
  questionKey: string;
  demographicQuestions: {
    age: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingAges?: string[];
      quotas?: AgeQuota[];
      quotasEnabled?: boolean;
    };
    country: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingCountries?: string[];
      priorityCountries?: string[];
      quotas?: CountryQuota[];
      quotasEnabled?: boolean;
    };
    gender: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingGenders?: string[];
      quotas?: GenderQuota[];
      quotasEnabled?: boolean;
    };
    educationLevel: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingEducation?: string[];
      quotas?: EducationLevelQuota[];
      quotasEnabled?: boolean;
    };
    householdIncome: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingIncomes?: string[];
      quotas?: HouseholdIncomeQuota[];
      quotasEnabled?: boolean;
    };
    employmentStatus: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingEmploymentStatuses?: string[];
      quotas?: EmploymentStatusQuota[];
      quotasEnabled?: boolean;
    };
    dailyHoursOnline: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingHours?: string[];
      quotas?: DailyHoursOnlineQuota[];
      quotasEnabled?: boolean;
    };
    technicalProficiency: {
      enabled: boolean;
      required: boolean;
      options: string[];
      disqualifyingProficiencies?: string[];
      quotas?: TechnicalProficiencyQuota[];
      quotasEnabled?: boolean;
    };
  };
  linkConfig: {
    customUrl: {
      enabled: boolean;
      value: string;
    };
    expiry: {
      enabled: boolean;
      type: string;
      value: string;
      customDate?: string;
    };
    participantLimit: {
      enabled: boolean;
      value: number;
    };
    customScreeningUrl: {
      enabled: boolean;
      value: string;
    };
  };
  totalTargetParticipants: number;
  totalCompletedParticipants: number;
  totalScreenedOutParticipants: number;
  publicLink?: string;
  createdAt?: string;
  updatedAt?: string;
}