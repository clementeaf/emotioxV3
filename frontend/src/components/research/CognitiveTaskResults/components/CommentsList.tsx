'use client';

import { BiSelectMultiple } from 'react-icons/bi';


import { SentimentResult } from '../types';

interface CommentsListProps {
  comments: SentimentResult[];
  selectedItems: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll?: () => void;
  questionId?: string;
  questionType?: string;
  required?: boolean;
  conditionalityDisabled?: boolean;
}

export function CommentsList({
  comments,
  selectedItems,
  onToggleSelection,
  onSelectAll,
  questionId,
  questionType,
  required = false,
  conditionalityDisabled = false
}: CommentsListProps) {

  // Debug logs
  // 🎯 FUNCIÓN PARA EXTRAER EL TEXTO REAL
  const extractTextValue = (text: any): string => {
    if (typeof text === 'string') {
      return text;
    }

    if (typeof text === 'object' && text !== null) {
      // Intentar extraer el valor de diferentes propiedades comunes
      if (text.value) {
        return String(text.value);
      }
      if (text.text) {
        return String(text.text);
      }
      if (text.response) {
        return String(text.response);
      }
      if (text.answer) {
        return String(text.answer);
      }
      // Si no hay propiedades conocidas, mostrar el objeto como JSON
      return JSON.stringify(text);
    }

    // Fallback para otros tipos
    return String(text);
  };

  return (
    <div className="border-r border-neutral-200 max-h-[500px] overflow-y-auto">
      {/* Fila de columnas de tabla */}
      <div className="p-4 border-b border-neutral-200 bg-neutral-50 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex gap-8">
            <span className="text-sm font-medium text-neutral-500">Comment</span>
            <span className="text-sm font-medium text-neutral-500">Mood</span>
          </div>
          <div>
            <button
              className="p-1 rounded-md hover:bg-neutral-200"
              onClick={onSelectAll}
              title="Select All"
            >
              <BiSelectMultiple className="w-5 h-5 text-neutral-600" />
            </button>
          </div>
        </div>
      </div>
      {/* Lista de comentarios */}
      {comments && comments.length > 0 ? (
        comments.map((comment, index) => (
          <div
            key={comment.id || `comment-${index}`}
            className={`p-4 border-b border-neutral-200 hover:bg-neutral-50 cursor-pointer ${selectedItems.includes(comment.id || `comment-${index}`) ? 'bg-blue-50 border-blue-200' : ''
              }`}
            onClick={() => onToggleSelection(comment.id || `comment-${index}`)}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(comment.id || `comment-${index}`)}
                  onChange={() => onToggleSelection(comment.id || `comment-${index}`)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <div className="text-sm text-neutral-900 mb-2">
                  {extractTextValue(comment.text)}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${comment.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    comment.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                      comment.sentiment === 'neutral' ? 'bg-gray-100 text-gray-700' :
                        comment.sentiment === 'green' ? 'bg-green-200 text-green-900' :
                          'bg-gray-100 text-gray-700'
                    }`}>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="p-8 text-center">
          <div className="text-neutral-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-neutral-500 font-medium">No hay comentarios disponibles</p>
          <p className="text-neutral-400 text-sm">Los comentarios aparecerán aquí cuando los participantes completen las encuestas</p>
        </div>
      )}
    </div>
  );
}
