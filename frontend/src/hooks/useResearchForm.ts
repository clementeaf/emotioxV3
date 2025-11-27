import { useState, useEffect, useCallback } from 'react';

/**
 * Tipos genéricos para el hook de formulario de investigación
 */
export interface ErrorModalData {
  type: 'error' | 'warning' | 'info';
  title?: string;
  message: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

/**
 * Interfaz para el hook centralizado de datos
 */
export interface ResearchDataHook<TData, TCreateRequest, TUpdateRequest> {
  data: TData | null;
  isLoading: boolean;
  create: (data: TCreateRequest) => Promise<TData>;
  update: (researchId: string, data: TUpdateRequest) => Promise<TData>;
  delete: () => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

/**
 * Opciones de configuración para el hook genérico
 */
export interface UseResearchFormOptions<TData, TFormData, TCreateRequest, TUpdateRequest> {
  researchId: string;
  dataHook: ResearchDataHook<TData, TCreateRequest, TUpdateRequest>;
  initialFormData: TFormData;
  mapDataToForm: (data: TData | null) => TFormData;
  mapFormToCreate: (formData: TFormData, researchId: string) => TCreateRequest;
  mapFormToUpdate: (formData: TFormData, researchId: string) => TUpdateRequest;
  validateForm?: (formData: TFormData) => ValidationErrors | null;
  onSaveSuccess?: (data: TData) => void;
  onDeleteSuccess?: () => void;
  normalizeResearchId?: (researchId: string) => string;
}

/**
 * Resultado del hook genérico
 */
export interface UseResearchFormResult<TFormData> {
  formData: TFormData;
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  existingData: unknown | null;
  validationErrors: ValidationErrors | null;
  modalError: ErrorModalData | null;
  modalVisible: boolean;
  confirmModalVisible: boolean;
  handleChange: (field: keyof TFormData, value: unknown) => void;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  closeModal: () => void;
  showConfirmModal: () => void;
  closeConfirmModal: () => void;
  confirmDelete: () => Promise<void>;
}

/**
 * Hook genérico para formularios de investigación
 * Proporciona la funcionalidad base común para todos los módulos de investigación
 */
export function useResearchForm<TData, TFormData extends Record<string, unknown>, TCreateRequest, TUpdateRequest>(
  options: UseResearchFormOptions<TData, TFormData, TCreateRequest, TUpdateRequest>
): UseResearchFormResult<TFormData> {
  const {
    researchId,
    dataHook,
    initialFormData,
    mapDataToForm,
    mapFormToCreate,
    mapFormToUpdate,
    validateForm,
    onSaveSuccess,
    onDeleteSuccess,
    normalizeResearchId
  } = options;

  const actualResearchId = normalizeResearchId ? normalizeResearchId(researchId) : researchId;

  const {
    data: existingData,
    isLoading,
    create,
    update,
    delete: deleteData,
    isCreating,
    isUpdating,
    isDeleting
  } = dataHook;

  const [formData, setFormData] = useState<TFormData>(initialFormData);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);
  const [modalError, setModalError] = useState<ErrorModalData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // Derivar isSaving del hook centralizado
  const isSaving = isCreating || isUpdating;

  // Cargar datos cuando cambie la respuesta del hook centralizado
  useEffect(() => {
    if (isLoading) return;

    if (!existingData) {
      setFormData(initialFormData);
      return;
    }

    const mappedFormData = mapDataToForm(existingData);
    
    // Solo actualizar si los datos realmente cambiaron (evitar loop infinito)
    setFormData(prev => {
      // Comparación simple: si el objeto es el mismo, no actualizar
      if (JSON.stringify(prev) === JSON.stringify(mappedFormData)) {
        return prev;
      }
      return mappedFormData;
    });
  }, [existingData, isLoading, initialFormData]); // Remover mapDataToForm de dependencias

  const handleChange = useCallback((field: keyof TFormData, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error de validación del campo si existe
    if (validationErrors?.[field as string]) {
      setValidationErrors(prev => {
        if (!prev) return null;
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return Object.keys(newErrors).length === 0 ? null : newErrors;
      });
    }
  }, [validationErrors]);

  const handleSave = useCallback(async () => {
    // Validar formulario si se proporciona función de validación
    if (validateForm) {
      const errors = validateForm(formData);
      if (errors && Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setModalError({
          title: 'Campos incompletos',
          message: 'Por favor, complete todos los campos requeridos.',
          type: 'warning'
        });
        setModalVisible(true);
        return;
      }
      setValidationErrors(null);
    }

    try {
      let savedData: TData;

      if (existingData && actualResearchId) {
        // Actualizar existente
        const updateRequest = mapFormToUpdate(formData, actualResearchId);
        savedData = await update(actualResearchId, updateRequest);
      } else if (actualResearchId) {
        // Crear nuevo
        const createRequest = mapFormToCreate(formData, actualResearchId);
        savedData = await create(createRequest);
      } else {
        throw new Error('No hay researchId válido para guardar.');
      }

      // Actualizar formData con los datos guardados
      const mappedFormData = mapDataToForm(savedData);
      setFormData(mappedFormData);

      // Callback opcional de éxito
      if (onSaveSuccess) {
        onSaveSuccess(savedData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo guardar los datos.';
      setModalError({
        title: 'Error al Guardar',
        message: errorMessage,
        type: 'error'
      });
      setModalVisible(true);
    }
  }, [
    formData,
    existingData,
    actualResearchId,
    validateForm,
    mapFormToCreate,
    mapFormToUpdate,
    mapDataToForm,
    create,
    update,
    onSaveSuccess
  ]);

  const handleDelete = useCallback(async () => {
    if (!existingData || !actualResearchId) return;

    try {
      await deleteData();
      setFormData(initialFormData);

      // Callback opcional de éxito
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'No se pudo eliminar los datos.';
      setModalError({
        title: 'Error al eliminar',
        message: errorMessage,
        type: 'error'
      });
      setModalVisible(true);
    }
  }, [existingData, actualResearchId, deleteData, initialFormData, onDeleteSuccess]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setModalError(null);
  }, []);

  const showConfirmModal = useCallback(() => {
    setConfirmModalVisible(true);
  }, []);

  const closeConfirmModal = useCallback(() => {
    setConfirmModalVisible(false);
  }, []);

  const confirmDelete = useCallback(async () => {
    await handleDelete();
    closeConfirmModal();
  }, [handleDelete, closeConfirmModal]);

  return {
    formData,
    isLoading,
    isSaving,
    isDeleting,
    existingData,
    validationErrors,
    modalError,
    modalVisible,
    confirmModalVisible,
    handleChange,
    handleSave,
    handleDelete,
    closeModal,
    showConfirmModal,
    closeConfirmModal,
    confirmDelete
  };
}

