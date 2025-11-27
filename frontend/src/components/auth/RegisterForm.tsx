'use client';

import { useRegisterForm } from '@/hooks/useRegisterForm';
import Link from 'next/link';
import { StatusMessage } from './StatusMessage';
import { SubmitButton } from './SubmitButton';
import { ValidatedFormField } from './ValidatedFormField';

interface RegisterFormProps {
  className?: string;
}

export function RegisterForm({ className }: RegisterFormProps) {
  const {
    state,
    validation,
    status,
    error,
    statusMessage,
    isLoading,
    handleInputChange,
    handleSubmit
  } = useRegisterForm();

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl border border-neutral-200/70 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-8 py-8">
          <header className="mb-6">
            <h1 className="text-lg font-semibold text-neutral-900 text-center">
              Registro
            </h1>
            <p className="mt-1 text-sm text-neutral-500 text-center">
              Crea una nueva cuenta
            </p>
          </header>

          {error && <StatusMessage type="error" message={error} />}

          {status === 'success' && (
            <StatusMessage
              type="success"
              message="¡Registro exitoso! Redirigiendo al login..."
              showSpinner
            />
          )}

          {statusMessage && status !== 'success' && (
            <StatusMessage type="info" message={statusMessage} showSpinner />
          )}

          {status !== 'success' && (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-5">
                  <ValidatedFormField
                    id="name"
                    label="Nombre"
                    type="text"
                    value={state.name}
                    onChange={(value) => handleInputChange('name', value)}
                    validation={validation.name}
                    placeholder="Tu nombre"
                    required
                  />

                  <ValidatedFormField
                    id="email"
                    label="Correo electrónico"
                    type="email"
                    value={state.email}
                    onChange={(value) => handleInputChange('email', value)}
                    validation={validation.email}
                    placeholder="tu@email.com"
                    required
                  />

                  <ValidatedFormField
                    id="password"
                    label="Contraseña"
                    type="password"
                    value={state.password}
                    onChange={(value) => handleInputChange('password', value)}
                    validation={validation.password}
                    placeholder="••••••••"
                    required
                  />

                  <ValidatedFormField
                    id="confirmPassword"
                    label="Confirmar Contraseña"
                    type="password"
                    value={state.confirmPassword}
                    onChange={(value) => handleInputChange('confirmPassword', value)}
                    validation={validation.confirmPassword}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <SubmitButton
                  isLoading={isLoading}
                  loadingText="Registrando..."
                  text="Registrarse"
                />
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-neutral-600">
                  ¿Ya tienes una cuenta?{' '}
                  <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Inicia sesión aquí
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
