'use client';

import { Edit2, Plus, Save, Target, Trash2, Users, X, X as XIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface AgeOption {
  id: string;
  label: string;
  isDisqualifying: boolean;
  isEnabled: boolean;
  isEditing?: boolean;
}

// 🎯 NUEVA INTERFAZ PARA CUOTAS DE EDAD
interface AgeQuota {
  id: string;
  ageRange: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
}

interface AgeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (validAges: string[], disqualifyingAges: string[]) => void;
  // 🎯 NUEVAS PROPS PARA CUOTAS
  onQuotasSave?: (quotas: AgeQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  initialValidAges?: string[];
  initialDisqualifyingAges?: string[];
  // 🎯 NUEVAS PROPS PARA CUOTAS
  initialQuotas?: AgeQuota[];
  quotasEnabled?: boolean;
}

const AgeConfigModal: React.FC<AgeConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  initialValidAges = [],
  initialDisqualifyingAges = [],
  initialQuotas = [],
  quotasEnabled = false
}) => {
  const [ageOptions, setAgeOptions] = useState<AgeOption[]>([]);
  const [newOption, setNewOption] = useState('');
  const [editingOption, setEditingOption] = useState<string | null>(null);

  // 🎯 NUEVOS ESTADOS PARA CUOTAS
  const [quotas, setQuotas] = useState<AgeQuota[]>([]);
  const [quotasEnabledState, setQuotasEnabledState] = useState(quotasEnabled);
  const [activeTab, setActiveTab] = useState<'options' | 'quotas'>('options');

  // Opciones predefinidas
  const predefinedOptions = [
    { label: '18-24', id: '18-24' },
    { label: '25-34', id: '25-34' },
    { label: '35-44', id: '35-44' },
    { label: '45-54', id: '45-54' },
    { label: '55-64', id: '55-64' },
    { label: '65+', id: '65+' }
  ];

  useEffect(() => {
    if (isOpen) {
      // Inicializar con opciones predefinidas
      // Solo agregar opciones que estén en initialValidAges o initialDisqualifyingAges como activadas
      const allInitialAges = [...initialValidAges, ...initialDisqualifyingAges];
      const initialOptions = predefinedOptions.map(option => ({
        ...option,
        isDisqualifying: initialDisqualifyingAges.includes(option.label),
        isEnabled: allInitialAges.includes(option.label),
        isEditing: false
      }));

      // Agregar opciones personalizadas existentes
      const customOptions = [
        ...initialValidAges.filter(age => !predefinedOptions.find(p => p.label === age)),
        ...initialDisqualifyingAges.filter(age => !predefinedOptions.find(p => p.label === age))
      ].map(age => ({
        id: `custom-${Date.now()}-${Math.random()}`,
        label: age,
        isDisqualifying: initialDisqualifyingAges.includes(age),
        isEnabled: true,
        isEditing: false
      }));

      setAgeOptions([...initialOptions, ...customOptions]);

      // 🎯 INICIALIZAR CUOTAS con migración automática para retrocompatibilidad
      const migratedQuotas = initialQuotas.map(quota => ({
        ...quota,
        // Migración: Si no tiene quotaType, asignar 'absolute' por defecto
        quotaType: quota.quotaType || 'absolute'
      }));
      setQuotas(migratedQuotas);
      setQuotasEnabledState(quotasEnabled);
    }
  }, [isOpen, initialValidAges, initialDisqualifyingAges, initialQuotas, quotasEnabled]);

  const handleToggleDisqualifying = (id: string) => {
    setAgeOptions(prev =>
      prev.map(option =>
        option.id === id
          ? { ...option, isDisqualifying: !option.isDisqualifying }
          : option
      )
    );
  };

  const handleToggleEnabled = (id: string) => {
    setAgeOptions(prev =>
      prev.map(option =>
        option.id === id
          ? { ...option, isEnabled: !option.isEnabled }
          : option
      )
    );
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      const newAgeOption: AgeOption = {
        id: `custom-${Date.now()}`,
        label: newOption.trim(),
        isDisqualifying: false,
        isEnabled: true,
        isEditing: false
      };
      setAgeOptions(prev => [...prev, newAgeOption]);
      setNewOption('');
    }
  };

  const handleEditStart = (id: string) => {
    setEditingOption(id);
    setAgeOptions(prev =>
      prev.map(option =>
        option.id === id ? { ...option, isEditing: true } : option
      )
    );
  };

  const handleEditSave = (id: string, newLabel: string) => {
    if (newLabel.trim()) {
      setAgeOptions(prev =>
        prev.map(option =>
          option.id === id
            ? { ...option, label: newLabel.trim(), isEditing: false }
            : option
        )
      );
      setEditingOption(null);
    }
  };

  const handleEditCancel = (id: string) => {
    setAgeOptions(prev =>
      prev.map(option =>
        option.id === id ? { ...option, isEditing: false } : option
      )
    );
    setEditingOption(null);
  };

  const handleDelete = (id: string) => {
    setAgeOptions(prev => prev.filter(option => option.id !== id));
  };

  // 🎯 NUEVAS FUNCIONES PARA MANEJAR CUOTAS
  const handleAddQuota = () => {
    // Solo permitir agregar cuotas para opciones activas que no están descalificando y que aún no tienen cuota
    const agesWithQuotas = quotas.map(q => q.ageRange);
    const availableAges = ageOptions.filter(
      option => option.isEnabled && !option.isDisqualifying && !agesWithQuotas.includes(option.label)
    );

    if (availableAges.length === 0) {
      return; // No hay rangos de edad disponibles
    }

    const newQuota: AgeQuota = {
      id: `quota-${Date.now()}`,
      ageRange: availableAges[0].label,
      quota: 1,
      quotaType: 'absolute',
      isActive: true
    };
    setQuotas(prev => [...prev, newQuota]);
  };

  const handleUpdateQuota = (id: string, field: keyof AgeQuota, value: any) => {
    setQuotas(prev =>
      prev.map(quota =>
        quota.id === id ? { ...quota, [field]: value } : quota
      )
    );
  };

  const handleDeleteQuota = (id: string) => {
    setQuotas(prev => prev.filter(quota => quota.id !== id));
  };

  const handleToggleQuotasEnabled = () => {
    const newState = !quotasEnabledState;
    setQuotasEnabledState(newState);
    onQuotasToggle?.(newState);
  };

  const handleSave = () => {
    const validAges = ageOptions
      .filter(option => option.isEnabled && !option.isDisqualifying)
      .map(option => option.label);

    const disqualifyingAges = ageOptions
      .filter(option => option.isEnabled && option.isDisqualifying)
      .map(option => option.label);

    onSave(validAges, disqualifyingAges);

    // 🎯 GUARDAR CUOTAS SI ESTÁN HABILITADAS
    if (quotasEnabledState && onQuotasSave) {
      onQuotasSave(quotas);
    }

    onClose();
  };

  const validOptionsCount = ageOptions.filter(option => option.isEnabled && !option.isDisqualifying).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Configurar opciones de edad</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* 🎯 NUEVO: TABS PARA OPCIONES Y CUOTAS */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('options')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'options'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Target className="inline w-4 h-4 mr-2" />
            Opciones de Edad
          </button>
          <button
            onClick={() => setActiveTab('quotas')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'quotas'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Users className="inline w-4 h-4 mr-2" />
            Cuotas Dinámicas
          </button>
        </div>

        {/* 🎯 CONTENIDO DE TABS */}
        {activeTab === 'options' ? (
          <>
            <p className="text-gray-600 mb-6">
              Define los rangos de edad y usa el toggle para indicar si clasifican o desclasifican automáticamente.
            </p>

            {/* Lista de opciones */}
            <div className="space-y-3 mb-6">
              {ageOptions.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${!option.isEnabled
                    ? 'bg-gray-100 border-gray-300 opacity-60'
                    : option.isDisqualifying
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-gray-50 border-gray-200'
                    }`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    {/* Toggle para activar/desactivar */}
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-medium ${option.isEnabled ? 'text-gray-700' : 'text-gray-400'}`}>
                        {option.isEnabled ? 'Activa' : 'Inactiva'}
                      </span>
                      <button
                        onClick={() => handleToggleEnabled(option.id)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${option.isEnabled ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                        title={option.isEnabled ? 'Desactivar rango de edad' : 'Activar rango de edad'}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${option.isEnabled ? 'translate-x-5' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    {option.isEditing ? (
                      <input
                        type="text"
                        value={editingOption === option.id ? option.label : ''}
                        onChange={(e) => {
                          setAgeOptions(prev =>
                            prev.map(opt =>
                              opt.id === option.id ? { ...opt, label: e.target.value } : opt
                            )
                          );
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                        autoFocus
                        disabled={!option.isEnabled}
                      />
                    ) : (
                      <span className={`font-medium ${!option.isEnabled ? 'text-gray-400' : ''}`}>{option.label}</span>
                    )}

                    {/* Toggle Switch para Clasifica/Desclasifica */}
                    {option.isEnabled && (
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${option.isDisqualifying ? 'text-orange-600' : 'text-green-600'}`}>
                          {option.isDisqualifying ? 'Desclasifica' : 'Clasifica'}
                        </span>
                        <button
                          onClick={() => handleToggleDisqualifying(option.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${option.isDisqualifying ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${option.isDisqualifying ? 'translate-x-6' : 'translate-x-1'
                              }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center space-x-2">
                    {option.isEditing ? (
                      <>
                        <button
                          onClick={() => handleEditSave(option.id, option.label)}
                          className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Guardar"
                          disabled={!option.isEnabled}
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={() => handleEditCancel(option.id)}
                          className="p-1 text-gray-600 hover:text-gray-800"
                          title="Cancelar"
                        >
                          <XIcon size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditStart(option.id)}
                          className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Editar"
                          disabled={!option.isEnabled}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(option.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
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
                onKeyPress={(e) => e.key === 'Enter' && handleAddOption()}
              />
              <button
                onClick={handleAddOption}
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

            {/* Validación */}
            {validOptionsCount === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 text-sm">
                  ⚠️ Debes tener al menos una opción que clasifique para que los participantes puedan participar.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* 🎯 NUEVA SECCIÓN: CONFIGURACIÓN DE CUOTAS */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Sistema de Cuotas por Edad</h3>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">Habilitar cuotas</span>
                  <button
                    onClick={handleToggleQuotasEnabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${quotasEnabledState ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${quotasEnabledState ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </div>

              {quotasEnabledState ? (
                <>
                  <p className="text-gray-600 mb-4">
                    Configura cuotas específicas por rango de edad. Cuando se alcance la cuota de un rango,
                    los participantes de esa edad serán descalificados automáticamente.
                  </p>

                  {/* Lista de cuotas */}
                  <div className="space-y-3 mb-4">
                    {quotas.map((quota) => {
                      const agesWithQuotas = quotas.map(q => q.ageRange);
                      const availableAges = ageOptions.filter(
                        option => option.isEnabled && !option.isDisqualifying && (!agesWithQuotas.includes(option.label) || option.label === quota.ageRange)
                      );
                      const isOrphanQuota = quota.ageRange && !ageOptions.find(
                        option => option.label === quota.ageRange && option.isEnabled
                      );

                      return (
                        <React.Fragment key={quota.id}>
                        <div
                          className={`flex items-center space-x-4 p-4 rounded-lg border ${isOrphanQuota ? 'bg-amber-50 border-amber-300' : 'bg-gray-50'}`}
                        >
                          <div className="flex-1 grid grid-cols-3 gap-4">
                            {/* Rango de edad */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rango de Edad
                              </label>
                              <select
                                value={quota.ageRange}
                                onChange={(e) => handleUpdateQuota(quota.id, 'ageRange', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Seleccionar rango</option>
                                {availableAges.map(option => (
                                  <option key={option.id} value={option.label}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                          {/* Tipo de cuota */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipo
                            </label>
                            <select
                              value={quota.quotaType}
                              onChange={(e) => {
                                const newType = e.target.value as 'absolute' | 'percentage';
                                handleUpdateQuota(quota.id, 'quotaType', newType);
                                // Si cambia a porcentaje y el valor es mayor a 100, ajustarlo
                                if (newType === 'percentage' && quota.quota > 100) {
                                  handleUpdateQuota(quota.id, 'quota', 50);
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="absolute">Número</option>
                              <option value="percentage">Porcentaje</option>
                            </select>
                          </div>

                          {/* Cuota */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {quota.quotaType === 'percentage' ? 'Porcentaje (%)' : 'Cantidad'}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={quota.quotaType === 'percentage' ? '0' : '1'}
                                max={quota.quotaType === 'percentage' ? '100' : undefined}
                                value={quota.quota}
                                onChange={(e) => {
                                  let value = parseInt(e.target.value) || 1;
                                  // Validar rangos según el tipo
                                  if (quota.quotaType === 'percentage') {
                                    value = Math.max(0, Math.min(100, value));
                                  } else {
                                    value = Math.max(1, value);
                                  }
                                  handleUpdateQuota(quota.id, 'quota', value);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {quota.quotaType === 'percentage' && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                                  %
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Estado activo/inactivo */}
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${quota.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                            {quota.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                          <button
                            onClick={() => handleUpdateQuota(quota.id, 'isActive', !quota.isActive)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${quota.isActive ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${quota.isActive ? 'translate-x-5' : 'translate-x-1'
                                }`}
                            />
                          </button>
                        </div>

                        {/* Botón eliminar */}
                        <button
                          onClick={() => handleDeleteQuota(quota.id)}
                          className="p-2 text-red-600 hover:text-red-800"
                          title="Eliminar cuota"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {isOrphanQuota && (
                        <div className="mt-2 px-4 pb-2 text-sm text-amber-700">
                          Este rango de edad está desactivado. Esta cuota no se aplicará hasta que el rango sea activado nuevamente.
                        </div>
                      )}
                      </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Agregar nueva cuota */}
                  <button
                    onClick={handleAddQuota}
                    disabled={quotas.length >= ageOptions.filter(o => o.isEnabled && !o.isDisqualifying).length}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-600"
                    title={quotas.length >= ageOptions.filter(o => o.isEnabled && !o.isDisqualifying).length ? 'Ya agregaste cuotas para todos los rangos de edad habilitados' : 'Agregar nueva cuota'}
                  >
                    <Plus size={16} />
                    <span>Agregar nueva cuota</span>
                  </button>

                  {quotas.length >= ageOptions.filter(o => o.isEnabled && !o.isDisqualifying).length && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Has configurado cuotas para todos los rangos de edad habilitados
                    </p>
                  )}

                  {/* Información sobre cuotas */}
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">💡 Cómo funcionan las cuotas:</h4>
                    <ul className="text-yellow-700 text-sm space-y-1">
                      <li>• Cada rango de edad puede tener su propia cuota (número absoluto o porcentaje)</li>
                      <li>• <strong>Porcentajes:</strong> Se calculan sobre el total de participantes esperados</li>
                      <li>• El sistema automáticamente contará los participantes que se registren</li>
                      <li>• Cuando se alcance la cuota, los participantes de esa edad serán descalificados automáticamente</li>
                      <li>• <strong className="text-orange-800">⚠️ Rangos sin cuota asignada:</strong> Si un rango habilitado no tiene cuota configurada, <strong>NO se le aplicará ningún límite</strong> y podrá recibir participantes sin restricción</li>
                      <li>• Las cuotas inactivas no afectan la descalificación</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Habilita el sistema de cuotas para configurar límites por rango de edad</p>

                  {/* Mensaje informativo sobre caída natural */}
                  <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-left max-w-2xl mx-auto">
                    <h4 className="font-semibold text-amber-800 mb-2 flex items-center">
                      <span className="mr-2">⚠️</span>
                      Importante: Distribución por "caída natural"
                    </h4>
                    <p className="text-amber-700 text-sm space-y-2">
                      <span className="block">
                        Los <strong>filtros previos de edad</strong> (rangos válidos y descalificantes) configurados en la pestaña
                        "Opciones de Edad" <strong>seguirán activos</strong>.
                      </span>
                      <span className="block">
                        Sin embargo, si <strong>no habilitas esta sección</strong>, la distribución de participantes
                        <strong> dentro de los rangos de edad válidos</strong> será por <strong>"caída natural"</strong> (orden de llegada),
                        lo que <strong>no garantiza</strong> que se completen cuotas específicas por rango de edad.
                      </span>
                      <span className="block">
                        Para asegurar una distribución controlada con cuotas específicas por rango de edad, habilita el sistema de cuotas dinámicas.
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Botones de acción */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={validOptionsCount === 0}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgeConfigModal;
