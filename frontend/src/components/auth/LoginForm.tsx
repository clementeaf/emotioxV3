'use client';

import { useLoginForm } from '@/hooks/useLoginForm';
import { PUBLIC_ROUTES } from '@/routes';
import Link from 'next/link';
import { CheckboxField } from './CheckboxField';
import { FormField } from '@/components/forms/FormField';
import { StatusMessage } from './StatusMessage';
import { SubmitButton } from './SubmitButton';

interface LoginFormProps {
  className?: string;
}

export function LoginForm({ className }: LoginFormProps) {
  const {
    state,
    error,
    statusMessage,
    status,
    isLoading,
    handleInputChange,
    handleSubmit
  } = useLoginForm();

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 w-full max-w-md mx-auto my-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Iniciar Sesión</h1>
        <p className="text-neutral-600 mt-2">Ingresa tus credenciales para acceder a tu cuenta</p>
      </div>

      {error && <StatusMessage type="error" message={error} />}

      {status === 'success' && !error && (
        <StatusMessage
          type="success"
          message="¡Inicio de sesión exitoso! Redirigiendo..."
          showSpinner
        />
      )}

      {statusMessage && !error && status !== 'success' && (
        <StatusMessage type="info" message={statusMessage} showSpinner />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="email"
          label="Correo electrónico"
          type="email"
          value={state.email}
          onChange={(value) => handleInputChange('email', value)}
          required
        />

        <FormField
          id="password"
          label="Contraseña"
          type="password"
          value={state.password}
          onChange={(value) => handleInputChange('password', value)}
          required
        />

        <div className="flex items-center">
          <CheckboxField
            id="remember"
            label="Recordarme"
            checked={state.rememberMe}
            onChange={(checked) => handleInputChange('rememberMe', checked)}
          />
        </div>

        <SubmitButton
          isLoading={isLoading}
          loadingText="Iniciando sesión..."
          text="Iniciar Sesión"
        />
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-600">
          ¿No tienes una cuenta?{' '}
          <Link href={PUBLIC_ROUTES.REGISTER} className="text-blue-600 hover:text-blue-500 font-medium">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
