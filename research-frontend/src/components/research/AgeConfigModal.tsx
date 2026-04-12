/**
 * Modal de configuración de edad
 * 
 * Refactorizado para usar DemographicConfigModalBase con tab personalizado,
 * ya que maneja isEnabled e isDisqualifying separados (diferente a otros modales).
 */

import { Target, Users } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import React, { useEffect, useMemo, useState } from 'react';
import { AgeOptionsTab } from './demographic-config/AgeOptionsTab';
import { QuotasTab } from './demographic-config/QuotasTab';
import type { BaseDemographicQuota, BaseDemographicOption } from './demographic-config/types';
import { useQuotaManagement } from './demographic-config/useQuotaManagement';

interface AgeOption {
  id: string;
  label: string;
  isDisqualifying: boolean;
  isEnabled: boolean;
  isEditing?: boolean;
}

interface AgeQuota {
  id: string;
  ageRange: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface AgeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Fourth argument is modal-format quotas for this save (empty when quotas system is off).
   * Passed into mapModalConfigToBackend so quotas persist in one onChange (no flush race).
   */
  onSave: (validAges: string[], disqualifyingAges: string[], orderedAll: string[], quotas: AgeQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  initialValidAges?: string[];
  initialDisqualifyingAges?: string[];
  /** Ordered list of all enabled options (qualifying + disqualifying) to preserve researcher order on reopen */
  initialOrder?: string[];
  initialQuotas?: AgeQuota[];
  quotasEnabled?: boolean;
}

const PREDEFINED_OPTIONS = [
  { label: '18-24', id: '18-24' },
  { label: '25-34', id: '25-34' },
  { label: '35-44', id: '35-44' },
  { label: '45-54', id: '45-54' },
  { label: '55-64', id: '55-64' },
  { label: '65+', id: '65+' }
];

function mapAgeQuotaToBase(quota: AgeQuota): BaseDemographicQuota<string> {
  return {
    id: quota.id,
    field: quota.ageRange,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

function mapBaseToAgeQuota(quota: BaseDemographicQuota<string>): AgeQuota {
  return {
    id: quota.id,
    ageRange: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

const AgeConfigModal: React.FC<AgeConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasToggle,
  initialValidAges = [],
  initialDisqualifyingAges = [],
  initialOrder,
  initialQuotas = [],
  quotasEnabled = false
}) => {
  const [ageOptions, setAgeOptions] = useState<AgeOption[]>([]);
  const [newOption, setNewOption] = useState('');
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'options' | 'quotas'>('options');

  const baseQuotas = useMemo(
    () => initialQuotas.map(mapAgeQuotaToBase),
    [initialQuotas]
  );

  const quotaConfig = useQuotaManagement<BaseDemographicQuota<string>>(
    baseQuotas,
    quotasEnabled,
    isOpen,
    onQuotasToggle
  );

  useEffect(() => {
    if (isOpen) {
      const allEnabledSet = new Set([...initialValidAges, ...initialDisqualifyingAges]);
      const disqualifyingSet = new Set(initialDisqualifyingAges);

      const makeOption = (label: string, id: string): AgeOption => ({
        id,
        label,
        isDisqualifying: disqualifyingSet.has(label),
        isEnabled: allEnabledSet.has(label),
        isEditing: false
      });

      // If we have a saved order, reconstruct options in that order
      if (initialOrder && initialOrder.length > 0) {
        const ordered: AgeOption[] = [];
        const seen = new Set<string>();

        // 1. Add enabled options in the saved order
        for (const label of initialOrder) {
          seen.add(label);
          const predefined = PREDEFINED_OPTIONS.find(p => p.label === label);
          ordered.push(makeOption(label, predefined?.id ?? `custom-${Date.now()}-${Math.random()}`));
        }

        // 2. Add disabled predefined options that weren't in the saved order
        for (const p of PREDEFINED_OPTIONS) {
          if (!seen.has(p.label)) {
            ordered.push(makeOption(p.label, p.id));
          }
        }

        setAgeOptions(ordered);
      } else {
        // First time: predefined options + custom options
        const initialOptions = PREDEFINED_OPTIONS.map(option =>
          makeOption(option.label, option.id)
        );

        const customLabels = [...initialValidAges, ...initialDisqualifyingAges]
          .filter(age => !PREDEFINED_OPTIONS.find(p => p.label === age));
        const uniqueCustom = [...new Set(customLabels)];

        const customOptions = uniqueCustom.map(age =>
          makeOption(age, `custom-${Date.now()}-${Math.random()}`)
        );

        setAgeOptions([...initialOptions, ...customOptions]);
      }

      setNewOption('');
      setEditingOption(null);
    }
  }, [isOpen, initialValidAges, initialDisqualifyingAges, initialOrder]);

  const handleAddOption = () => {
    if (newOption.trim()) {
      const newAgeOption: AgeOption = {
        id: `custom-${Date.now()}`,
        label: newOption.trim(),
        isDisqualifying: false,
        isEnabled: true,
        isEditing: false
      };
      setAgeOptions(prev => [...prev, newAgeOption]);
      setNewOption('');
    }
  };

  const handleSave = () => {
    // Preserve the order defined by the researcher for all enabled options
    const enabledInOrder = ageOptions.filter(option => option.isEnabled);

    const validAges = enabledInOrder
      .filter(option => !option.isDisqualifying)
      .map(option => option.label);

    const disqualifyingAges = enabledInOrder
      .filter(option => option.isDisqualifying)
      .map(option => option.label);

    // Pass the full ordered list so the mapper preserves the researcher's order
    const orderedAll = enabledInOrder.map(option => option.label);
    const ageQuotas: AgeQuota[] = quotaConfig.quotasEnabled
      ? quotaConfig.quotas.map(mapBaseToAgeQuota)
      : [];

    onSave(validAges, disqualifyingAges, orderedAll, ageQuotas);

    onClose();
  };

  const validOptionsCount = ageOptions.filter(
    option => option.isEnabled && !option.isDisqualifying
  ).length;

  const getAvailableOptions = (options: BaseDemographicOption[]): BaseDemographicOption[] => {
    return options.filter(
      option => {
        const ageOption = ageOptions.find(ao => ao.id === option.id);
        return ageOption ? ageOption.isEnabled && !ageOption.isDisqualifying : false;
      }
    );
  };

  const getQuotaFieldValue = (option: BaseDemographicOption): string => {
    return option.label;
  };

  const getQuotaFieldLabel = (field: string): string => {
    return field;
  };

  const footer = (
    <div className="flex justify-end space-x-3">
      <button
        onClick={onClose}
        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={validOptionsCount === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Save configuration
      </button>
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Configure age options" width="lg" footer={footer}>
      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('options')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'options'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Target className="inline w-4 h-4 mr-2" />
          Age Options
        </button>
        <button
          onClick={() => setActiveTab('quotas')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'quotas'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="inline w-4 h-4 mr-2" />
          Dynamic Quotas
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'options' ? (
        <div>
          <AgeOptionsTab
            options={ageOptions}
            setOptions={setAgeOptions}
            newOption={newOption}
            setNewOption={setNewOption}
            editingOption={editingOption}
            setEditingOption={setEditingOption}
            onAddOption={handleAddOption}
          />

          {validOptionsCount === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-red-700 text-sm">
                You must have at least one qualifying option for participants to be able to participate.
              </p>
            </div>
          )}
        </div>
      ) : (
        <QuotasTab<{ id: string; label: string; isQualified: boolean }, BaseDemographicQuota<string>>
          options={ageOptions.map(opt => ({
            id: opt.id,
            label: opt.label,
            isQualified: opt.isEnabled && !opt.isDisqualifying,
            isCustom: !PREDEFINED_OPTIONS.find(p => p.id === opt.id)
          }))}
          quotaConfig={quotaConfig}
          quotasTitle="Age Quota System"
          quotasDescription="Configure specific quotas per age range. When an age range quota is full, the overquota flow applies (quota exhausted for that range), not the disqualification by profile rules from the Age Options tab."
          quotasInfoTitle="How quotas work:"
          quotasInfoItems={[
            'Each age range can have its own quota as a percentage (%) of the participant limit',
            'The percentage is calculated based on the participant limit configured in the study',
            'The system increments the counter when validating demographics (first-come within the range)',
            'When a range quota is full, the participant is placed in overquota upon submitting demographics (same logic as "no quota available"; overquota link of the study if configured)',
            'Ranges without assigned quota: if an enabled range has no configured quota, no quota limit applies for that value and it can receive participants without a percentage cap'
          ]}
          quotasDisabledMessage="Enable the quota system to configure limits per age range"
          quotasDisabledInfoTitle="Important: Distribution by 'natural falloff'"
          quotasDisabledInfoText={[
            'The previous age filters (valid and disqualifying ranges) configured in the "Age Options" tab will remain active.',
            'However, if you do not enable this section, participant distribution within valid age ranges will be by "natural falloff" (first-come), which does not guarantee specific quotas per age range will be met.',
            'To ensure a controlled distribution with specific quotas per age range, enable the dynamic quota system.'
          ]}
          getAvailableOptions={getAvailableOptions}
          getQuotaFieldValue={getQuotaFieldValue}
          getQuotaFieldLabel={getQuotaFieldLabel}
          fieldSelectLabel="Age Range"
        />
      )}
    </Drawer>
  );
};

export default AgeConfigModal;
