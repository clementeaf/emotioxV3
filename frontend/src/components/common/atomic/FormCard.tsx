import React from 'react';

interface FormCardProps {
  /** Contenido de la tarjeta */
  children: React.ReactNode;
  /** Si está cargando */
  loading?: boolean;
  /** Si está deshabilitada */
  disabled?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Componente atómico de tarjeta de formulario
 * Reemplaza la duplicación de "p-4 bg-white rounded" en 5+ lugares
 */
export const FormCard: React.FC<FormCardProps> = ({
  children,
  loading = false,
  disabled = false,
  className = ''
}) => {
  return (
    <div 
      className={`
        p-4 bg-white rounded-lg border border-gray-200
        ${loading ? 'opacity-50 pointer-events-none' : ''}
        ${disabled ? 'opacity-60' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
