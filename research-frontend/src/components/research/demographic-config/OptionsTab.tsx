/**
 * Componente de tab para gestionar opciones demográficas
 *
 * Mismo patrón visual que AgeOptionsTab: toggle Clasifica/Desclasifica
 * con label, iconos de edición compactos.
 */

import { Edit2, Save, Trash2, X as XIcon } from 'lucide-react';
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
  addCustomOptionText = 'Add custom option',
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
              {totalCount > 0 ? Math.round((qualifiedCount / totalCount) * 100) : 0}% valid
            </span>
          </div>
        </div>
      )}

      <p className="text-gray-600 mb-6">
        Use the toggle to indicate whether each option qualifies or disqualifies the participant.
      </p>

      {/* Options List */}
      <div className="space-y-3">
        {options.map((option) => (
          <div
            key={option.id}
            className={`flex items-center gap-2 p-3 rounded-lg border ${
              option.isQualified
                ? 'bg-gray-50 border-gray-200'
                : 'bg-orange-50 border-orange-200'
            }`}
          >
            {/* Label */}
            {editingId === option.id ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSave();
                  if (e.key === 'Escape') handleEditCancel();
                }}
                className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-sm"
                autoFocus
              />
            ) : (
              <span className={`font-medium text-sm whitespace-nowrap ${!option.isQualified ? 'text-gray-500' : ''}`}>
                {option.label}
              </span>
            )}

            <div className="ml-auto flex items-center gap-2 shrink-0">
              {/* Toggle Clasifica/Desclasifica */}
              <span className={`text-xs whitespace-nowrap ${option.isQualified ? 'text-green-600' : 'text-orange-600'}`}>
                {option.isQualified ? 'Qualify' : 'Disqualify'}
              </span>
              <button
                onClick={() => handleToggleQualification(option.id)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  option.isQualified ? 'bg-green-500' : 'bg-orange-500'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    option.isQualified ? 'translate-x-1' : 'translate-x-5'
                  }`}
                />
              </button>

              {/* Acciones */}
              {editingId === option.id ? (
                <>
                  <button onClick={handleEditSave} className="p-1 text-green-600 hover:text-green-800" title="Save"><Save size={14} /></button>
                  <button onClick={handleEditCancel} className="p-1 text-gray-600 hover:text-gray-800" title="Cancel"><XIcon size={14} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => handleEditStart(option)} className="p-1 text-blue-600 hover:text-blue-800" title="Edit"><Edit2 size={14} /></button>
                  {option.isCustom && (
                    <button onClick={() => handleDelete(option.id)} className="p-1 text-red-600 hover:text-red-800" title="Delete"><Trash2 size={14} /></button>
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
