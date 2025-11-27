import React from 'react';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { FormToggle } from '@/components/common/FormToggle';
import { FormCard } from '@/components/common/FormCard';
import { FormInput } from '@/components/common/FormInput';
import { FormTextarea } from '@/components/common/FormTextarea';
import { FormActionButtons } from '@/components/common/FormActionButtons';
import { ErrorModal } from '@/components/common/ErrorModal';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

export interface ScreenFormData {
    isEnabled: boolean;
    title: string;
    message: string;
    startButtonText?: string;
    redirectUrl?: string;
}

export interface ScreenFormProps {
    // Datos del formulario
    formData: ScreenFormData;
    isLoading: boolean;
    isSaving: boolean;
    isDeleting: boolean;
    isExisting: boolean;

    // Errores de validación
    validationErrors?: Record<string, string> | any;

    // Modales
    modalError?: {
        type: 'error' | 'warning' | 'info';
        title?: string;
        message: string;
    } | null;
    modalVisible: boolean;
    confirmModalVisible: boolean;

    // Handlers
    handleChange: (field: string, value: any) => void;
    handleSave: () => void;
    handlePreview: () => void;
    closeModal: () => void;
    showConfirmModal: () => void;
    closeConfirmModal: () => void;
    confirmDelete: () => void;

    // Configuración de textos
    config: {
        screenType: 'welcome' | 'thankyou';
        toggleLabel: string;
        toggleDescription: string;
        cardTitle?: string;
        titleLabel: string;
        titlePlaceholder: string;
        messageLabel: string;
        messagePlaceholder: string;
        thirdFieldLabel: string;
        thirdFieldPlaceholder: string;
        deleteText: string;
        deleteMessage: string;
    };
}

export const ScreenForm: React.FC<ScreenFormProps> = ({
    formData,
    isLoading,
    isSaving,
    isDeleting,
    isExisting,
    validationErrors = {},
    modalError,
    modalVisible,
    confirmModalVisible,
    handleChange,
    handleSave,
    handlePreview,
    closeModal,
    showConfirmModal,
    closeConfirmModal,
    confirmDelete,
    config
}) => {
    if (isLoading) {
        return <LoadingSkeleton type="form" count={4} />;
    }

    const isWelcomeScreen = config.screenType === 'welcome';

    return (
        <>
            <div>
                <FormCard>
                    <div className="space-y-6">
                        <FormToggle
                            label={config.toggleLabel}
                            description={config.toggleDescription}
                            checked={formData.isEnabled}
                            onChange={(checked) => handleChange('isEnabled', checked)}
                            disabled={isLoading || isSaving}
                        />
                        <FormInput
                            label={config.titleLabel}
                            value={formData.title}
                            onChange={(value) => handleChange('title', value)}
                            placeholder={config.titlePlaceholder}
                            disabled={isLoading || isSaving || !formData.isEnabled}
                            error={validationErrors.title}
                        />

                        <FormTextarea
                            label={config.messageLabel}
                            value={formData.message}
                            onChange={(value) => handleChange('message', value)}
                            placeholder={config.messagePlaceholder}
                            rows={4}
                            disabled={isLoading || isSaving || !formData.isEnabled}
                            error={validationErrors.message}
                        />

                        <FormInput
                            label={config.thirdFieldLabel}
                            value={isWelcomeScreen ? formData.startButtonText || '' : formData.redirectUrl || ''}
                            onChange={(value) => handleChange(isWelcomeScreen ? 'startButtonText' : 'redirectUrl', value)}
                            placeholder={config.thirdFieldPlaceholder}
                            disabled={isLoading || isSaving || !formData.isEnabled}
                            error={validationErrors[isWelcomeScreen ? 'startButtonText' : 'redirectUrl']}
                        />
                    </div>

                    <FormActionButtons
                        isSaving={isSaving}
                        isDeleting={isDeleting}
                        isExisting={isExisting}
                        isEnabled={formData.isEnabled}
                        onSave={handleSave}
                        onPreview={handlePreview}
                        onDelete={showConfirmModal}
                        deleteText={config.deleteText}
                        deletingText="Eliminando..."
                        savingText="Guardando..."
                    />
                </FormCard>
            </div>

            {modalError && (
                <ErrorModal
                    isOpen={modalVisible}
                    onClose={closeModal}
                    error={modalError}
                />
            )}

            <ConfirmationModal
                isOpen={confirmModalVisible}
                title="Confirmar eliminación"
                message={config.deleteMessage}
                confirmText="Eliminar"
                cancelText="Cancelar"
                onConfirm={confirmDelete}
                onClose={closeConfirmModal}
                isLoading={isDeleting}
                variant="danger"
            />
        </>
    );
};
