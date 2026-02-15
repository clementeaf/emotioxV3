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
  quotasEnabled = false
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
      title="Configurar Competencia Técnica"
      optionsTabLabel="Opciones de Competencia"
      quotasTabLabel="Cuotas Dinámicas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Agregar nivel de competencia personalizado"
      statisticsLabel="Niveles calificados"
      quotasTitle="Sistema de Cuotas por Competencia Técnica"
      quotasDescription="Configura cuotas específicas por nivel de competencia. Cuando se alcance la cuota de un nivel, los participantes de ese nivel serán descalificados automáticamente."
      quotasInfoTitle="Cómo funcionan las cuotas:"
      quotasInfoItems={[
        'Cada nivel de competencia puede tener su propia cuota (número absoluto o porcentaje)',
        'Porcentajes: Se calculan sobre el total de participantes esperados',
        'El sistema automáticamente contará los participantes que se registren',
        'Cuando se alcance la cuota, los participantes de ese nivel serán descalificados automáticamente',
        '⚠️ Niveles sin cuota asignada: Si un nivel habilitado no tiene cuota configurada, NO se le aplicará ningún límite y podrá recibir participantes sin restricción',
        'Las cuotas inactivas no afectan la descalificación'
      ]}
      quotasDisabledMessage="Habilita el sistema de cuotas para configurar límites por nivel de competencia"
      quotasDisabledInfoTitle="Importante: Distribución por 'caída natural'"
      quotasDisabledInfoText={[
        'Los filtros previos de competencia (opciones válidas y descalificantes) configurados en la pestaña "Opciones de Competencia" seguirán activos.',
        'Sin embargo, si no habilitas esta sección, la distribución de participantes dentro de los niveles válidos será por "caída natural" (orden de llegada), lo que no garantiza que se completen cuotas específicas por nivel de competencia.',
        'Para asegurar una distribución controlada con cuotas específicas por nivel de competencia, habilita el sistema de cuotas dinámicas.'
      ]}
      validationMessage="⚠️ Debes tener al menos un nivel de competencia calificado para que los participantes puedan participar."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Nivel de Competencia"
      QuotasIcon={Code}
    />
  );
};

export default TechnicalProficiencyConfigModal;
