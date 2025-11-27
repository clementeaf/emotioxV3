import React from 'react';

interface FormCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Componente de tarjeta para formularios con estilo consistente
 * Unificado con QuestionCard para mantener diseño coherente
 */
export const FormCard: React.FC<FormCardProps> = ({
  title,
  children,
  className = ''
}) => {
  return (
    <div 
      className={`mb-6 p-6 bg-white rounded-lg shadow-sm border border-gray-100 ${className}`}
      style={{ maxWidth: '100%', boxSizing: 'border-box' }}
    >
      {title && (
        <div className="mb-4 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
      )}
      <div>
        {children}
      </div>
    </div>
  );
};

export default FormCard;
