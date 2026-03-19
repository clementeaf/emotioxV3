/**
 * Tab de opciones personalizado para AgeConfigModal
 * 
 * Maneja la lógica especial de isEnabled e isDisqualifying
 * que es diferente a los otros modales demográficos.
 */

import { Edit2, Plus, Save, Trash2, X as XIcon } from 'lucide-react';
import React from 'react';

interface AgeOption {
  id: string;
  label: string;
  isDisqualifying: boolean;
  isEnabled: boolean;
  isEditing?: boolean;
}

interface AgeOptionsTabProps {
  options: AgeOption[];
  setOptions: React.Dispatch<React.SetStateAction<AgeOption[]>>;
  newOption: string;
  setNewOption: (value: string) => void;
  editingOption: string | null;
  setEditingOption: (id: string | null) => void;
  onAddOption: () => void;
}

/**
 * Tab de opciones personalizado para edad
 */
export function AgeOptionsTab({
  options,
  setOptions,
  newOption,
  setNewOption,
  editingOption,
  setEditingOption,
  onAddOption
}: AgeOptionsTabProps): React.ReactElement {
  const handleToggleEnabled = (id: string) => {
    setOptions(prev =>
      prev.map(option =>
        option.id === id
          ? { ...option, isEnabled: !option.isEnabled }
          : option
      )
    );
  };

  const handleToggleDisqualifying = (id: string) => {
    setOptions(prev =>
      prev.map(option =>
        option.id === id
          ? { ...option, isDisqualifying: !option.isDisqualifying }
          : option
      )
    );
  };

  const handleEditStart = (id: string) => {
    setEditingOption(id);
    setOptions(prev =>
      prev.map(option =>
        option.id === id ? { ...option, isEditing: true } : option
      )
    );
  };

  const handleEditSave = (id: string, label: string) => {
    if (label.trim()) {
      setOptions(prev =>
        prev.map(option =>
          option.id === id
            ? { ...option, label: label.trim(), isEditing: false }
            : option
        )
      );
      setEditingOption(null);
    }
  };

  const handleEditCancel = (id: string) => {
    setOptions(prev =>
      prev.map(option =>
        option.id === id ? { ...option, isEditing: false } : option
      )
    );
    setEditingOption(null);
  };

  const handleDelete = (id: string) => {
    setOptions(prev => prev.filter(option => option.id !== id));
  };

  return (
    <>
      <p className="text-gray-600 mb-6">
        Define los rangos de edad y usa el toggle para indicar si clasifican o desclasifican automáticamente.
      </p>

      {/* Lista de opciones */}
      <div className="space-y-3 mb-6">
        {options.map((option) => (
          <div
            key={option.id}
            className={`flex items-center gap-2 p-3 rounded-lg border ${
              !option.isEnabled
                ? 'bg-gray-100 border-gray-300 opacity-60'
                : option.isDisqualifying
                ? 'bg-orange-50 border-orange-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            {/* Toggle activar/desactivar */}
            <button
              onClick={() => handleToggleEnabled(option.id)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                option.isEnabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              title={option.isEnabled ? 'Desactivar' : 'Activar'}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  option.isEnabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>

            {/* Label */}
            {editingOption === option.id ? (
              <input
                type="text"
                value={option.label}
                onChange={(e) => {
                  setOptions(prev =>
                    prev.map(opt =>
                      opt.id === option.id ? { ...opt, label: e.target.value } : opt
                    )
                  );
                }}
                className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-sm"
                autoFocus
                disabled={!option.isEnabled}
              />
            ) : (
              <span className={`font-medium text-sm whitespace-nowrap ${!option.isEnabled ? 'text-gray-400' : ''}`}>
                {option.label}
              </span>
            )}

            <div className="ml-auto flex items-center gap-2 shrink-0">
              {/* Toggle Clasifica/Desclasifica */}
              {option.isEnabled && (
                <>
                  <span className={`text-xs whitespace-nowrap ${option.isDisqualifying ? 'text-orange-600' : 'text-green-600'}`}>
                    {option.isDisqualifying ? 'Desclasifica' : 'Clasifica'}
                  </span>
                  <button
                    onClick={() => handleToggleDisqualifying(option.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      option.isDisqualifying ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        option.isDisqualifying ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </>
              )}

              {/* Acciones */}
              {editingOption === option.id ? (
                <>
                  <button onClick={() => handleEditSave(option.id, option.label)} className="p-1 text-green-600 hover:text-green-800" title="Guardar"><Save size={14} /></button>
                  <button onClick={() => handleEditCancel(option.id)} className="p-1 text-gray-600 hover:text-gray-800" title="Cancelar"><XIcon size={14} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => handleEditStart(option.id)} className="p-1 text-blue-600 hover:text-blue-800" title="Editar" disabled={!option.isEnabled}><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(option.id)} className="p-1 text-red-600 hover:text-red-800" title="Eliminar"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Agregar nueva opción */}
      <div className="flex space-x-2 mb-6">
        <input
          type="text"
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          placeholder="Nueva opción de edad (ej: 18-25)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => e.key === 'Enter' && onAddOption()}
        />
        <button
          onClick={onAddOption}
          disabled={!newOption.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Agregar</span>
        </button>
      </div>

      {/* Nota importante */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-800 mb-2">Nota:</h4>
        <p className="text-blue-700 text-sm">
          Las opciones marcadas como "Clasifica" se mostrarán a los participantes para seleccionar.
          Las opciones marcadas como "Desclasifica" excluirán automáticamente a los participantes de esas edades.
          Debes mantener al menos una opción que clasifique.
        </p>
      </div>
    </>
  );
}
