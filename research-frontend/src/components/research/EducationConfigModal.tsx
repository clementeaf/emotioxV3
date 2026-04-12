/**
 * Modal de configuración de niveles educativos
 * 
 * Refactorizado para usar DemographicConfigModalBase,
 * reduciendo código duplicado mientras mantiene 100% compatibilidad.
 */

import { GraduationCap } from 'lucide-react';
import React, { useMemo } from 'react';
import { DemographicConfigModalBase } from './demographic-config/DemographicConfigModalBase';
import type {
  BaseDemographicOption,
  BaseDemographicQuota
} from './demographic-config/types';

interface EducationOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface EducationLevelQuota {
  id: string;
  educationLevel: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface EducationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: EducationOption[], disqualified: string[]) => void;
  onQuotasSave?: (quotas: EducationLevelQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  currentOptions?: EducationOption[];
  currentDisqualified?: string[];
  initialQuotas?: EducationLevelQuota[];
  quotasEnabled?: boolean;
  headerContent?: React.ReactNode;
}

const DEFAULT_EDUCATION_LEVELS: EducationOption[] = [
  { id: 'basica', name: 'Básica', isQualified: true },
  { id: 'media', name: 'Media', isQualified: true },
  { id: 'universitaria', name: 'Universitaria', isQualified: true },
  { id: 'maestria', name: 'Maestría', isQualified: true },
  { id: 'doctorado', name: 'Doctorado', isQualified: true }
];

function mapEducationOptionToBase(option: EducationOption): BaseDemographicOption {
  return {
    id: option.id,
    label: option.name,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapBaseToEducationOption(option: BaseDemographicOption): EducationOption {
  return {
    id: option.id,
    name: option.label,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapEducationQuotaToBase(quota: EducationLevelQuota): BaseDemographicQuota<string> {
  return {
    id: quota.id,
    field: quota.educationLevel,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

function mapBaseToEducationQuota(quota: BaseDemographicQuota<string>): EducationLevelQuota {
  return {
    id: quota.id,
    educationLevel: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

export const EducationConfigModal: React.FC<EducationConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  currentOptions = DEFAULT_EDUCATION_LEVELS,
  currentDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false,
  headerContent
}) => {
  const baseOptions = useMemo(
    () => currentOptions.map(mapEducationOptionToBase),
    [currentOptions]
  );

  const baseQuotas = useMemo(
    () => initialQuotas.map(mapEducationQuotaToBase),
    [initialQuotas]
  );

  const handleSave = (
    qualifiedOptions: BaseDemographicOption[],
    disqualifiedIds: string[]
  ) => {
    const educationOptions = qualifiedOptions.map(mapBaseToEducationOption);
    onSave(educationOptions, disqualifiedIds);
  };

  const handleQuotasSave = (quotas: BaseDemographicQuota<string>[]) => {
    if (onQuotasSave) {
      const educationQuotas = quotas.map(mapBaseToEducationQuota);
      onQuotasSave(educationQuotas);
    }
  };

  const getAvailableOptions = (options: BaseDemographicOption[]) => {
    return options.filter(option => option.isQualified);
  };

  const getQuotaFieldValue = (option: BaseDemographicOption) => {
    return option.label;
  };

  const getQuotaFieldLabel = (field: string) => {
    return field;
  };

  return (
    <DemographicConfigModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Education Levels"
      optionsTabLabel="Education Options"
      quotasTabLabel="Dynamic Quotas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Add custom education level"
      statisticsLabel="Qualified levels"
      quotasTitle="Education Level Quota System"
      quotasDescription="Configure specific quotas per education level. When a level's quota is full, overquota applies, not disqualification by profile rules."
      quotasInfoTitle="How quotas work:"
      quotasInfoItems={[
        'Each education level can have its own quota as a percentage (%) of the participant limit',
        'The percentage is calculated based on the participant limit configured in the study',
        'The system increments the counter when validating demographics',
        'When the quota is full, the participant is placed in overquota upon submitting demographics (overquota link if configured)',
        'Levels without assigned quota: If an enabled level has no configured quota, NO limit will be applied and it can receive participants without restriction'
      ]}
      quotasDisabledMessage="Enable the quota system to configure limits per education level"
      quotasDisabledInfoTitle="Important: Distribution by 'natural falloff'"
      quotasDisabledInfoText={[
        'The previous education level filters (valid and disqualifying options) configured in the "Education Options" tab will remain active.',
        'However, if you do not enable this section, participant distribution within valid education levels will be by "natural falloff" (first-come), which does not guarantee specific quotas per education level will be met.',
        'To ensure a controlled distribution with specific quotas per education level, enable the dynamic quota system.'
      ]}
      validationMessage="You must have at least one qualified education level for participants to be able to participate."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Education Level"
      QuotasIcon={GraduationCap}
      headerContent={headerContent}
    />
  );
};

export default EducationConfigModal;
