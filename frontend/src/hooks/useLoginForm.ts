import { useLogin } from '@/api/domains/auth';
// auth-validation eliminado - implementar validación inline
import { useState } from 'react';

interface LoginFormState {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface ValidationState {
  email: { isValid: boolean; message: string | null };
  password: { isValid: boolean; message: string | null };
}

type LoginStatus = 'idle' | 'validating' | 'connecting' | 'authenticating' | 'success' | 'error';

export const useLoginForm = () => {
  const loginMutation = useLogin();
  const [status, setStatus] = useState<LoginStatus>('idle');

  const [state, setState] = useState<LoginFormState>({
    email: '',
    password: '',
    rememberMe: false
  });

  const [validation, setValidation] = useState<ValidationState>({
    email: { isValid: true, message: null },
    password: { isValid: true, message: null }
  });

  const getStatusMessage = (status: LoginStatus) => {
    switch (status) {
      case 'validating': return 'Validando datos...';
      case 'connecting': return 'Conectando con el servidor...';
      case 'authenticating': return 'Autenticando...';
      case 'success': return '¡Inicio de sesión exitoso! Redirigiendo...';
      default: return null;
    }
  };

  const handleInputChange = (field: keyof LoginFormState, value: string | boolean) => {
    setState(prev => ({ ...prev, [field]: value }));

    if (status === 'error') {
      setStatus('idle');
    }

    if (field === 'email') {
      setValidation(prev => ({
        ...prev,
        email: {
          isValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string),
          message: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string) ? null : 'Email inválido'
        }
      }));
    } else if (field === 'password') {
      setValidation(prev => ({
        ...prev,
        password: {
          isValid: (value as string).length >= 6,
          message: (value as string).length >= 6 ? null : 'La contraseña debe tener al menos 6 caracteres'
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('validating');

    // Validate fields
    const emailValidation = {
      isValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email),
      message: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email) ? null : 'Email inválido'
    };
    const passwordValidation = {
      isValid: state.password.length >= 6,
      message: state.password.length >= 6 ? null : 'La contraseña debe tener al menos 6 caracteres'
    };

    if (!emailValidation.isValid || !passwordValidation.isValid) {
      setValidation({ email: emailValidation, password: passwordValidation });
      setStatus('error');
      return;
    }

    setStatus('authenticating');

    try {
      await loginMutation.mutateAsync({
        email: state.email,
        password: state.password,
        rememberMe: state.rememberMe
      });
      setStatus('success');
    } catch (error) {
      setStatus('error');
    }
  };

  const isLoading = status === 'validating' || status === 'connecting' || status === 'authenticating' || loginMutation.isPending;
  const error = loginMutation.error ? (loginMutation.error as any).response?.data?.message || 'Error al iniciar sesión' : null;
  const statusMessage = getStatusMessage(status);

  return {
    state,
    validation,
    status,
    error,
    statusMessage,
    isLoading,
    handleInputChange,
    handleSubmit
  };
};
