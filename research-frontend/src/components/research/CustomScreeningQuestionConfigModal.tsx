/**
 * Modal de configuración para preguntas de filtrado custom
 *
 * Mismo patrón que HouseholdIncomeConfigModal pero con campo editable
 * para el nombre de la pregunta. Usa DemographicConfigModalBase.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { DemographicConfigModalBase } from './demographic-config/DemographicConfigModalBase';
import type {
  BaseDemographicOption,
} from './demographic-config/types';

interface ScreeningOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface CustomScreeningQuestionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (questionLabel: string, options: ScreeningOption[], disqualified: string[]) => void;
  /** Current question label (editable by researcher) */
  questionLabel?: string;
  currentOptions?: ScreeningOption[];
  currentDisqualified?: string[];
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

export const CustomScreeningQuestionConfigModal: React.FC<CustomScreeningQuestionConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  questionLabel: initialLabel = '',
  currentOptions = DEFAULT_OPTIONS,
  currentDisqualified = [],
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

  const handleSave = (
    qualifiedOptions: BaseDemographicOption[],
    disqualifiedIds: string[]
  ) => {
    const options = qualifiedOptions.map(mapBaseToOption);
    onSave(label.trim() || 'Screening Question', options, disqualifiedIds);
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
      quotasTabLabel=""
      onSave={handleSave}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      hideQuotasTab
      addCustomOptionText="Add custom option"
      statisticsLabel="Qualifying options"
      validationMessage="You must have at least two qualifying options."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
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
