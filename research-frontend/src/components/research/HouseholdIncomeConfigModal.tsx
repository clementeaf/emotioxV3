/**
 * Modal de configuración de ingresos familiares
 * 
 * Refactorizado para usar DemographicConfigModalBase,
 * reduciendo código duplicado mientras mantiene 100% compatibilidad.
 */

import { DollarSign } from 'lucide-react';
import React, { useMemo } from 'react';
import { DemographicConfigModalBase } from './demographic-config/DemographicConfigModalBase';
import type {
  BaseDemographicOption,
  BaseDemographicQuota
} from './demographic-config/types';

interface IncomeOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface HouseholdIncomeQuota {
  id: string;
  incomeLevel: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface HouseholdIncomeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: IncomeOption[], disqualified: string[]) => void;
  onQuotasSave?: (quotas: HouseholdIncomeQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  currentOptions?: IncomeOption[];
  currentDisqualified?: string[];
  initialQuotas?: HouseholdIncomeQuota[];
  quotasEnabled?: boolean;
  headerContent?: React.ReactNode;
}

const DEFAULT_INCOME_LEVELS: IncomeOption[] = [
  { id: 'nivel-1', name: 'Menos de 20.000€', isQualified: true },
  { id: 'nivel-2', name: '20.000€ - 40.000€', isQualified: true },
  { id: 'nivel-3', name: '40.000€ - 60.000€', isQualified: true },
  { id: 'nivel-4', name: '60.000€ - 80.000€', isQualified: true },
  { id: 'nivel-5', name: 'Más de 80.000€', isQualified: true }
];

function mapIncomeOptionToBase(option: IncomeOption): BaseDemographicOption {
  return {
    id: option.id,
    label: option.name,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapBaseToIncomeOption(option: BaseDemographicOption): IncomeOption {
  return {
    id: option.id,
    name: option.label,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapIncomeQuotaToBase(quota: HouseholdIncomeQuota): BaseDemographicQuota<string> {
  return {
    id: quota.id,
    field: quota.incomeLevel,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

function mapBaseToIncomeQuota(quota: BaseDemographicQuota<string>): HouseholdIncomeQuota {
  return {
    id: quota.id,
    incomeLevel: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

export const HouseholdIncomeConfigModal: React.FC<HouseholdIncomeConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  currentOptions = DEFAULT_INCOME_LEVELS,
  currentDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false,
  headerContent
}) => {
  const baseOptions = useMemo(
    () => currentOptions.map(mapIncomeOptionToBase),
    [currentOptions]
  );

  const baseQuotas = useMemo(
    () => initialQuotas.map(mapIncomeQuotaToBase),
    [initialQuotas]
  );

  const handleSave = (
    qualifiedOptions: BaseDemographicOption[],
    disqualifiedIds: string[]
  ) => {
    const incomeOptions = qualifiedOptions.map(mapBaseToIncomeOption);
    onSave(incomeOptions, disqualifiedIds);
  };

  const handleQuotasSave = (quotas: BaseDemographicQuota<string>[]) => {
    if (onQuotasSave) {
      const incomeQuotas = quotas.map(mapBaseToIncomeQuota);
      onQuotasSave(incomeQuotas);
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
      title="Configure Household Income"
      optionsTabLabel="Income Options"
      quotasTabLabel="Dynamic Quotas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Add custom income level"
      statisticsLabel="Qualified levels"
      quotasTitle="Household Income Quota System"
      quotasDescription="Configure specific quotas per income level. When a level's quota is full, overquota applies, not disqualification by profile rules."
      quotasInfoTitle="How quotas work:"
      quotasInfoItems={[
        'Each income level can have its own quota as a percentage (%) of the participant limit',
        'The percentage is calculated based on the participant limit configured in the study',
        'The system increments the counter when validating demographics',
        'When the quota is full, the participant is placed in overquota upon submitting demographics (overquota link if configured)',
        'Levels without assigned quota: If an enabled level has no configured quota, NO limit will be applied and it can receive participants without restriction'
      ]}
      quotasDisabledMessage="Enable the quota system to configure limits per income level"
      quotasDisabledInfoTitle="Important: Distribution by 'natural falloff'"
      quotasDisabledInfoText={[
        'The previous income filters (valid and disqualifying options) configured in the "Income Options" tab will remain active.',
        'However, if you do not enable this section, participant distribution within valid levels will be by "natural falloff" (first-come), which does not guarantee specific quotas per income level will be met.',
        'To ensure a controlled distribution with specific quotas per income level, enable the dynamic quota system.'
      ]}
      validationMessage="You must have at least one qualified income level for participants to be able to participate."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Income Level"
      QuotasIcon={DollarSign}
      headerContent={headerContent}
    />
  );
};

export default HouseholdIncomeConfigModal;
