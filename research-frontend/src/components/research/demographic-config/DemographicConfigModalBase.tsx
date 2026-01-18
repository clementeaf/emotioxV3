/**
 * Componente base genérico para modales de configuración demográfica
 * 
 * Proporciona una estructura reutilizable para todos los modales de
 * configuración demográfica, eliminando duplicación de código.
 * 
 * Este componente maneja:
 * - Sistema de tabs (opciones/cuotas)
 * - Lógica de opciones (agregar, editar, eliminar, calificar)
 * - Lógica de cuotas (agregar, editar, eliminar, activar)
 * - Validaciones comunes
 * - UI consistente
 */

import { Target, Users, X } from 'lucide-react';
import React, { useState } from 'react';
import type {
  BaseDemographicOption,
  BaseDemographicQuota,
  DemographicConfigModalBaseProps
} from './types';
import { useDemographicConfig } from './useDemographicConfig';
import { useQuotaManagement } from './useQuotaManagement';
import { OptionsTab } from './OptionsTab';
import { QuotasTab } from './QuotasTab';

/**
 * Componente base genérico para modales de configuración demográfica
 */
export function DemographicConfigModalBase<
  TOption extends BaseDemographicOption = BaseDemographicOption,
  TQuota extends BaseDemographicQuota = BaseDemographicQuota
>({
  isOpen,
  onClose,
  title,
  optionsTabLabel = 'Opciones',
  quotasTabLabel = 'Cuotas Dinámicas',
  onSave,
  onQuotasSave,
  onQuotasToggle,
  initialOptions = [],
  initialDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false,
  addOptionPlaceholder: _addOptionPlaceholder,
  addOptionButtonText: _addOptionButtonText,
  addCustomOptionText = 'Agregar opción personalizada',
  statisticsLabel,
  qualifiedLabel: _qualifiedLabel,
  disqualifiedLabel: _disqualifiedLabel,
  quotasTitle,
  quotasDescription,
  quotasInfoTitle,
  quotasInfoItems,
  quotasDisabledMessage,
  quotasDisabledInfoTitle,
  quotasDisabledInfoText,
  validationMessage,
  saveButtonText = 'Guardar',
  cancelButtonText = 'Cancelar',
  getAvailableOptions,
  getQuotaFieldValue,
  getQuotaFieldLabel,
  fieldSelectLabel,
  QuotasIcon
}: DemographicConfigModalBaseProps<TOption, TQuota> & {
  getAvailableOptions: (options: TOption[]) => TOption[];
  getQuotaFieldValue: (option: TOption) => string;
  getQuotaFieldLabel: (field: TQuota['field']) => string;
  fieldSelectLabel?: string;
  QuotasIcon?: React.ComponentType<{ size?: number; className?: string }>;
}): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<'options' | 'quotas'>('options');

  const optionsConfig = useDemographicConfig<TOption>(
    initialOptions,
    initialDisqualified,
    isOpen
  );

  const quotaConfig = useQuotaManagement<TQuota>(
    initialQuotas,
    quotasEnabled,
    isOpen,
    onQuotasToggle
  );

  const handleSave = () => {
    const qualifiedOptions = optionsConfig.options.filter(
      option => option.isQualified
    );
    const disqualifiedIds = optionsConfig.options
      .filter(option => !option.isQualified)
      .map(option => option.id);

    onSave(qualifiedOptions, disqualifiedIds);

    if (quotaConfig.quotasEnabled && onQuotasSave) {
      onQuotasSave(quotaConfig.quotas);
    }

    onClose();
  };

  const handleAddCustom = () => {
    optionsConfig.handleAddCustom(addCustomOptionText.replace('+ ', '').replace('Agregar ', ''));
  };

  const validOptionsCount = optionsConfig.qualifiedCount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 p-6 bg-gray-100">
          <button
            onClick={() => setActiveTab('options')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'options'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Target className="inline w-4 h-4 mr-2" />
            {optionsTabLabel}
          </button>
          <button
            onClick={() => setActiveTab('quotas')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'quotas'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {QuotasIcon ? (
              <QuotasIcon className="inline w-4 h-4 mr-2" />
            ) : (
              <Users className="inline w-4 h-4 mr-2" />
            )}
            {quotasTabLabel}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'options' ? (
          <>
            <OptionsTab
              config={optionsConfig}
              statisticsLabel={statisticsLabel}
              addCustomOptionText={addCustomOptionText}
              onAddCustom={handleAddCustom}
            />
            {validationMessage && validOptionsCount === 0 && (
              <div className="px-6 pb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{validationMessage}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <QuotasTab
            options={optionsConfig.options}
            quotaConfig={quotaConfig}
            quotasTitle={quotasTitle}
            quotasDescription={quotasDescription}
            quotasInfoTitle={quotasInfoTitle}
            quotasInfoItems={quotasInfoItems}
            quotasDisabledMessage={quotasDisabledMessage}
            quotasDisabledInfoTitle={quotasDisabledInfoTitle}
            quotasDisabledInfoText={quotasDisabledInfoText}
            getAvailableOptions={getAvailableOptions}
            getQuotaFieldValue={getQuotaFieldValue}
            getQuotaFieldLabel={getQuotaFieldLabel}
            fieldSelectLabel={fieldSelectLabel}
            Icon={QuotasIcon}
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {cancelButtonText}
          </button>
          <button
            onClick={handleSave}
            disabled={validOptionsCount === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {saveButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
