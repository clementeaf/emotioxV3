import React from 'react';

interface FormSectionProps {
  /** Título de la sección */
  title: string;
  /** Descripción de la sección */
  description?: string;
  /** Contenido de la sección */
  children: React.ReactNode;
  /** Si está colapsada */
  collapsed?: boolean;
  /** Si es colapsable */
  collapsible?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Componente atómico de sección de formulario
 * Reemplaza la duplicación de layouts en todos los formularios
 */
export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  collapsed = false,
  collapsible = false,
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(collapsed);

  const handleToggle = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header de la sección */}
      <div 
        className={`border-b border-gray-200 pb-4 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            )}
          </div>
          {collapsible && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600"
            >
              {isCollapsed ? '▼' : '▲'}
            </button>
          )}
        </div>
      </div>

      {/* Contenido de la sección */}
      {!isCollapsed && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};
