import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { UseDeleteStateProps, UseDeleteStateReturn } from './types';

export const useDeleteState = ({
  onSuccess,
  buttonText = 'Limpiar todas las respuestas',
  showToasts = false // NUEVO: Controlar si mostrar toasts
}: UseDeleteStateProps): UseDeleteStateReturn => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (deleteFn: () => Promise<void>) => {
    setIsDeleting(true);

    try {
      await deleteFn();

      // NUEVO: Solo mostrar toast si está habilitado
      if (showToasts) {
        toast.success('Todas las respuestas eliminadas exitosamente');
      }

      if (onSuccess) onSuccess();

    } catch (error) {

      // NUEVO: Solo mostrar toast si está habilitado
      if (showToasts) {
        toast.error('Error al eliminar respuestas');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isDeleting,
    buttonText: isDeleting ? 'Eliminando...' : buttonText,
    isButtonDisabled: isDeleting,
    handleDelete
  };
};
