import React from 'react';

interface QuestionPreviewProps {
  title: string;
  description?: string;
  instructions?: string;
  type: string;
  config?: any;
  className?: string;
}

export const QuestionPreview: React.FC<QuestionPreviewProps> = ({
  title,
  description,
  instructions,
  type,
  config = {},
  className = ''
}) => {
  const renderPreviewContent = () => {
    switch (type) {
      case 'CSAT':
        return (
          <div className="flex justify-center gap-2">
            {config.type === 'stars' ? (
              // Estrellas
              Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="text-2xl text-gray-300">★</span>
              ))
            ) : (
              // Números 1-5
              <div className="flex gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded bg-white text-gray-600">
                    {i + 1}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'CES':
        return (
          <div className="flex justify-between items-center gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex flex-col items-center">
                <input type="radio" disabled className="w-4 h-4 text-blue-600 cursor-not-allowed mb-1" />
                <span className="text-xs text-gray-600">{i + 1}</span>
              </div>
            ))}
          </div>
        );

      case 'CV':
        return (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600">{config.startLabel || 'Inicio'}</span>
              <span className="text-xs text-gray-600">{config.endLabel || 'Fin'}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              {Array.from(
                { length: (config.scaleRange?.end || 7) - (config.scaleRange?.start || 1) + 1 },
                (_, i) => (config.scaleRange?.start || 1) + i
              ).map((value) => (
                <div key={value} className="flex flex-col items-center">
                  <input type="radio" disabled className="w-4 h-4 text-blue-600 cursor-not-allowed mb-1" />
                  <span className="text-xs text-gray-600">{value}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'NPS':
        return (
          <div className="flex justify-between items-center gap-1">
            {Array.from(
              { length: (config.scaleRange?.end || 10) - (config.scaleRange?.start || 0) + 1 },
              (_, i) => (config.scaleRange?.start || 0) + i
            ).map((value) => (
              <div key={value} className="flex flex-col items-center">
                <div className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded bg-white text-xs text-gray-600">
                  {value}
                </div>
              </div>
            ))}
          </div>
        );

      case 'NEV':
        return (
          <div className="text-center text-xs text-gray-500 italic">
            Los participantes seleccionarán valores emocionales
          </div>
        );

      case 'VOC':
        return (
          <textarea
            disabled
            className="w-full h-24 p-3 rounded-lg bg-neutral-100 border border-gray-300 text-gray-400 cursor-not-allowed resize-none"
            placeholder="Espacio para comentarios del participante..."
          />
        );

      default:
        return (
          <div className="text-center text-xs text-gray-500 italic">
            Vista previa no disponible para este tipo
          </div>
        );
    }
  };

  return (
    <div className={`mt-5 bg-neutral-50 p-3 border border-gray-300 rounded-md ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Vista previa - Así verán esta pregunta los participantes
        <span className="ml-2 text-xs font-normal text-red-500">(NO EDITABLE)</span>
      </label>
      <div className="mt-2 text-sm text-gray-700 font-medium">{title || 'Título de la pregunta'}</div>
      {description && <div className="mt-1 text-sm text-gray-600">{description}</div>}
      {instructions && <div className="mt-1 text-xs text-gray-500">{instructions}</div>}

      {/* Renderizar vista previa según tipo */}
      <div className="mt-3">
        {renderPreviewContent()}
      </div>
    </div>
  );
};

export default QuestionPreview;
