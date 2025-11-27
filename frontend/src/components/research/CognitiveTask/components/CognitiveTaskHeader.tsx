import React from 'react';

interface CognitiveTaskHeaderProps {
  title: string;
  description: string;
}

/**
 * Componente para el encabezado de las tareas cognitivas
 */
export const CognitiveTaskHeader: React.FC<CognitiveTaskHeaderProps> = ({
  title,
  description
}) => {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
      <p className="text-sm text-neutral-500 mt-1">{description}</p>
    </div>
  );
}; 