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
  onSave: (validAges: string[], disqualifyingAges: string[]) => void;
  onQuotasSave?: (quotas: AgeQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  initialValidAges?: string[];
  initialDisqualifyingAges?: string[];
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
  onQuotasSave,
  onQuotasToggle,
  initialValidAges = [],
  initialDisqualifyingAges = [],
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
      const allInitialAges = [...initialValidAges, ...initialDisqualifyingAges];
      const initialOptions = PREDEFINED_OPTIONS.map(option => ({
        ...option,
        isDisqualifying: initialDisqualifyingAges.includes(option.label),
        isEnabled: allInitialAges.includes(option.label),
        isEditing: false
      }));

      const customOptions = [
        ...initialValidAges.filter(
          age => !PREDEFINED_OPTIONS.find(p => p.label === age)
        ),
        ...initialDisqualifyingAges.filter(
          age => !PREDEFINED_OPTIONS.find(p => p.label === age)
        )
      ].map(age => ({
        id: `custom-${Date.now()}-${Math.random()}`,
        label: age,
        isDisqualifying: initialDisqualifyingAges.includes(age),
        isEnabled: true,
        isEditing: false
      }));

      setAgeOptions([...initialOptions, ...customOptions]);
      setNewOption('');
      setEditingOption(null);
    }
  }, [isOpen, initialValidAges, initialDisqualifyingAges]);

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
    const validAges = ageOptions
      .filter(option => option.isEnabled && !option.isDisqualifying)
      .map(option => option.label);

    const disqualifyingAges = ageOptions
      .filter(option => option.isEnabled && option.isDisqualifying)
      .map(option => option.label);

    onSave(validAges, disqualifyingAges);

    if (quotaConfig.quotasEnabled && onQuotasSave) {
      const ageQuotas = quotaConfig.quotas.map(mapBaseToAgeQuota);
      onQuotasSave(ageQuotas);
    }

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
        Cancelar
      </button>
      <button
        onClick={handleSave}
        disabled={validOptionsCount === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Guardar configuración
      </button>
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Configurar opciones de edad" width="lg" footer={footer}>
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
          Opciones de Edad
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
          Cuotas Dinámicas
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
                Debes tener al menos una opción que clasifique para que los participantes puedan participar.
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
          quotasTitle="Sistema de Cuotas por Edad"
          quotasDescription="Configura cuotas específicas por rango de edad. Cuando se alcance la cuota de un rango, los participantes de esa edad serán descalificados automáticamente."
          quotasInfoTitle="Cómo funcionan las cuotas:"
          quotasInfoItems={[
            'Cada rango de edad puede tener su propia cuota (número absoluto o porcentaje)',
            'Porcentajes: Se calculan sobre el total de participantes esperados',
            'El sistema automáticamente contará los participantes que se registren',
            'Cuando se alcance la cuota, los participantes de esa edad serán descalificados automáticamente',
            'Rangos sin cuota asignada: Si un rango habilitado no tiene cuota configurada, NO se le aplicará ningún límite y podrá recibir participantes sin restricción',
            'Las cuotas inactivas no afectan la descalificación'
          ]}
          quotasDisabledMessage="Habilita el sistema de cuotas para configurar límites por rango de edad"
          quotasDisabledInfoTitle="Importante: Distribución por 'caída natural'"
          quotasDisabledInfoText={[
            'Los filtros previos de edad (rangos válidos y descalificantes) configurados en la pestaña "Opciones de Edad" seguirán activos.',
            'Sin embargo, si no habilitas esta sección, la distribución de participantes dentro de los rangos de edad válidos será por "caída natural" (orden de llegada), lo que no garantiza que se completen cuotas específicas por rango de edad.',
            'Para asegurar una distribución controlada con cuotas específicas por rango de edad, habilita el sistema de cuotas dinámicas.'
          ]}
          getAvailableOptions={getAvailableOptions}
          getQuotaFieldValue={getQuotaFieldValue}
          getQuotaFieldLabel={getQuotaFieldLabel}
          fieldSelectLabel="Rango de Edad"
        />
      )}
    </Drawer>
  );
};

export default AgeConfigModal;
