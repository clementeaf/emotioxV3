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
  quotasTitle = 'Quota System',
  quotasDescription,
  quotasInfoTitle = 'How quotas work:',
  quotasInfoItems = [],
  quotasDisabledMessage = 'Enable the quota system to configure limits',
  quotasDisabledInfoTitle,
  quotasDisabledInfoText = [],
  getAvailableOptions,
  getQuotaFieldValue,
  fieldSelectLabel = 'Select option',
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
            <span className="text-sm text-gray-600">Enable quotas</span>
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
                    <div className="flex-1 grid grid-cols-2 gap-4">
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
                          <option value="">Select</option>
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

                      {/* Quota Value (always percentage) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Percentage (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={quota.quota}
                            onChange={(e) => {
                              const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              handleUpdateQuota(quota.id, 'quota', value);
                            }}
                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-sm ${
                          quota.isActive ? 'text-green-600' : 'text-gray-500'
                        }`}
                      >
                        {quota.isActive ? 'Active' : 'Inactive'}
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
                      title="Delete quota"
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
                  ? 'Quotas already added for all enabled options'
                  : 'Add new quota'
              }
            >
              <Icon size={16} />
              <span>Add new quota</span>
            </button>

            {quotas.length >=
              availableOptions.filter((o) => o.isQualified).length && (
              <p className="text-center text-sm text-gray-500 mt-2">
                Quotas have been configured for all enabled options
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
