/**
 * Modal de configuración de competencia técnica
 * 
 * Refactorizado para usar DemographicConfigModalBase,
 * reduciendo código duplicado mientras mantiene 100% compatibilidad.
 */

import { Code } from 'lucide-react';
import React, { useMemo } from 'react';
import { DemographicConfigModalBase } from './demographic-config/DemographicConfigModalBase';
import type {
  BaseDemographicOption,
  BaseDemographicQuota
} from './demographic-config/types';

interface ProficiencyOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface TechnicalProficiencyQuota {
  id: string;
  proficiencyLevel: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface TechnicalProficiencyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: ProficiencyOption[], disqualified: string[]) => void;
  onQuotasSave?: (quotas: TechnicalProficiencyQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  currentOptions?: ProficiencyOption[];
  currentDisqualified?: string[];
  initialQuotas?: TechnicalProficiencyQuota[];
  quotasEnabled?: boolean;
  headerContent?: React.ReactNode;
}

const DEFAULT_PROFICIENCY_LEVELS: ProficiencyOption[] = [
  { id: 'basico', name: 'Básico', isQualified: true },
  { id: 'intermedio', name: 'Intermedio', isQualified: true },
  { id: 'profesional', name: 'Profesional', isQualified: true },
  { id: 'experto', name: 'Experto', isQualified: true }
];

function mapProficiencyOptionToBase(option: ProficiencyOption): BaseDemographicOption {
  return {
    id: option.id,
    label: option.name,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapBaseToProficiencyOption(option: BaseDemographicOption): ProficiencyOption {
  return {
    id: option.id,
    name: option.label,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapProficiencyQuotaToBase(quota: TechnicalProficiencyQuota): BaseDemographicQuota<string> {
  return {
    id: quota.id,
    field: quota.proficiencyLevel,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

function mapBaseToProficiencyQuota(quota: BaseDemographicQuota<string>): TechnicalProficiencyQuota {
  return {
    id: quota.id,
    proficiencyLevel: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

export const TechnicalProficiencyConfigModal: React.FC<TechnicalProficiencyConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  currentOptions = DEFAULT_PROFICIENCY_LEVELS,
  currentDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false,
  headerContent
}) => {
  const baseOptions = useMemo(
    () => currentOptions.map(mapProficiencyOptionToBase),
    [currentOptions]
  );

  const baseQuotas = useMemo(
    () => initialQuotas.map(mapProficiencyQuotaToBase),
    [initialQuotas]
  );

  const handleSave = (
    qualifiedOptions: BaseDemographicOption[],
    disqualifiedIds: string[]
  ) => {
    const proficiencyOptions = qualifiedOptions.map(mapBaseToProficiencyOption);
    onSave(proficiencyOptions, disqualifiedIds);
  };

  const handleQuotasSave = (quotas: BaseDemographicQuota<string>[]) => {
    if (onQuotasSave) {
      const proficiencyQuotas = quotas.map(mapBaseToProficiencyQuota);
      onQuotasSave(proficiencyQuotas);
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
      title="Configure Technical Proficiency"
      optionsTabLabel="Proficiency Options"
      quotasTabLabel="Dynamic Quotas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Add custom proficiency level"
      statisticsLabel="Qualified levels"
      quotasTitle="Technical Proficiency Quota System"
      quotasDescription="Configure specific quotas per proficiency level. When a level's quota is full, overquota applies, not disqualification by profile rules."
      quotasInfoTitle="How quotas work:"
      quotasInfoItems={[
        'Each proficiency level can have its own quota as a percentage (%) of the participant limit',
        'The percentage is calculated based on the participant limit configured in the study',
        'The system increments the counter when validating demographics',
        'When the quota is full, the participant is placed in overquota upon submitting demographics (overquota link if configured)',
        'Levels without assigned quota: If an enabled level has no configured quota, NO limit will be applied and it can receive participants without restriction'
      ]}
      quotasDisabledMessage="Enable the quota system to configure limits per proficiency level"
      quotasDisabledInfoTitle="Important: Distribution by 'natural falloff'"
      quotasDisabledInfoText={[
        'The previous proficiency filters (valid and disqualifying options) configured in the "Proficiency Options" tab will remain active.',
        'However, if you do not enable this section, participant distribution within valid levels will be by "natural falloff" (first-come), which does not guarantee specific quotas per proficiency level will be met.',
        'To ensure a controlled distribution with specific quotas per proficiency level, enable the dynamic quota system.'
      ]}
      validationMessage="You must have at least one qualified proficiency level for participants to be able to participate."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Proficiency Level"
      QuotasIcon={Code}
      headerContent={headerContent}
    />
  );
};

export default TechnicalProficiencyConfigModal;
