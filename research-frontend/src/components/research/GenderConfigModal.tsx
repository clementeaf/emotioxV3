/**
 * Modal de configuración de géneros
 * 
 * Refactorizado para usar DemographicConfigModalBase,
 * reduciendo código duplicado mientras mantiene 100% compatibilidad.
 */

import React, { useMemo } from 'react';
import { DemographicConfigModalBase } from './demographic-config/DemographicConfigModalBase';
import type {
  BaseDemographicOption,
  BaseDemographicQuota
} from './demographic-config/types';

interface GenderOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface GenderQuota {
  id: string;
  gender: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface GenderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: GenderOption[], disqualified: string[]) => void;
  onQuotasSave?: (quotas: GenderQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  currentOptions?: GenderOption[];
  currentDisqualified?: string[];
  initialQuotas?: GenderQuota[];
  quotasEnabled?: boolean;
  headerContent?: React.ReactNode;
}

const DEFAULT_GENDERS: GenderOption[] = [
  { id: 'masculino', name: 'Masculino', isQualified: true },
  { id: 'femenino', name: 'Femenino', isQualified: true },
  { id: 'prefiero-no-especificar', name: 'Prefiero no especificar', isQualified: true }
];

/**
 * Mapea GenderOption a BaseDemographicOption
 */
function mapGenderOptionToBase(option: GenderOption): BaseDemographicOption {
  return {
    id: option.id,
    label: option.name,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

/**
 * Mapea BaseDemographicOption a GenderOption
 */
function mapBaseToGenderOption(option: BaseDemographicOption): GenderOption {
  return {
    id: option.id,
    name: option.label,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

/**
 * Mapea GenderQuota a BaseDemographicQuota
 */
function mapGenderQuotaToBase(quota: GenderQuota): BaseDemographicQuota<string> {
  return {
    id: quota.id,
    field: quota.gender,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

/**
 * Mapea BaseDemographicQuota a GenderQuota
 */
function mapBaseToGenderQuota(quota: BaseDemographicQuota<string>): GenderQuota {
  return {
    id: quota.id,
    gender: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

export const GenderConfigModal: React.FC<GenderConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  currentOptions = DEFAULT_GENDERS,
  currentDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false,
  headerContent
}) => {
  const baseOptions = useMemo(
    () => currentOptions.map(mapGenderOptionToBase),
    [currentOptions]
  );

  const baseQuotas = useMemo(
    () => initialQuotas.map(mapGenderQuotaToBase),
    [initialQuotas]
  );

  const handleSave = (
    qualifiedOptions: BaseDemographicOption[],
    disqualifiedIds: string[]
  ) => {
    const genderOptions = qualifiedOptions.map(mapBaseToGenderOption);
    onSave(genderOptions, disqualifiedIds);
  };

  const handleQuotasSave = (quotas: BaseDemographicQuota<string>[]) => {
    if (onQuotasSave) {
      const genderQuotas = quotas.map(mapBaseToGenderQuota);
      onQuotasSave(genderQuotas);
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
      title="Configure Genders"
      optionsTabLabel="Gender Options"
      quotasTabLabel="Dynamic Quotas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Add custom gender"
      statisticsLabel="Qualified genders"
      quotasTitle="Gender Quota System"
      quotasDescription="Configure specific quotas per gender. When a value's quota is full, overquota applies, not disqualification by profile rules."
      quotasInfoTitle="How quotas work:"
      quotasInfoItems={[
        'Each gender can have its own quota as a percentage (%) of the participant limit',
        'The percentage is calculated based on the participant limit configured in the study',
        'The system increments the counter when validating demographics',
        'When the quota is full, the participant is placed in overquota upon submitting demographics (overquota link if configured)',
        'Genders without assigned quota: If an enabled gender has no configured quota, NO limit will be applied and it can receive participants without restriction'
      ]}
      quotasDisabledMessage="Enable the quota system to configure limits per gender"
      quotasDisabledInfoTitle="Important: Distribution by 'natural falloff'"
      quotasDisabledInfoText={[
        'The previous gender filters (valid and disqualifying options) configured in the "Gender Options" tab will remain active.',
        'However, if you do not enable this section, participant distribution within valid genders will be by "natural falloff" (first-come), which does not guarantee specific quotas per gender will be met.',
        'To ensure a controlled distribution with specific quotas per gender, enable the dynamic quota system.'
      ]}
      validationMessage="You must have at least one qualified gender for participants to be able to participate."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Gender"
      headerContent={headerContent}
    />
  );
};

export default GenderConfigModal;
