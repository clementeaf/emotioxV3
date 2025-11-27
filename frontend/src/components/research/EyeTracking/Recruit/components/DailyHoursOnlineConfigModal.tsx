import { Check, Clock, Plus, Target, Trash2, Users, X, X as XIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface HoursOption {
  id: string;
  name: string;
  isQualified: boolean;
  isCustom?: boolean;
}

// 🎯 NUEVA INTERFAZ PARA CUOTAS DE HORAS DIARIAS EN LÍNEA
interface DailyHoursOnlineQuota {
  id: string;
  hoursRange: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
}

interface DailyHoursOnlineConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (options: HoursOption[], disqualified: string[]) => void;
  // 🎯 NUEVAS PROPS PARA CUOTAS
  onQuotasSave?: (quotas: DailyHoursOnlineQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  currentOptions?: HoursOption[];
  currentDisqualified?: string[];
  // 🎯 NUEVAS PROPS PARA CUOTAS
  initialQuotas?: DailyHoursOnlineQuota[];
  quotasEnabled?: boolean;
}

const DEFAULT_HOURS_RANGES: HoursOption[] = [
  { id: '0-2', name: '0-2 horas', isQualified: true },
  { id: '2-4', name: '2-4 horas', isQualified: true },
  { id: '4-6', name: '4-6 horas', isQualified: true },
  { id: '6-8', name: '6-8 horas', isQualified: true },
  { id: '8+', name: 'Más de 8 horas', isQualified: true }
];

export const DailyHoursOnlineConfigModal: React.FC<DailyHoursOnlineConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  currentOptions = DEFAULT_HOURS_RANGES,
  currentDisqualified = [],
  initialQuotas = [],
  quotasEnabled = false
}) => {
  const [options, setOptions] = useState<HoursOption[]>(currentOptions);
  const [disqualified, setDisqualified] = useState<string[]>(currentDisqualified);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // 🎯 NUEVOS ESTADOS PARA CUOTAS
  const [quotas, setQuotas] = useState<DailyHoursOnlineQuota[]>([]);
  const [quotasEnabledState, setQuotasEnabledState] = useState(quotasEnabled);
  const [activeTab, setActiveTab] = useState<'options' | 'quotas'>('options');

  useEffect(() => {
    if (isOpen) {
      setOptions(currentOptions);
      setDisqualified(currentDisqualified);
      // 🎯 INICIALIZAR CUOTAS con migración automática para retrocompatibilidad
      const migratedQuotas = initialQuotas.map(quota => ({
        ...quota,
        // Migración: Si no tiene quotaType, asignar 'absolute' por defecto
        quotaType: quota.quotaType || 'absolute'
      }));
      setQuotas(migratedQuotas);
      setQuotasEnabledState(quotasEnabled);
    }
  }, [isOpen, currentOptions, currentDisqualified, initialQuotas, quotasEnabled]);

  const handleToggleQualification = (hoursId: string) => {
    setOptions(prev =>
      prev.map(option =>
        option.id === hoursId
          ? { ...option, isQualified: !option.isQualified }
          : option
      )
    );

    setDisqualified(prev =>
      prev.includes(hoursId)
        ? prev.filter(id => id !== hoursId)
        : [...prev, hoursId]
    );
  };

  const handleEditStart = (option: HoursOption) => {
    setEditingId(option.id);
    setEditValue(option.name);
  };

  const handleEditSave = () => {
    if (editingId && editValue.trim()) {
      setOptions(prev =>
        prev.map(option =>
          option.id === editingId
            ? { ...option, name: editValue.trim() }
            : option
        )
      );
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAddCustom = () => {
    const newId = `custom-${Date.now()}`;
    const newOption: HoursOption = {
      id: newId,
      name: 'Nuevo rango de horas',
      isQualified: true,
      isCustom: true
    };
    setOptions(prev => [...prev, newOption]);
    setEditingId(newId);
    setEditValue('Nuevo rango de horas');
  };

  const handleDelete = (hoursId: string) => {
    setOptions(prev => prev.filter(option => option.id !== hoursId));
    setDisqualified(prev => prev.filter(id => id !== hoursId));
  };

  // 🎯 NUEVAS FUNCIONES PARA MANEJAR CUOTAS
  const handleAddQuota = () => {
    // Solo permitir agregar cuotas para opciones calificadas que aún no tienen cuota
    const rangesWithQuotas = quotas.map(q => q.hoursRange);
    const availableRanges = options.filter(
      option => option.isQualified && !rangesWithQuotas.includes(option.name)
    );

    if (availableRanges.length === 0) {
      return; // No hay rangos de horas disponibles
    }

    const newQuota: DailyHoursOnlineQuota = {
      id: `quota-${Date.now()}`,
      hoursRange: availableRanges[0].name,
      quota: 1,
      quotaType: 'absolute',
      isActive: true
    };
    setQuotas(prev => [...prev, newQuota]);
  };

  const handleUpdateQuota = (id: string, field: keyof DailyHoursOnlineQuota, value: any) => {
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
    const qualifiedOptions = options.filter(option => option.isQualified);
    const disqualifiedIds = options
      .filter(option => !option.isQualified)
      .map(option => option.id);

    onSave(qualifiedOptions, disqualifiedIds);

    // 🎯 GUARDAR CUOTAS SI ESTÁN HABILITADAS
    if (quotasEnabledState && onQuotasSave) {
      onQuotasSave(quotas);
    }

    onClose();
  };

  const qualifiedCount = options.filter(option => option.isQualified).length;
  const totalCount = options.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Configurar Horas Diarias en Línea
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 🎯 NUEVO: TABS PARA OPCIONES Y CUOTAS */}
        <div className="flex space-x-1 p-6 bg-gray-100">
          <button
            onClick={() => setActiveTab('options')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'options'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Target className="inline w-4 h-4 mr-2" />
            Opciones de Horas
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
          <div className="p-6">
            {/* Statistics */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-900">
                  Rangos calificados: {qualifiedCount}/{totalCount}
                </span>
                <span className="text-xs text-blue-600">
                  {Math.round((qualifiedCount / totalCount) * 100)}% válidos
                </span>
              </div>
            </div>

            {/* Hours Options */}
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
                      className={`w-10 h-6 rounded-full transition-colors ${option.isQualified
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                        }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full transition-transform ${option.isQualified ? 'translate-x-5' : 'translate-x-1'
                          }`}
                      />
                    </button>

                    {/* Name */}
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
                        <span className={`text-sm ${option.isQualified ? 'text-gray-900' : 'text-gray-500 line-through'
                          }`}>
                          {option.name}
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
                    {editingId !== option.id && (
                      <>
                        <button
                          onClick={() => handleEditStart(option)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {option.isCustom && (
                          <button
                            onClick={() => handleDelete(option.id)}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
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
                onClick={handleAddCustom}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Plus size={16} />
                <span className="text-sm">Agregar rango personalizado</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* 🎯 NUEVA SECCIÓN: CONFIGURACIÓN DE CUOTAS */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Sistema de Cuotas por Horas Diarias en Línea</h3>
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
                    Configura cuotas específicas por rango de horas diarias en línea. Cuando se alcance la cuota de un rango de horas,
                    los participantes de ese rango serán descalificados automáticamente.
                  </p>

                  {/* Lista de cuotas */}
                  <div className="space-y-3 mb-4">
                    {quotas.map((quota) => {
                      const rangesWithQuotas = quotas.map(q => q.hoursRange);
                      const availableRanges = options.filter(
                        option => option.isQualified && (!rangesWithQuotas.includes(option.name) || option.name === quota.hoursRange)
                      );

                      return (
                        <div
                          key={quota.id}
                          className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex-1 grid grid-cols-3 gap-4">
                            {/* Rango de Horas */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rango de Horas
                              </label>
                              <select
                                value={quota.hoursRange}
                                onChange={(e) => handleUpdateQuota(quota.id, 'hoursRange', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Seleccionar rango de horas</option>
                                {availableRanges.map(option => (
                                  <option key={option.id} value={option.name}>
                                    {option.name}
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
                          <XIcon size={16} />
                        </button>
                      </div>
                      );
                    })}
                  </div>

                  {/* Agregar nueva cuota */}
                  <button
                    onClick={handleAddQuota}
                    disabled={quotas.length >= options.filter(o => o.isQualified).length}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-600"
                    title={quotas.length >= options.filter(o => o.isQualified).length ? 'Ya agregaste cuotas para todos los rangos de horas habilitados' : 'Agregar nueva cuota'}
                  >
                    <Clock size={16} />
                    <span>Agregar nueva cuota</span>
                  </button>

                  {quotas.length >= options.filter(o => o.isQualified).length && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      Has configurado cuotas para todos los rangos de horas habilitados
                    </p>
                  )}

                  {/* Información sobre cuotas */}
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">💡 Cómo funcionan las cuotas:</h4>
                    <ul className="text-yellow-700 text-sm space-y-1">
                      <li>• Cada rango de horas puede tener su propia cuota (número absoluto o porcentaje)</li>
                      <li>• <strong>Porcentajes:</strong> Se calculan sobre el total de participantes esperados</li>
                      <li>• El sistema automáticamente contará los participantes que se registren</li>
                      <li>• Cuando se alcance la cuota, los participantes de ese rango serán descalificados automáticamente</li>
                      <li>• <strong className="text-orange-800">⚠️ Rangos sin cuota asignada:</strong> Si un rango habilitado no tiene cuota configurada, <strong>NO se le aplicará ningún límite</strong> y podrá recibir participantes sin restricción</li>
                      <li>• Las cuotas inactivas no afectan la descalificación</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Habilita el sistema de cuotas para configurar límites por rango de horas diarias en línea</p>

                  {/* Mensaje informativo sobre caída natural */}
                  <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-left max-w-2xl mx-auto">
                    <h4 className="font-semibold text-amber-800 mb-2 flex items-center">
                      <span className="mr-2">⚠️</span>
                      Importante: Distribución por "caída natural"
                    </h4>
                    <p className="text-amber-700 text-sm space-y-2">
                      <span className="block">
                        Los <strong>filtros previos de horas diarias en línea</strong> (opciones válidas y descalificantes) configurados en la pestaña
                        "Opciones de Horas en Línea" <strong>seguirán activos</strong>.
                      </span>
                      <span className="block">
                        Sin embargo, si <strong>no habilitas esta sección</strong>, la distribución de participantes
                        <strong> dentro de los rangos de horas válidos</strong> será por <strong>"caída natural"</strong> (orden de llegada),
                        lo que <strong>no garantiza</strong> que se completen cuotas específicas por rango de horas.
                      </span>
                      <span className="block">
                        Para asegurar una distribución controlada con cuotas específicas por rango de horas diarias en línea, habilita el sistema de cuotas dinámicas.
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
