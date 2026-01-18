/**
 * Hook para gestionar cuotas demográficas
 * 
 * Proporciona lógica reutilizable para agregar, actualizar, eliminar
 * y habilitar/deshabilitar cuotas en modales de configuración demográfica.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  BaseDemographicQuota,
  UseQuotaManagementReturn
} from './types';

/**
 * Hook para gestionar cuotas demográficas
 * @param initialQuotas - Cuotas iniciales
 * @param initialQuotasEnabled - Estado inicial de habilitación de cuotas
 * @param isOpen - Si el modal está abierto (para reinicializar)
 * @param onQuotasToggle - Callback cuando se togglea la habilitación
 */
export function useQuotaManagement<TQuota extends BaseDemographicQuota>(
  initialQuotas: TQuota[] = [],
  initialQuotasEnabled: boolean = false,
  isOpen: boolean,
  onQuotasToggle?: (enabled: boolean) => void
): UseQuotaManagementReturn<TQuota> {
  const [quotas, setQuotas] = useState<TQuota[]>([]);
  const [quotasEnabled, setQuotasEnabled] = useState(initialQuotasEnabled);

  useEffect(() => {
    if (isOpen) {
      const migratedQuotas = initialQuotas.map(quota => ({
        ...quota,
        quotaType: quota.quotaType || 'absolute'
      })) as TQuota[];
      setQuotas(migratedQuotas);
      setQuotasEnabled(initialQuotasEnabled);
    }
  }, [isOpen, initialQuotas, initialQuotasEnabled]);

  const handleAddQuota = useCallback((fieldValue: string) => {
    const newQuota: TQuota = {
      id: `quota-${Date.now()}`,
      field: fieldValue as TQuota['field'],
      quota: 1,
      quotaType: 'absolute',
      isActive: true
    } as TQuota;
    setQuotas(prev => [...prev, newQuota]);
  }, []);

  const handleUpdateQuota = useCallback((
    id: string,
    field: keyof TQuota,
    value: unknown
  ) => {
    setQuotas(prev =>
      prev.map(quota =>
        quota.id === id ? { ...quota, [field]: value } : quota
      )
    );
  }, []);

  const handleDeleteQuota = useCallback((id: string) => {
    setQuotas(prev => prev.filter(quota => quota.id !== id));
  }, []);

  const handleToggleQuotasEnabled = useCallback(() => {
    const newState = !quotasEnabled;
    setQuotasEnabled(newState);
    onQuotasToggle?.(newState);
  }, [quotasEnabled, onQuotasToggle]);

  return {
    quotas,
    setQuotas,
    quotasEnabled,
    setQuotasEnabled,
    handleAddQuota,
    handleUpdateQuota,
    handleDeleteQuota,
    handleToggleQuotasEnabled
  };
}
