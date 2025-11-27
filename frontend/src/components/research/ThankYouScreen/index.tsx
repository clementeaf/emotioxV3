import React from 'react';
import { ScreenForm, ScreenFormData } from '@/components/common/ScreenForm';
import { useThankYouScreenForm } from './hooks/useThankYouScreenForm';

interface ThankYouScreenFormProps {
  className?: string;
  researchId: string;
  onSave?: () => void;
}

export const ThankYouScreenForm: React.FC<ThankYouScreenFormProps> = ({
  researchId,
  onSave
}) => {
  const {
    formData,
    validationErrors,
    isLoading,
    isSaving,
    modalError,
    modalVisible,
    handleChange,
    handleSave,
    handlePreview,
    closeModal,
    isDeleting,
    showDelete,
    confirmModalVisible,
    showConfirmModal,
    closeConfirmModal,
    confirmDelete,
  } = useThankYouScreenForm(researchId);

  const handleSaveAndNotify = () => {
    handleSave();
    if (onSave) {
      onSave();
    }
  };

  // Wrapper para handleChange
  const handleChangeWrapper = (field: string, value: any) => {
    handleChange(field as any, value);
  };

  const config = {
    screenType: 'thankyou' as const,
    toggleLabel: 'Habilitar pantalla de agradecimiento',
    toggleDescription: 'La pantalla de agradecimiento se mostrará al finalizar la investigación',
    titleLabel: 'Título',
    titlePlaceholder: 'Ingresa el título de agradecimiento',
    messageLabel: 'Mensaje',
    messagePlaceholder: 'Ingresa el mensaje de agradecimiento',
    thirdFieldLabel: 'URL de redirección',
    thirdFieldPlaceholder: 'https://ejemplo.com',
    deleteText: 'Eliminar pantalla de agradecimiento',
    deleteMessage: '¿Estás seguro de que quieres eliminar la pantalla de agradecimiento? Esta acción no se puede deshacer.'
  };

  return (
    <div className="max-w-4xl space-y-4">
      <ScreenForm
        formData={formData as ScreenFormData}
        isLoading={isLoading}
        isSaving={isSaving}
        isDeleting={isDeleting}
        isExisting={showDelete}
        validationErrors={validationErrors}
        modalError={modalError}
        modalVisible={modalVisible}
        confirmModalVisible={confirmModalVisible}
        handleChange={handleChangeWrapper}
        handleSave={handleSaveAndNotify}
        handlePreview={handlePreview}
        closeModal={closeModal}
        showConfirmModal={showConfirmModal}
        closeConfirmModal={closeConfirmModal}
        confirmDelete={confirmDelete}
        config={config}
      />
    </div>
  );
};
