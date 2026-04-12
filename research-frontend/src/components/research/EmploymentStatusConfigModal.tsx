/**
 * Modal de configuración de situación laboral
 * 
 * Refactorizado para usar DemographicConfigModalBase,
 * reduciendo código duplicado mientras mantiene 100% compatibilidad.
 */

import { Briefcase } from 'lucide-react';
import React, { useMemo } from 'react';
import { DemographicConfigModalBase } from './demographic-config/DemographicConfigModalBase';
import type {
  BaseDemographicOption,
  BaseDemographicQuota
} from './demographic-config/types';

interface EmploymentOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface EmploymentStatusQuota {
  id: string;
  employmentStatus: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface EmploymentStatusConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: EmploymentOption[], disqualified: string[]) => void;
  onQuotasSave?: (quotas: EmploymentStatusQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  currentOptions?: EmploymentOption[];
  currentDisqualified?: string[];
  initialQuotas?: EmploymentStatusQuota[];
  quotasEnabled?: boolean;
  headerContent?: React.ReactNode;
}

const DEFAULT_EMPLOYMENT_STATUSES: EmploymentOption[] = [
  { id: 'dependiente', name: 'Dependiente', isQualified: true },
  { id: 'independiente', name: 'Independiente', isQualified: true },
  { id: 'cesante', name: 'Cesante', isQualified: true },
  { id: 'jubilado', name: 'Jubilado', isQualified: true }
];

function mapEmploymentOptionToBase(option: EmploymentOption): BaseDemographicOption {
  return {
    id: option.id,
    label: option.name,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapBaseToEmploymentOption(option: BaseDemographicOption): EmploymentOption {
  return {
    id: option.id,
    name: option.label,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapEmploymentQuotaToBase(quota: EmploymentStatusQuota): BaseDemographicQuota<string> {
  return {
    id: quota.id,
    field: quota.employmentStatus,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

function mapBaseToEmploymentQuota(quota: BaseDemographicQuota<string>): EmploymentStatusQuota {
  return {
    id: quota.id,
    employmentStatus: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

export const EmploymentStatusConfigModal: React.FC<EmploymentStatusConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  currentOptions = DEFAULT_EMPLOYMENT_STATUSES,
  currentDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false,
  headerContent
}) => {
  const baseOptions = useMemo(
    () => currentOptions.map(mapEmploymentOptionToBase),
    [currentOptions]
  );

  const baseQuotas = useMemo(
    () => initialQuotas.map(mapEmploymentQuotaToBase),
    [initialQuotas]
  );

  const handleSave = (
    qualifiedOptions: BaseDemographicOption[],
    disqualifiedIds: string[]
  ) => {
    const employmentOptions = qualifiedOptions.map(mapBaseToEmploymentOption);
    onSave(employmentOptions, disqualifiedIds);
  };

  const handleQuotasSave = (quotas: BaseDemographicQuota<string>[]) => {
    if (onQuotasSave) {
      const employmentQuotas = quotas.map(mapBaseToEmploymentQuota);
      onQuotasSave(employmentQuotas);
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
      title="Configure Employment Status"
      optionsTabLabel="Employment Status Options"
      quotasTabLabel="Dynamic Quotas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Add custom employment status"
      statisticsLabel="Qualified statuses"
      quotasTitle="Employment Status Quota System"
      quotasDescription="Configure specific quotas per employment status. When a value's quota is full, overquota applies, not disqualification by profile rules."
      quotasInfoTitle="How quotas work:"
      quotasInfoItems={[
        'Each employment status can have its own quota as a percentage (%) of the participant limit',
        'The percentage is calculated based on the participant limit configured in the study',
        'The system increments the counter when validating demographics',
        'When the quota is full, the participant is placed in overquota upon submitting demographics (overquota link if configured)',
        'Statuses without assigned quota: If an enabled status has no configured quota, NO limit will be applied and it can receive participants without restriction'
      ]}
      quotasDisabledMessage="Enable the quota system to configure limits per employment status"
      quotasDisabledInfoTitle="Important: Distribution by 'natural falloff'"
      quotasDisabledInfoText={[
        'The previous employment status filters (valid and disqualifying options) configured in the "Employment Status Options" tab will remain active.',
        'However, if you do not enable this section, participant distribution within valid statuses will be by "natural falloff" (first-come), which does not guarantee specific quotas per employment status will be met.',
        'To ensure a controlled distribution with specific quotas per employment status, enable the dynamic quota system.'
      ]}
      validationMessage="You must have at least one qualified employment status for participants to be able to participate."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Employment Status"
      QuotasIcon={Briefcase}
      headerContent={headerContent}
    />
  );
};

export default EmploymentStatusConfigModal;
