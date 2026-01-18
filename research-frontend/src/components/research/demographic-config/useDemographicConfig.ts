/**
 * Hook para gestionar opciones demográficas
 * 
 * Proporciona lógica reutilizable para agregar, editar, eliminar
 * y calificar/descalificar opciones en modales de configuración demográfica.
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  BaseDemographicOption,
  UseDemographicConfigReturn
} from './types';

/**
 * Hook para gestionar opciones demográficas
 * @param initialOptions - Opciones iniciales
 * @param initialDisqualified - IDs de opciones descalificadas inicialmente
 * @param isOpen - Si el modal está abierto (para reinicializar)
 */
export function useDemographicConfig<TOption extends BaseDemographicOption>(
  initialOptions: TOption[] = [],
  initialDisqualified: string[] = [],
  isOpen: boolean
): UseDemographicConfigReturn<TOption> {
  const [options, setOptions] = useState<TOption[]>(initialOptions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [disqualifiedIds, setDisqualifiedIds] = useState<string[]>(initialDisqualified);

  useEffect(() => {
    if (isOpen) {
      setOptions(initialOptions);
      setDisqualifiedIds(initialDisqualified);
      setEditingId(null);
      setEditValue('');
    }
  }, [isOpen, initialOptions, initialDisqualified]);

  const handleToggleQualification = useCallback((optionId: string) => {
    setOptions(prev =>
      prev.map(option =>
        option.id === optionId
          ? { ...option, isQualified: !option.isQualified }
          : option
      )
    );

    setDisqualifiedIds(prev =>
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  }, []);

  const handleEditStart = useCallback((option: TOption) => {
    setEditingId(option.id);
    setEditValue(option.label);
  }, []);

  const handleEditSave = useCallback(() => {
    if (editingId && editValue.trim()) {
      setOptions(prev =>
        prev.map(option =>
          option.id === editingId
            ? { ...option, label: editValue.trim() }
            : option
        )
      );
      setEditingId(null);
      setEditValue('');
    }
  }, [editingId, editValue]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const handleAddCustom = useCallback((defaultLabel: string) => {
    const newId = `custom-${Date.now()}`;
    const newOption: TOption = {
      id: newId,
      label: defaultLabel,
      isQualified: true,
      isCustom: true
    } as TOption;
    
    setOptions(prev => [...prev, newOption]);
    setEditingId(newId);
    setEditValue(defaultLabel);
  }, []);

  const handleDelete = useCallback((optionId: string) => {
    setOptions(prev => prev.filter(option => option.id !== optionId));
    setDisqualifiedIds(prev => prev.filter(id => id !== optionId));
  }, []);

  const qualifiedCount = options.filter(option => option.isQualified).length;
  const totalCount = options.length;

  return {
    options,
    setOptions,
    editingId,
    editValue,
    setEditingId,
    setEditValue,
    handleToggleQualification,
    handleEditStart,
    handleEditSave,
    handleEditCancel,
    handleAddCustom,
    handleDelete,
    qualifiedCount,
    totalCount,
    disqualifiedIds
  };
}
