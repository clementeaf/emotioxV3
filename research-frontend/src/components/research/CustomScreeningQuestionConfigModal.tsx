/**
 * Modal de configuración para preguntas de filtrado custom
 *
 * Mismo patrón que HouseholdIncomeConfigModal pero con campo editable
 * para el nombre de la pregunta. Usa DemographicConfigModalBase.
 */

import { HelpCircle } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { DemographicConfigModalBase } from './demographic-config/DemographicConfigModalBase';
import type {
  BaseDemographicOption,
  BaseDemographicQuota
} from './demographic-config/types';

interface ScreeningOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface ScreeningQuota {
  id: string;
  optionValue: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface CustomScreeningQuestionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (questionLabel: string, options: ScreeningOption[], disqualified: string[]) => void;
  onQuotasSave?: (quotas: ScreeningQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  /** Current question label (editable by researcher) */
  questionLabel?: string;
  currentOptions?: ScreeningOption[];
  currentDisqualified?: string[];
  initialQuotas?: ScreeningQuota[];
  quotasEnabled?: boolean;
}

const DEFAULT_OPTIONS: ScreeningOption[] = [
  { id: 'opt-1', name: 'Option 1', isQualified: true },
  { id: 'opt-2', name: 'Option 2', isQualified: true },
];

function mapOptionToBase(option: ScreeningOption): BaseDemographicOption {
  return {
    id: option.id,
    label: option.name,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapBaseToOption(option: BaseDemographicOption): ScreeningOption {
  return {
    id: option.id,
    name: option.label,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapQuotaToBase(quota: ScreeningQuota): BaseDemographicQuota<string> {
  return {
    id: quota.id,
    field: quota.optionValue,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

function mapBaseToQuota(quota: BaseDemographicQuota<string>): ScreeningQuota {
  return {
    id: quota.id,
    optionValue: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

export const CustomScreeningQuestionConfigModal: React.FC<CustomScreeningQuestionConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  questionLabel: initialLabel = '',
  currentOptions = DEFAULT_OPTIONS,
  currentDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false
}) => {
  const [label, setLabel] = useState(initialLabel);

  // Reset label when modal opens with new initial value
  useEffect(() => {
    if (isOpen) {
      setLabel(initialLabel);
    }
  }, [isOpen, initialLabel]);

  const baseOptions = useMemo(
    () => currentOptions.map(mapOptionToBase),
    [currentOptions]
  );

  const baseQuotas = useMemo(
    () => initialQuotas.map(mapQuotaToBase),
    [initialQuotas]
  );

  const handleSave = (
    qualifiedOptions: BaseDemographicOption[],
    disqualifiedIds: string[]
  ) => {
    const options = qualifiedOptions.map(mapBaseToOption);
    onSave(label.trim() || 'Screening Question', options, disqualifiedIds);
  };

  const handleQuotasSave = (quotas: BaseDemographicQuota<string>[]) => {
    if (onQuotasSave) {
      onQuotasSave(quotas.map(mapBaseToQuota));
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

  const title = label.trim() || 'New screening question';

  return (
    <DemographicConfigModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={`Configure: ${title}`}
      optionsTabLabel="Options"
      quotasTabLabel="Dynamic Quotas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Add custom option"
      statisticsLabel="Qualifying options"
      quotasTitle="Quota System"
      quotasDescription="Configure quotas per option. When a quota is full, the participant gets marked as over-quota."
      quotasInfoTitle="How quotas work:"
      quotasInfoItems={[
        'Each option can have a percentage (%) quota based on participant limit',
        'The system increments the counter when demographics are validated',
        'When the quota is full, the participant is blocked',
        'Options without a quota have no limit'
      ]}
      quotasDisabledMessage="Enable the quota system to set limits per option"
      quotasDisabledInfoTitle="Note: Natural distribution"
      quotasDisabledInfoText={[
        'Qualification/disqualification filters from the Options tab remain active.',
        'Without quotas, distribution across qualifying options is by natural arrival order.',
        'Enable quotas for controlled distribution.'
      ]}
      validationMessage="You must have at least one qualifying option."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Option"
      QuotasIcon={HelpCircle}
      headerContent={
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Question name</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. What level of knowledge do you have?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            This name will be shown to the participant as the question label.
          </p>
        </div>
      }
    />
  );
};

export default CustomScreeningQuestionConfigModal;
