/**
 * Interfaces estrictas para ThankYouScreenComponent
 */

export interface EyeTrackingConfig {
  parameterOptions?: {
    saveDeviceInfo?: boolean;
    saveLocationInfo?: boolean;
  };
  backlinks?: {
    complete?: string;
    disqualified?: string;
    overquota?: string;
  };
}

export interface QuotaResult {
  demographicType?: string;
  demographicValue?: string;
  quotaLimit?: number;
  order?: number;
}

export interface ContentConfiguration {
  title?: string;
  message?: string;
}

export interface ThankYouScreenProps {
  contentConfiguration: ContentConfiguration;
  currentQuestionKey: string;
  quotaResult?: QuotaResult;
  eyeTrackingConfig?: EyeTrackingConfig;
}

export interface DisqualifiedScreenProps {
  eyeTrackingConfig: EyeTrackingConfig;
}

export interface OverQuotaScreenProps {
  quotaResult: QuotaResult;
  eyeTrackingConfig: EyeTrackingConfig;
}

export interface SuccessScreenProps {
  contentConfiguration: ContentConfiguration;
  eyeTrackingConfig?: EyeTrackingConfig;
}

export interface UseThankYouScreenProps {
  currentQuestionKey: string;
  researchId?: string;
  participantId?: string;
  eyeTrackingConfig?: EyeTrackingConfig;
}
