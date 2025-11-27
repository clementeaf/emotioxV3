import React from 'react';

interface FormHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

/**
 * Componente genérico para headers de formularios
 * Reutilizable en cualquier formulario que necesite título y descripción
 */
export const FormHeader: React.FC<FormHeaderProps> = ({
  title,
  description,
  className = ''
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      <h2 className="text-xl font-semibold text-neutral-900 mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-neutral-500">{description}</p>
      )}
    </div>
  );
};

export default FormHeader;
