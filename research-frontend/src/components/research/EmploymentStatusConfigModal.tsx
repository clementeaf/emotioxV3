/**
 * Modal de configuración de situación laboral
 * 
 * Refactorizado para usar DemographicConfigModalBase,
 * reduciendo código duplicado mientras mantiene 100% compatibilidad.
 */

import { Briefcase } from 'lucide-react';
import React, { useMemo } from 'react';
import { DemographicConfigModalBase } from './demographic-config/DemographicConfigModalBase';
import type {
  BaseDemographicOption,
  BaseDemographicQuota
} from './demographic-config/types';

interface EmploymentOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface EmploymentStatusQuota {
  id: string;
  employmentStatus: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface EmploymentStatusConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: EmploymentOption[], disqualified: string[]) => void;
  onQuotasSave?: (quotas: EmploymentStatusQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  currentOptions?: EmploymentOption[];
  currentDisqualified?: string[];
  initialQuotas?: EmploymentStatusQuota[];
  quotasEnabled?: boolean;
  headerContent?: React.ReactNode;
}

const DEFAULT_EMPLOYMENT_STATUSES: EmploymentOption[] = [
  { id: 'dependiente', name: 'Dependiente', isQualified: true },
  { id: 'independiente', name: 'Independiente', isQualified: true },
  { id: 'cesante', name: 'Cesante', isQualified: true },
  { id: 'jubilado', name: 'Jubilado', isQualified: true }
];

function mapEmploymentOptionToBase(option: EmploymentOption): BaseDemographicOption {
  return {
    id: option.id,
    label: option.name,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapBaseToEmploymentOption(option: BaseDemographicOption): EmploymentOption {
  return {
    id: option.id,
    name: option.label,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapEmploymentQuotaToBase(quota: EmploymentStatusQuota): BaseDemographicQuota<string> {
  return {
    id: quota.id,
    field: quota.employmentStatus,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

function mapBaseToEmploymentQuota(quota: BaseDemographicQuota<string>): EmploymentStatusQuota {
  return {
    id: quota.id,
    employmentStatus: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

export const EmploymentStatusConfigModal: React.FC<EmploymentStatusConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  currentOptions = DEFAULT_EMPLOYMENT_STATUSES,
  currentDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false,
  headerContent
}) => {
  const baseOptions = useMemo(
    () => currentOptions.map(mapEmploymentOptionToBase),
    [currentOptions]
  );

  const baseQuotas = useMemo(
    () => initialQuotas.map(mapEmploymentQuotaToBase),
    [initialQuotas]
  );

  const handleSave = (
    qualifiedOptions: BaseDemographicOption[],
    disqualifiedIds: string[]
  ) => {
    const employmentOptions = qualifiedOptions.map(mapBaseToEmploymentOption);
    onSave(employmentOptions, disqualifiedIds);
  };

  const handleQuotasSave = (quotas: BaseDemographicQuota<string>[]) => {
    if (onQuotasSave) {
      const employmentQuotas = quotas.map(mapBaseToEmploymentQuota);
      onQuotasSave(employmentQuotas);
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
      title="Configurar Situación Laboral"
      optionsTabLabel="Opciones de Situación Laboral"
      quotasTabLabel="Cuotas Dinámicas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Agregar situación laboral personalizada"
      statisticsLabel="Situaciones calificadas"
      quotasTitle="Sistema de Cuotas por Situación Laboral"
      quotasDescription="Configura cuotas específicas por situación laboral. Cuando el cupo de un valor esté lleno, aplica sobre cuota, no descalificación por reglas de perfil."
      quotasInfoTitle="Cómo funcionan las cuotas:"
      quotasInfoItems={[
        'Cada situación laboral puede tener su propia cuota en porcentaje (%) del límite de participantes',
        'El porcentaje se calcula sobre el límite de participantes configurado en el estudio',
        'El sistema incrementa el contador al validar demografía',
        'Cuando el cupo esté lleno, el participante queda en sobre cuota al enviar demografía (enlace de sobre cuota si lo configuraste)',
        'Situaciones sin cuota asignada: Si una situación habilitada no tiene cuota configurada, NO se le aplicará ningún límite y podrá recibir participantes sin restricción'
      ]}
      quotasDisabledMessage="Habilita el sistema de cuotas para configurar límites por situación laboral"
      quotasDisabledInfoTitle="Importante: Distribución por 'caída natural'"
      quotasDisabledInfoText={[
        'Los filtros previos de situación laboral (opciones válidas y descalificantes) configurados en la pestaña "Opciones de Situación Laboral" seguirán activos.',
        'Sin embargo, si no habilitas esta sección, la distribución de participantes dentro de las situaciones válidas será por "caída natural" (orden de llegada), lo que no garantiza que se completen cuotas específicas por situación laboral.',
        'Para asegurar una distribución controlada con cuotas específicas por situación laboral, habilita el sistema de cuotas dinámicas.'
      ]}
      validationMessage="⚠️ Debes tener al menos una situación laboral calificada para que los participantes puedan participar."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Situación Laboral"
      QuotasIcon={Briefcase}
      headerContent={headerContent}
    />
  );
};

export default EmploymentStatusConfigModal;
