/**
 * Modal de configuración de géneros
 * 
 * Refactorizado para usar DemographicConfigModalBase,
 * reduciendo código duplicado mientras mantiene 100% compatibilidad.
 */

import React, { useMemo } from 'react';
import { DemographicConfigModalBase } from './demographic-config/DemographicConfigModalBase';
import type {
  BaseDemographicOption,
  BaseDemographicQuota
} from './demographic-config/types';

interface GenderOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface GenderQuota {
  id: string;
  gender: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface GenderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: GenderOption[], disqualified: string[]) => void;
  onQuotasSave?: (quotas: GenderQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  currentOptions?: GenderOption[];
  currentDisqualified?: string[];
  initialQuotas?: GenderQuota[];
  quotasEnabled?: boolean;
}

const DEFAULT_GENDERS: GenderOption[] = [
  { id: 'masculino', name: 'Masculino', isQualified: true },
  { id: 'femenino', name: 'Femenino', isQualified: true },
  { id: 'prefiero-no-especificar', name: 'Prefiero no especificar', isQualified: true }
];

/**
 * Mapea GenderOption a BaseDemographicOption
 */
function mapGenderOptionToBase(option: GenderOption): BaseDemographicOption {
  return {
    id: option.id,
    label: option.name,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

/**
 * Mapea BaseDemographicOption a GenderOption
 */
function mapBaseToGenderOption(option: BaseDemographicOption): GenderOption {
  return {
    id: option.id,
    name: option.label,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

/**
 * Mapea GenderQuota a BaseDemographicQuota
 */
function mapGenderQuotaToBase(quota: GenderQuota): BaseDemographicQuota<string> {
  return {
    id: quota.id,
    field: quota.gender,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

/**
 * Mapea BaseDemographicQuota a GenderQuota
 */
function mapBaseToGenderQuota(quota: BaseDemographicQuota<string>): GenderQuota {
  return {
    id: quota.id,
    gender: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

export const GenderConfigModal: React.FC<GenderConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  currentOptions = DEFAULT_GENDERS,
  currentDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false
}) => {
  const baseOptions = useMemo(
    () => currentOptions.map(mapGenderOptionToBase),
    [currentOptions]
  );

  const baseQuotas = useMemo(
    () => initialQuotas.map(mapGenderQuotaToBase),
    [initialQuotas]
  );

  const handleSave = (
    qualifiedOptions: BaseDemographicOption[],
    disqualifiedIds: string[]
  ) => {
    const genderOptions = qualifiedOptions.map(mapBaseToGenderOption);
    onSave(genderOptions, disqualifiedIds);
  };

  const handleQuotasSave = (quotas: BaseDemographicQuota<string>[]) => {
    if (onQuotasSave) {
      const genderQuotas = quotas.map(mapBaseToGenderQuota);
      onQuotasSave(genderQuotas);
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
      title="Configurar Géneros"
      optionsTabLabel="Opciones de Género"
      quotasTabLabel="Cuotas Dinámicas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Agregar género personalizado"
      statisticsLabel="Géneros calificados"
      quotasTitle="Sistema de Cuotas por Género"
      quotasDescription="Configura cuotas específicas por género. Cuando se alcance la cuota de un género, los participantes de ese género serán descalificados automáticamente."
      quotasInfoTitle="Cómo funcionan las cuotas:"
      quotasInfoItems={[
        'Cada género puede tener su propia cuota (número absoluto o porcentaje)',
        'Porcentajes: Se calculan sobre el total de participantes esperados',
        'El sistema automáticamente contará los participantes que se registren',
        'Cuando se alcance la cuota, los participantes de ese género serán descalificados automáticamente',
        '⚠️ Géneros sin cuota asignada: Si un género habilitado no tiene cuota configurada, NO se le aplicará ningún límite y podrá recibir participantes sin restricción',
        'Las cuotas inactivas no afectan la descalificación'
      ]}
      quotasDisabledMessage="Habilita el sistema de cuotas para configurar límites por género"
      quotasDisabledInfoTitle="Importante: Distribución por 'caída natural'"
      quotasDisabledInfoText={[
        'Los filtros previos de género (opciones válidas y descalificantes) configurados en la pestaña "Opciones de Género" seguirán activos.',
        'Sin embargo, si no habilitas esta sección, la distribución de participantes dentro de los géneros válidos será por "caída natural" (orden de llegada), lo que no garantiza que se completen cuotas específicas por género.',
        'Para asegurar una distribución controlada con cuotas específicas por género, habilita el sistema de cuotas dinámicas.'
      ]}
      validationMessage="⚠️ Debes tener al menos un género calificado para que los participantes puedan participar."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Género"
    />
  );
};

export default GenderConfigModal;
