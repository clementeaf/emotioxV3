/**
 * Modal de configuración de niveles educativos
 * 
 * Refactorizado para usar DemographicConfigModalBase,
 * reduciendo código duplicado mientras mantiene 100% compatibilidad.
 */

import { GraduationCap } from 'lucide-react';
import React, { useMemo } from 'react';
import { DemographicConfigModalBase } from './demographic-config/DemographicConfigModalBase';
import type {
  BaseDemographicOption,
  BaseDemographicQuota
} from './demographic-config/types';

interface EducationOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

interface EducationLevelQuota {
  id: string;
  educationLevel: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface EducationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: EducationOption[], disqualified: string[]) => void;
  onQuotasSave?: (quotas: EducationLevelQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  currentOptions?: EducationOption[];
  currentDisqualified?: string[];
  initialQuotas?: EducationLevelQuota[];
  quotasEnabled?: boolean;
}

const DEFAULT_EDUCATION_LEVELS: EducationOption[] = [
  { id: 'basica', name: 'Básica', isQualified: true },
  { id: 'media', name: 'Media', isQualified: true },
  { id: 'universitaria', name: 'Universitaria', isQualified: true },
  { id: 'maestria', name: 'Maestría', isQualified: true },
  { id: 'doctorado', name: 'Doctorado', isQualified: true }
];

function mapEducationOptionToBase(option: EducationOption): BaseDemographicOption {
  return {
    id: option.id,
    label: option.name,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapBaseToEducationOption(option: BaseDemographicOption): EducationOption {
  return {
    id: option.id,
    name: option.label,
    isQualified: option.isQualified,
    isCustom: option.isCustom
  };
}

function mapEducationQuotaToBase(quota: EducationLevelQuota): BaseDemographicQuota<string> {
  return {
    id: quota.id,
    field: quota.educationLevel,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

function mapBaseToEducationQuota(quota: BaseDemographicQuota<string>): EducationLevelQuota {
  return {
    id: quota.id,
    educationLevel: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  };
}

export const EducationConfigModal: React.FC<EducationConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  currentOptions = DEFAULT_EDUCATION_LEVELS,
  currentDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false
}) => {
  const baseOptions = useMemo(
    () => currentOptions.map(mapEducationOptionToBase),
    [currentOptions]
  );

  const baseQuotas = useMemo(
    () => initialQuotas.map(mapEducationQuotaToBase),
    [initialQuotas]
  );

  const handleSave = (
    qualifiedOptions: BaseDemographicOption[],
    disqualifiedIds: string[]
  ) => {
    const educationOptions = qualifiedOptions.map(mapBaseToEducationOption);
    onSave(educationOptions, disqualifiedIds);
  };

  const handleQuotasSave = (quotas: BaseDemographicQuota<string>[]) => {
    if (onQuotasSave) {
      const educationQuotas = quotas.map(mapBaseToEducationQuota);
      onQuotasSave(educationQuotas);
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
      title="Configurar Niveles Educativos"
      optionsTabLabel="Opciones de Educación"
      quotasTabLabel="Cuotas Dinámicas"
      onSave={handleSave}
      onQuotasSave={handleQuotasSave}
      onQuotasToggle={onQuotasToggle}
      initialOptions={baseOptions}
      initialDisqualified={currentDisqualified}
      initialQuotas={baseQuotas}
      quotasEnabled={quotasEnabled}
      addCustomOptionText="Agregar nivel educativo personalizado"
      statisticsLabel="Niveles calificados"
      quotasTitle="Sistema de Cuotas por Nivel de Educación"
      quotasDescription="Configura cuotas específicas por nivel de educación. Cuando el cupo de un nivel esté lleno, aplica sobre cuota, no descalificación por reglas de perfil."
      quotasInfoTitle="Cómo funcionan las cuotas:"
      quotasInfoItems={[
        'Cada nivel educativo puede tener su propia cuota en porcentaje (%) del límite de participantes',
        'El porcentaje se calcula sobre el límite de participantes configurado en el estudio',
        'El sistema incrementa el contador al validar demografía',
        'Cuando el cupo esté lleno, el participante queda en sobre cuota al enviar demografía (enlace de sobre cuota si lo configuraste)',
        'Niveles sin cuota asignada: Si un nivel habilitado no tiene cuota configurada, NO se le aplicará ningún límite y podrá recibir participantes sin restricción'
      ]}
      quotasDisabledMessage="Habilita el sistema de cuotas para configurar límites por nivel de educación"
      quotasDisabledInfoTitle="Importante: Distribución por 'caída natural'"
      quotasDisabledInfoText={[
        'Los filtros previos de nivel educativo (opciones válidas y descalificantes) configurados en la pestaña "Opciones de Educación" seguirán activos.',
        'Sin embargo, si no habilitas esta sección, la distribución de participantes dentro de los niveles educativos válidos será por "caída natural" (orden de llegada), lo que no garantiza que se completen cuotas específicas por nivel educativo.',
        'Para asegurar una distribución controlada con cuotas específicas por nivel educativo, habilita el sistema de cuotas dinámicas.'
      ]}
      validationMessage="⚠️ Debes tener al menos un nivel educativo calificado para que los participantes puedan participar."
      getAvailableOptions={getAvailableOptions}
      getQuotaFieldValue={getQuotaFieldValue}
      getQuotaFieldLabel={getQuotaFieldLabel}
      fieldSelectLabel="Nivel de Educación"
      QuotasIcon={GraduationCap}
    />
  );
};

export default EducationConfigModal;
