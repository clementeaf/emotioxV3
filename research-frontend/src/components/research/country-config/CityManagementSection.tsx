import { Globe, MapPin, Plus, Trash2 } from 'lucide-react';
import React from 'react';
import { CustomSelect } from '../../ui/CustomSelect';
import type { CityEntry } from './types';

interface CityManagementSectionProps {
  cities: CityEntry[];
  cityInput: string;
  cityCountry: string;
  qualifyingCountries: string[];
  onCityInputChange: (value: string) => void;
  onCityCountryChange: (value: string) => void;
  onAddCity: () => void;
  onRemoveCity: (cityName: string) => void;
  onToggleCityDisqualifying: (cityName: string) => void;
  onCityInputKeyDown: (e: React.KeyboardEvent) => void;
}

export const CityManagementSection: React.FC<CityManagementSectionProps> = ({
  cities,
  cityInput,
  cityCountry,
  qualifyingCountries,
  onCityInputChange,
  onCityCountryChange,
  onAddCity,
  onRemoveCity,
  onToggleCityDisqualifying,
  onCityInputKeyDown
}) => {
  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={16} className="text-blue-600" />
        <span className="text-sm font-medium text-gray-900">Configured cities</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Add the cities the participant will be able to select. If you don't add any, a free text field will be shown.
      </p>
      <div className="flex gap-2 mb-3">
        <div className="w-40">
          <CustomSelect
            options={qualifyingCountries.map(country => ({ value: country, label: country }))}
            value={cityCountry}
            onChange={onCityCountryChange}
            placeholder="Country (optional)"
          />
        </div>
        <input
          type="text"
          value={cityInput}
          onChange={(e) => onCityInputChange(e.target.value)}
          onKeyDown={onCityInputKeyDown}
          placeholder="City name..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onAddCity}
          disabled={!cityInput.trim() || cities.some(c => c.name === cityInput.trim())}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      {cities.length > 0 ? (
        <div className="space-y-2">
          {cities.map(city => (
            <div
              key={city.name}
              className={`flex items-center justify-between p-2.5 rounded-lg border ${
                city.isDisqualifying
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-gray-400" />
                <span className="text-sm font-medium">{city.name}</span>
                {city.country && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Globe size={10} />
                    {city.country}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Toggle Clasifica/Desclasifica */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${city.isDisqualifying ? 'text-orange-600' : 'text-green-600'}`}>
                    {city.isDisqualifying ? 'Disqualify' : 'Qualify'}
                  </span>
                  <button
                    onClick={() => onToggleCityDisqualifying(city.name)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      city.isDisqualifying ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        city.isDisqualifying ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <button
                  onClick={() => onRemoveCity(city.name)}
                  className="p-1 text-red-500 hover:text-red-700 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">No cities — the participant will see a free text field.</p>
      )}
    </div>
  );
};
