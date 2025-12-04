import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { UseSubmitStateProps, UseSubmitStateReturn } from './types';

export const useSubmitState = ({
  onSuccess,
  buttonText = 'Guardar y continuar',
  hasPreviousResponse = false
}: UseSubmitStateProps): UseSubmitStateReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (submitFn: () => Promise<void>) => {
    setIsSubmitting(true);
    setIsSuccess(false);

    try {
      await submitFn();

      toast.success('Respuesta guardada exitosamente');
      setIsSuccess(true);

      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
      }, 1500);

    } catch (error) {
      toast.error('Error al enviar respuesta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonText = () => {
    if (isSubmitting) return 'Guardando...';
    if (isSuccess) return 'Pasando a la siguiente pregunta...';
    return hasPreviousResponse ? 'Actualizar y continuar' : buttonText;
  };

  return {
    isSubmitting,
    isSuccess,
    buttonText: getButtonText(),
    isButtonDisabled: isSubmitting || isSuccess,
    handleSubmit
  };
};
