/**
 * Componente de tab para gestionar cuotas demográficas
 * 
 * Renderiza la configuración de cuotas con capacidad de agregar,
 * editar, eliminar y activar/desactivar cuotas.
 */

import { Users, X as XIcon } from 'lucide-react';
import React from 'react';
import type {
  BaseDemographicOption,
  BaseDemographicQuota,
  UseQuotaManagementReturn
} from './types';

interface QuotasTabProps<
  TOption extends BaseDemographicOption,
  TQuota extends BaseDemographicQuota
> {
  options: TOption[];
  quotaConfig: UseQuotaManagementReturn<TQuota>;
  quotasTitle?: string;
  quotasDescription?: string;
  quotasInfoTitle?: string;
  quotasInfoItems?: string[];
  quotasDisabledMessage?: string;
  quotasDisabledInfoTitle?: string;
  quotasDisabledInfoText?: string[];
  getAvailableOptions: (options: TOption[]) => TOption[];
  getQuotaFieldValue: (option: TOption) => string;
  getQuotaFieldLabel: (field: TQuota['field']) => string;
  fieldSelectLabel?: string;
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
}

/**
 * Tab de cuotas para configuración demográfica
 */
export function QuotasTab<
  TOption extends BaseDemographicOption,
  TQuota extends BaseDemographicQuota
>({
  options,
  quotaConfig,
  quotasTitle = 'Sistema de Cuotas',
  quotasDescription,
  quotasInfoTitle = 'Cómo funcionan las cuotas:',
  quotasInfoItems = [],
  quotasDisabledMessage = 'Habilita el sistema de cuotas para configurar límites',
  quotasDisabledInfoTitle,
  quotasDisabledInfoText = [],
  getAvailableOptions,
  getQuotaFieldValue,
  getQuotaFieldLabel: _getQuotaFieldLabel,
  fieldSelectLabel = 'Seleccionar opción',
  Icon = Users
}: QuotasTabProps<TOption, TQuota>): React.ReactElement {
  const {
    quotas,
    quotasEnabled,
    handleAddQuota,
    handleUpdateQuota,
    handleDeleteQuota,
    handleToggleQuotasEnabled
  } = quotaConfig;

  const availableOptions = getAvailableOptions(options);

  const handleAddQuotaClick = () => {
    const optionsWithQuotas = quotas.map(q => q.field);
    const available = availableOptions.filter(
      option => !optionsWithQuotas.includes(getQuotaFieldValue(option))
    );

    if (available.length > 0) {
      handleAddQuota(getQuotaFieldValue(available[0]));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{quotasTitle}</h3>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Habilitar cuotas</span>
            <button
              onClick={handleToggleQuotasEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                quotasEnabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  quotasEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {quotasEnabled ? (
          <>
            {quotasDescription && (
              <p className="text-gray-600 mb-4">{quotasDescription}</p>
            )}

            {/* Quotas List */}
            <div className="space-y-3 mb-4">
              {quotas.map((quota) => {
                const fieldsWithQuotas = quotas.map(q => q.field);
                const available = availableOptions.filter(
                  option =>
                    !fieldsWithQuotas.includes(getQuotaFieldValue(option)) ||
                    getQuotaFieldValue(option) === quota.field
                );

                return (
                  <div
                    key={quota.id}
                    className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex-1 grid grid-cols-4 gap-4">
                      {/* Field Select */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {fieldSelectLabel}
                        </label>
                        <select
                          value={String(quota.field)}
                          onChange={(e) =>
                            handleUpdateQuota(quota.id, 'field', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Seleccionar</option>
                          {available.map((option) => (
                            <option
                              key={option.id}
                              value={getQuotaFieldValue(option)}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quota Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo
                        </label>
                        <select
                          value={quota.quotaType}
                          onChange={(e) => {
                            const newType = e.target.value as 'absolute' | 'percentage';
                            handleUpdateQuota(quota.id, 'quotaType', newType);
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

                      {/* Quota Value */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {quota.quotaType === 'percentage'
                            ? 'Porcentaje (%)'
                            : 'Cantidad'}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={quota.quotaType === 'percentage' ? '0' : '1'}
                            max={quota.quotaType === 'percentage' ? '100' : undefined}
                            value={quota.quota}
                            onChange={(e) => {
                              let value = parseInt(e.target.value) || 1;
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

                      {/* Enforcement Mode */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Aplicación
                        </label>
                        <select
                          value={quota.enforcementMode || 'immediate'}
                          onChange={(e) =>
                            handleUpdateQuota(quota.id, 'enforcementMode', e.target.value as 'immediate' | 'post_collection')
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="immediate">Descarte inmediato</option>
                          <option value="post_collection">Filtro posterior</option>
                        </select>
                      </div>
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-sm ${
                          quota.isActive ? 'text-green-600' : 'text-gray-500'
                        }`}
                      >
                        {quota.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                      <button
                        onClick={() =>
                          handleUpdateQuota(quota.id, 'isActive', !quota.isActive)
                        }
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          quota.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            quota.isActive ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Delete Button */}
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

            {/* Add Quota Button */}
            <button
              onClick={handleAddQuotaClick}
              disabled={
                quotas.length >=
                availableOptions.filter((o) => o.isQualified).length
              }
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-600"
              title={
                quotas.length >=
                availableOptions.filter((o) => o.isQualified).length
                  ? 'Ya agregaste cuotas para todas las opciones habilitadas'
                  : 'Agregar nueva cuota'
              }
            >
              <Icon size={16} />
              <span>Agregar nueva cuota</span>
            </button>

            {quotas.length >=
              availableOptions.filter((o) => o.isQualified).length && (
              <p className="text-center text-sm text-gray-500 mt-2">
                Has configurado cuotas para todas las opciones habilitadas
              </p>
            )}

            {/* Info Box */}
            {quotasInfoItems.length > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">
                  {quotasInfoTitle}
                </h4>
                <ul className="text-yellow-700 text-sm space-y-1">
                  {quotasInfoItems.map((item, index) => (
                    <li key={index}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">{quotasDisabledMessage}</p>

            {quotasDisabledInfoText.length > 0 && (
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-left max-w-2xl mx-auto">
                {quotasDisabledInfoTitle && (
                  <h4 className="font-semibold text-amber-800 mb-2 flex items-center">
                    <span className="mr-2">⚠️</span>
                    {quotasDisabledInfoTitle}
                  </h4>
                )}
                <div className="text-amber-700 text-sm space-y-2">
                  {quotasDisabledInfoText.map((text, index) => (
                    <span key={index} className="block">
                      {text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
