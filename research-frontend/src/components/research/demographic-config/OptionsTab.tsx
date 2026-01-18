/**
 * Componente de tab para gestionar opciones demográficas
 * 
 * Renderiza la lista de opciones con capacidad de editar, eliminar
 * y calificar/descalificar opciones.
 */

import { Check, X as XIcon } from 'lucide-react';
import React from 'react';
import type {
  BaseDemographicOption,
  UseDemographicConfigReturn
} from './types';

interface OptionsTabProps<TOption extends BaseDemographicOption> {
  config: UseDemographicConfigReturn<TOption>;
  statisticsLabel?: string;
  addCustomOptionText?: string;
  onAddCustom: () => void;
}

/**
 * Tab de opciones para configuración demográfica
 */
export function OptionsTab<TOption extends BaseDemographicOption>({
  config,
  statisticsLabel,
  addCustomOptionText = 'Agregar opción personalizada',
  onAddCustom
}: OptionsTabProps<TOption>): React.ReactElement {
  const {
    options,
    editingId,
    editValue,
    setEditValue,
    handleToggleQualification,
    handleEditStart,
    handleEditSave,
    handleEditCancel,
    handleDelete,
    qualifiedCount,
    totalCount
  } = config;

  return (
    <div className="p-6">
      {/* Statistics */}
      {statisticsLabel && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-900">
              {statisticsLabel}: {qualifiedCount}/{totalCount}
            </span>
            <span className="text-xs text-blue-600">
              {Math.round((qualifiedCount / totalCount) * 100)}% válidos
            </span>
          </div>
        </div>
      )}

      {/* Options List */}
      <div className="space-y-3">
        {options.map((option) => (
          <div
            key={option.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-3 flex-1">
              {/* Toggle */}
              <button
                onClick={() => handleToggleQualification(option.id)}
                className={`w-10 h-6 rounded-full transition-colors ${
                  option.isQualified ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    option.isQualified ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>

              {/* Label */}
              <div className="flex-1">
                {editingId === option.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave();
                      if (e.key === 'Escape') handleEditCancel();
                    }}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    autoFocus
                  />
                ) : (
                  <span
                    className={`text-sm ${
                      option.isQualified
                        ? 'text-gray-900'
                        : 'text-gray-500 line-through'
                    }`}
                  >
                    {option.label}
                  </span>
                )}
              </div>

              {/* Status Icon */}
              {option.isQualified ? (
                <Check size={16} className="text-green-500" />
              ) : (
                <XIcon size={16} className="text-red-500" />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 ml-3">
              {editingId === option.id ? (
                <>
                  <button
                    onClick={handleEditSave}
                    className="p-1 text-green-600 hover:text-green-800"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="p-1 text-gray-600 hover:text-gray-800"
                  >
                    <XIcon size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleEditStart(option)}
                    className="p-1 text-blue-600 hover:text-blue-800"
                  >
                    Editar
                  </button>
                  {option.isCustom && (
                    <button
                      onClick={() => handleDelete(option.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Custom Option */}
      <div className="mt-4">
        <button
          onClick={onAddCustom}
          className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
        >
          + {addCustomOptionText}
        </button>
      </div>
    </div>
  );
}
