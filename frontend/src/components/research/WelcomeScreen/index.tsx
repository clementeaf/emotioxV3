import React from 'react';
import { ScreenForm, ScreenFormData } from '@/components/common/ScreenForm';
import { useWelcomeScreen } from './hooks/useWelcomeScreen';

interface WelcomeScreenFormProps {
  researchId: string;
}

export const WelcomeScreenForm: React.FC<WelcomeScreenFormProps> = ({
  researchId,
}) => {
  const {
    formData,
    isLoading,
    isSaving,
    isDeleting,
    existingScreen,
    modalError,
    modalVisible,
    confirmModalVisible,
    handleChange,
    handleSubmit,
    handlePreview,
    closeModal,
    showConfirmModal,
    closeConfirmModal,
    confirmDelete,
  } = useWelcomeScreen(researchId);

  const isExisting = !!existingScreen?.id && !existingScreen?.metadata?.isDefault;

  // Wrapper para handleChange
  const handleChangeWrapper = (field: string, value: any) => {
    handleChange(field as any, value);
  };

  const config = {
    screenType: 'welcome' as const,
    toggleLabel: 'Habilitar pantalla de bienvenida',
    toggleDescription: 'La pantalla de bienvenida se mostrará al iniciar la investigación',
    titleLabel: 'Título',
    titlePlaceholder: 'Ingresa el título de la pantalla de bienvenida',
    messageLabel: 'Mensaje',
    messagePlaceholder: 'Ingresa el mensaje de bienvenida',
    thirdFieldLabel: 'Texto del botón',
    thirdFieldPlaceholder: 'Ingresa el texto del botón de inicio',
    deleteText: 'Eliminar pantalla de bienvenida',
    deleteMessage: '¿Estás seguro de que quieres eliminar la pantalla de bienvenida? Esta acción no se puede deshacer.'
  };

  return (
    <ScreenForm
      formData={formData as ScreenFormData}
      isLoading={isLoading}
      isSaving={isSaving}
      isDeleting={isDeleting}
      isExisting={isExisting}
      modalError={modalError}
      modalVisible={modalVisible}
      confirmModalVisible={confirmModalVisible}
      handleChange={handleChangeWrapper}
      handleSave={handleSubmit}
      handlePreview={handlePreview}
      closeModal={closeModal}
      showConfirmModal={showConfirmModal}
      closeConfirmModal={closeConfirmModal}
      confirmDelete={confirmDelete}
      config={config}
    />
  );
};
