import React from 'react';

interface FormRowProps {
  /** Contenido de la fila */
  children: React.ReactNode;
  /** Si está centrado */
  centered?: boolean;
  /** Si está justificado */
  justified?: boolean;
  /** Espaciado entre elementos */
  spacing?: 'sm' | 'md' | 'lg';
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Componente atómico de fila de formulario
 * Reemplaza la duplicación de "flex items-center justify-between" en 11+ lugares
 */
export const FormRow: React.FC<FormRowProps> = ({
  children,
  centered = false,
  justified = false,
  spacing = 'md',
  className = ''
}) => {
  const spacingClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div 
      className={`
        flex items-center
        ${centered ? 'justify-center' : ''}
        ${justified ? 'justify-between' : ''}
        ${spacingClasses[spacing]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
