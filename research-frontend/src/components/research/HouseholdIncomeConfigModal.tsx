/**
 * Modal de configuración de ingresos familiares
 * 
 * Refactorizado para usar DemographicConfigModalBase,
 * reduciendo código duplicado mientras mantiene 100% compatibilidad.
 */

import { DollarSign } from 'lucide-react';
import React, { useMemo } from 'react';
import { DemographicConfigModalBase } from './demographic-config/DemographicConfigModalBase';
import type {
  BaseDemographicOption,
  BaseDemographicQuota
} from './demographic-config/types';

interface IncomeOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface HouseholdIncomeQuota {
  id: string;
  incomeLevel: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface HouseholdIncomeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: IncomeOption[], disqualified: string[]) => void;
  onQuotasSave?: (quotas: HouseholdIncomeQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  currentOptions?: IncomeOption[];
  currentDisqualified?: string[];
  initialQuotas?: HouseholdIncomeQuota[];
  quotasEnabled?: boolean;
}

const DEFAULT_INCOME_LEVELS: IncomeOption[] = [
  { id: 'nivel-1', name: 'Menos de 20.000€', isQualified: true },
  { id: 'nivel-2', name: '20.000€ - 40.000€', isQualified: true },
  { id: 'nivel-3', name: '40.000€ - 60.000€', isQualified: true },
  { id: 'nivel-4', name: '60.000€ - 80.000€', isQualified: true },
  { id: 'nivel-5', name: 'Más de 80.000€', isQualified: true }
];

function mapIncomeOptionToBase(option: IncomeOption): BaseDemographicOption {
  return {
    id: option.id,
    label: option.name,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapBaseToIncomeOption(option: BaseDemographicOption): IncomeOption {
  return {
    id: option.id,
    name: option.label,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapIncomeQuotaToBase(quota: HouseholdIncomeQuota): BaseDemographicQuota<string> {
  return {
    id: quota.id,
    field: quota.incomeLevel,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

function mapBaseToIncomeQuota(quota: BaseDemographicQuota<string>): HouseholdIncomeQuota {
  return {
    id: quota.id,
    incomeLevel: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

export const HouseholdIncomeConfigModal: React.FC<HouseholdIncomeConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  currentOptions = DEFAULT_INCOME_LEVELS,
  currentDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false
}) => {
  const baseOptions = useMemo(
    () => currentOptions.map(mapIncomeOptionToBase),
    [currentOptions]
  );

  const baseQuotas = useMemo(
    () => initialQuotas.map(mapIncomeQuotaToBase),
    [initialQuotas]
  );

  const handleSave = (
    qualifiedOptions: BaseDemographicOption[],
    disqualifiedIds: string[]
  ) => {
    const incomeOptions = qualifiedOptions.map(mapBaseToIncomeOption);
    onSave(incomeOptions, disqualifiedIds);
  };

  const handleQuotasSave = (quotas: BaseDemographicQuota<string>[]) => {
    if (onQuotasSave) {
      const incomeQuotas = quotas.map(mapBaseToIncomeQuota);
      onQuotasSave(incomeQuotas);
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
      title="Configurar Ingresos Familiares"
      optionsTabLabel="Opciones de Ingresos"
      quotasTabLabel="Cuotas Dinámicas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Agregar nivel de ingresos personalizado"
      statisticsLabel="Niveles calificados"
      quotasTitle="Sistema de Cuotas por Ingresos Familiares"
      quotasDescription="Configura cuotas específicas por nivel de ingresos. Cuando el cupo de un nivel esté lleno, aplica sobre cuota, no descalificación por reglas de perfil."
      quotasInfoTitle="Cómo funcionan las cuotas:"
      quotasInfoItems={[
        'Cada nivel de ingresos puede tener su propia cuota en porcentaje (%) del límite de participantes',
        'El porcentaje se calcula sobre el límite de participantes configurado en el estudio',
        'El sistema incrementa el contador al validar demografía',
        'Cuando el cupo esté lleno, el participante queda en sobre cuota al enviar demografía (enlace de sobre cuota si lo configuraste)',
        'Niveles sin cuota asignada: Si un nivel habilitado no tiene cuota configurada, NO se le aplicará ningún límite y podrá recibir participantes sin restricción'
      ]}
      quotasDisabledMessage="Habilita el sistema de cuotas para configurar límites por nivel de ingresos"
      quotasDisabledInfoTitle="Importante: Distribución por 'caída natural'"
      quotasDisabledInfoText={[
        'Los filtros previos de ingresos (opciones válidas y descalificantes) configurados en la pestaña "Opciones de Ingresos" seguirán activos.',
        'Sin embargo, si no habilitas esta sección, la distribución de participantes dentro de los niveles válidos será por "caída natural" (orden de llegada), lo que no garantiza que se completen cuotas específicas por nivel de ingresos.',
        'Para asegurar una distribución controlada con cuotas específicas por nivel de ingresos, habilita el sistema de cuotas dinámicas.'
      ]}
      validationMessage="⚠️ Debes tener al menos un nivel de ingresos calificado para que los participantes puedan participar."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Nivel de Ingresos"
      QuotasIcon={DollarSign}
    />
  );
};

export default HouseholdIncomeConfigModal;
