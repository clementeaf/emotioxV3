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
  quotasEnabled = false
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
      title="Configurar Horas Diarias en Línea"
      optionsTabLabel="Opciones de Horas"
      quotasTabLabel="Cuotas Dinámicas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Agregar rango de horas personalizado"
      statisticsLabel="Rangos calificados"
      quotasTitle="Sistema de Cuotas por Horas Diarias en Línea"
      quotasDescription="Configura cuotas específicas por rango de horas. Cuando el cupo de un rango esté lleno, aplica sobre cuota, no descalificación por reglas de perfil."
      quotasInfoTitle="Cómo funcionan las cuotas:"
      quotasInfoItems={[
        'Cada rango de horas puede tener su propia cuota en porcentaje (%) del límite de participantes',
        'El porcentaje se calcula sobre el límite de participantes configurado en el estudio',
        'El sistema incrementa el contador al validar demografía',
        'Cuando el cupo esté lleno, el participante queda en sobre cuota al enviar demografía (enlace de sobre cuota si lo configuraste)',
        'Rangos sin cuota asignada: Si un rango habilitado no tiene cuota configurada, NO se le aplicará ningún límite y podrá recibir participantes sin restricción'
      ]}
      quotasDisabledMessage="Habilita el sistema de cuotas para configurar límites por rango de horas"
      quotasDisabledInfoTitle="Importante: Distribución por 'caída natural'"
      quotasDisabledInfoText={[
        'Los filtros previos de horas (opciones válidas y descalificantes) configurados en la pestaña "Opciones de Horas" seguirán activos.',
        'Sin embargo, si no habilitas esta sección, la distribución de participantes dentro de los rangos válidos será por "caída natural" (orden de llegada), lo que no garantiza que se completen cuotas específicas por rango de horas.',
        'Para asegurar una distribución controlada con cuotas específicas por rango de horas, habilita el sistema de cuotas dinámicas.'
      ]}
      validationMessage="⚠️ Debes tener al menos un rango de horas calificado para que los participantes puedan participar."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Rango de Horas"
      QuotasIcon={Clock}
    />
  );
};

export default DailyHoursOnlineConfigModal;
