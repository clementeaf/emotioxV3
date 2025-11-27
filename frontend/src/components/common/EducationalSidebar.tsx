import React from 'react';
import { Loader2, BookOpen, Info } from 'lucide-react';

interface EducationalContent {
  title: string;
  generalDescription: string;
  typeExplanation: string;
}

interface EducationalSidebarProps {
  content: EducationalContent | null;
  loading: boolean;
  error: string | null;
  title?: string;
  additionalContent?: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

/**
 * Componente reutilizable para mostrar contenido educativo en la columna lateral
 */
export const EducationalSidebar: React.FC<EducationalSidebarProps> = ({
  content,
  loading,
  error,
  title = "Configuración Avanzada",
  additionalContent,
  className = '',
  maxHeight = 'calc(100vh-200px)'
}) => {
  return (
    <div className={`w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 overflow-y-auto hide-scrollbar ${className}`} style={{ maxHeight }}>
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 text-lg border-b pb-2">
          {title}
        </h3>
        
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-gray-600">Cargando...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center">
              <Info className="h-4 w-4 text-red-500 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && content && (
          <div className="space-y-4">
            {/* Título del contenido */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center mb-2">
                <BookOpen className="h-4 w-4 text-blue-600 mr-2" />
                <h4 className="font-medium text-sm text-blue-700">{content.title}</h4>
              </div>
              
              {/* Descripción general */}
              <div className="text-xs text-blue-600 mb-3">
                <p>{content.generalDescription}</p>
              </div>
              
              {/* Explicación de tipos */}
              <div className="text-xs text-blue-600">
                <div className="font-medium mb-1">Detalles:</div>
                <div className="whitespace-pre-line">
                  {content.typeExplanation}
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !content && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center">
              <Info className="h-4 w-4 text-yellow-500 mr-2" />
              <p className="text-sm text-yellow-700">
                No se encontró contenido educativo. Ve a Configuraciones para personalizar esta información.
              </p>
            </div>
          </div>
        )}

        {/* Contenido adicional personalizable */}
        {additionalContent}
      </div>
    </div>
  );
};

export default EducationalSidebar;
