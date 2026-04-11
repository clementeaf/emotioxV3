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

import { Target, Users } from 'lucide-react';
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
import { Drawer } from '../../ui/Drawer';

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
  addCustomOptionText = 'Agregar opción personalizada',
  statisticsLabel,
  quotasTitle,
  quotasDescription,
  quotasInfoTitle,
  quotasInfoItems,
  quotasDisabledMessage,
  quotasDisabledInfoTitle,
  quotasDisabledInfoText,
  validationMessage,
  saveButtonText = 'Guardar configuración',
  cancelButtonText = 'Cancelar',
  getAvailableOptions,
  getQuotaFieldValue,
  getQuotaFieldLabel,
  fieldSelectLabel,
  QuotasIcon,
  headerContent
}: DemographicConfigModalBaseProps<TOption, TQuota> & {
  getAvailableOptions: (options: TOption[]) => TOption[];
  getQuotaFieldValue: (option: TOption) => string;
  getQuotaFieldLabel: (field: TQuota['field']) => string;
  fieldSelectLabel?: string;
  QuotasIcon?: React.ComponentType<{ size?: number; className?: string }>;
  /** Optional content rendered above the tabs (e.g. editable question label) */
  headerContent?: React.ReactNode;
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

    if (onQuotasSave) {
      onQuotasSave(quotaConfig.quotasEnabled ? quotaConfig.quotas : []);
    }

    onClose();
  };

  const handleAddCustom = () => {
    optionsConfig.handleAddCustom(addCustomOptionText.replace('+ ', '').replace('Agregar ', ''));
  };

  const validOptionsCount = optionsConfig.qualifiedCount;

  const footer = (
    <div className="flex items-center justify-end space-x-3">
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
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title} width="lg" footer={footer}>
      {headerContent && <div className="mb-4">{headerContent}</div>}
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
            <div className="mt-4">
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
    </Drawer>
  );
}
