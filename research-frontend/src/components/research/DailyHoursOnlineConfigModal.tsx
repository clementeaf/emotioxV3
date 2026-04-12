/**
 * Modal de configuración de horas diarias en línea
 * 
 * Refactorizado para usar DemographicConfigModalBase,
 * reduciendo código duplicado mientras mantiene 100% compatibilidad.
 */

import { Clock } from 'lucide-react';
import React, { useMemo } from 'react';
import { DemographicConfigModalBase } from './demographic-config/DemographicConfigModalBase';
import type {
  BaseDemographicOption,
  BaseDemographicQuota
} from './demographic-config/types';

interface HoursOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface DailyHoursOnlineQuota {
  id: string;
  hoursRange: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface DailyHoursOnlineConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: HoursOption[], disqualified: string[]) => void;
  onQuotasSave?: (quotas: DailyHoursOnlineQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  currentOptions?: HoursOption[];
  currentDisqualified?: string[];
  initialQuotas?: DailyHoursOnlineQuota[];
  quotasEnabled?: boolean;
  headerContent?: React.ReactNode;
}

const DEFAULT_HOURS_RANGES: HoursOption[] = [
  { id: '0-2', name: '0-2 horas', isQualified: true },
  { id: '2-4', name: '2-4 horas', isQualified: true },
  { id: '4-6', name: '4-6 horas', isQualified: true },
  { id: '6-8', name: '6-8 horas', isQualified: true },
  { id: '8+', name: 'Más de 8 horas', isQualified: true }
];

function mapHoursOptionToBase(option: HoursOption): BaseDemographicOption {
  return {
    id: option.id,
    label: option.name,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapBaseToHoursOption(option: BaseDemographicOption): HoursOption {
  return {
    id: option.id,
    name: option.label,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapHoursQuotaToBase(quota: DailyHoursOnlineQuota): BaseDemographicQuota<string> {
  return {
    id: quota.id,
    field: quota.hoursRange,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

function mapBaseToHoursQuota(quota: BaseDemographicQuota<string>): DailyHoursOnlineQuota {
  return {
    id: quota.id,
    hoursRange: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

export const DailyHoursOnlineConfigModal: React.FC<DailyHoursOnlineConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  currentOptions = DEFAULT_HOURS_RANGES,
  currentDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false,
  headerContent
}) => {
  const baseOptions = useMemo(
    () => currentOptions.map(mapHoursOptionToBase),
    [currentOptions]
  );

  const baseQuotas = useMemo(
    () => initialQuotas.map(mapHoursQuotaToBase),
    [initialQuotas]
  );

  const handleSave = (
    qualifiedOptions: BaseDemographicOption[],
    disqualifiedIds: string[]
  ) => {
    const hoursOptions = qualifiedOptions.map(mapBaseToHoursOption);
    onSave(hoursOptions, disqualifiedIds);
  };

  const handleQuotasSave = (quotas: BaseDemographicQuota<string>[]) => {
    if (onQuotasSave) {
      const hoursQuotas = quotas.map(mapBaseToHoursQuota);
      onQuotasSave(hoursQuotas);
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
      title="Configure Daily Hours Online"
      optionsTabLabel="Hours Options"
      quotasTabLabel="Dynamic Quotas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Add custom hours range"
      statisticsLabel="Qualified ranges"
      quotasTitle="Daily Hours Online Quota System"
      quotasDescription="Configure specific quotas per hours range. When a range's quota is full, overquota applies, not disqualification by profile rules."
      quotasInfoTitle="How quotas work:"
      quotasInfoItems={[
        'Each hours range can have its own quota as a percentage (%) of the participant limit',
        'The percentage is calculated based on the participant limit configured in the study',
        'The system increments the counter when validating demographics',
        'When the quota is full, the participant is placed in overquota upon submitting demographics (overquota link if configured)',
        'Ranges without assigned quota: If an enabled range has no configured quota, NO limit will be applied and it can receive participants without restriction'
      ]}
      quotasDisabledMessage="Enable the quota system to configure limits per hours range"
      quotasDisabledInfoTitle="Important: Distribution by 'natural falloff'"
      quotasDisabledInfoText={[
        'The previous hours filters (valid and disqualifying options) configured in the "Hours Options" tab will remain active.',
        'However, if you do not enable this section, participant distribution within valid ranges will be by "natural falloff" (first-come), which does not guarantee specific quotas per hours range will be met.',
        'To ensure a controlled distribution with specific quotas per hours range, enable the dynamic quota system.'
      ]}
      validationMessage="You must have at least one qualified hours range for participants to be able to participate."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Hours Range"
      QuotasIcon={Clock}
      headerContent={headerContent}
    />
  );
};

export default DailyHoursOnlineConfigModal;
