import { ChevronDown, ChevronRight, Edit2, Globe, Save, Search, Star, Trash2, X } from 'lucide-react';
import React from 'react';
import type { ContinentSection } from './types';

interface CountryOptionsTabProps {
  filteredSections: ContinentSection[];
  searchTerm: string;
  editingCountry: string | null;
  validCountriesCount: number;
  priorityCountriesCount: number;
  totalCountries: number;
  excludedContinentsCount: number;
  onSearchTermChange: (value: string) => void;
  onToggleContinentExclusion: (continentName: string) => void;
  onToggleContinentExpansion: (continentName: string) => void;
  onToggleCountryDisqualifying: (continentName: string, countryId: string) => void;
  onToggleCountryPriority: (continentName: string, countryId: string) => void;
  onEditStart: (continentName: string, countryId: string) => void;
  onEditSave: (continentName: string, countryId: string, newName: string) => void;
  onEditCancel: (continentName: string, countryId: string) => void;
  onDeleteCountry: (continentName: string, countryId: string) => void;
  onCountryNameChange: (sectionName: string, countryId: string, newName: string) => void;
}

export const CountryOptionsTab: React.FC<CountryOptionsTabProps> = ({
  filteredSections,
  searchTerm,
  editingCountry,
  validCountriesCount,
  priorityCountriesCount,
  totalCountries,
  excludedContinentsCount,
  onSearchTermChange,
  onToggleContinentExclusion,
  onToggleContinentExpansion,
  onToggleCountryDisqualifying,
  onToggleCountryPriority,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDeleteCountry,
  onCountryNameChange
}) => {
  return (
    <>
      <p className="text-gray-600 mb-6">
        Organize countries by continent. Exclude entire continents or exempt specific countries.
      </p>

      {/* Búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Search countries..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Estadísticas */}
      <div className="mb-6 grid grid-cols-4 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="font-medium text-blue-800">Total countries</div>
          <div className="text-blue-600">{totalCountries}</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="font-medium text-green-800">Valid countries</div>
          <div className="text-green-600">{validCountriesCount}</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="font-medium text-purple-800">Priority</div>
          <div className="text-purple-600">{priorityCountriesCount}</div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="font-medium text-orange-800">Excluded continents</div>
          <div className="text-orange-600">{excludedContinentsCount}</div>
        </div>
      </div>

      {/* Lista de continentes */}
      <div className="space-y-4 mb-6 overflow-y-auto max-h-[30vh]">
        {filteredSections.map((section) => (
          <div
            key={section.name}
            className={`border rounded-lg overflow-hidden ${section.isExcluded
              ? 'border-red-200 bg-red-50'
              : 'border-gray-200 bg-white'
              }`}
          >
            {/* Header del continente */}
            <div
              className={`p-4 cursor-pointer transition-colors ${section.isExcluded
                ? 'bg-red-100 hover:bg-red-200'
                : 'bg-gray-50 hover:bg-gray-100'
                }`}
              onClick={() => onToggleContinentExpansion(section.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleContinentExclusion(section.name);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${section.isExcluded ? 'bg-red-500' : 'bg-gray-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${section.isExcluded ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                  <div>
                    <div className="font-medium">{section.name}</div>
                    <div className="text-sm text-gray-500">
                      {section.countries.length} countries
                      {section.isExcluded && (
                        <span className="text-red-600 ml-2">(Excluded)</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${section.isExcluded ? 'text-red-600' : 'text-gray-600'}`}>
                    {section.isExcluded ? 'Excluded' : 'Included'}
                  </span>
                  {section.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </div>
            </div>

            {/* Lista de países del continente */}
            {section.isExpanded && (
              <div className="border-t border-gray-200">
                {section.countries.map((country) => (
                  <div
                    key={country.id}
                    className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 ${country.isDisqualifying
                      ? 'bg-orange-50'
                      : 'bg-white'
                      }`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {country.isEditing ? (
                        <input
                          type="text"
                          value={editingCountry === country.id ? country.name : ''}
                          onChange={(e) => {
                            onCountryNameChange(section.name, country.id, e.target.value);
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Globe size={16} className="text-gray-400" />
                          <span className="font-medium">{country.name}</span>
                        </div>
                      )}

                      {/* Toggle Switches */}
                      <div className="flex items-center space-x-4">
                        {/* Toggle Clasifica/Desclasifica */}
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${country.isDisqualifying ? 'text-orange-600' : 'text-green-600'}`}>
                            {country.isDisqualifying ? 'Disqualify' : 'Qualify'}
                          </span>
                          <button
                            onClick={() => onToggleCountryDisqualifying(section.name, country.id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${country.isDisqualifying ? 'bg-orange-500' : 'bg-green-500'
                              }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${country.isDisqualifying ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                          </button>
                        </div>

                        {/* Toggle Prioritario */}
                        {!country.isDisqualifying && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onToggleCountryPriority(section.name, country.id)}
                              className={`p-1 rounded transition-colors ${country.isPriority
                                ? 'text-purple-600 bg-purple-100'
                                : 'text-gray-400 hover:text-purple-400 hover:bg-purple-50'
                                }`}
                              title={country.isPriority ? 'Remove priority' : 'Mark as priority'}
                            >
                              <Star size={18} fill={country.isPriority ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center space-x-2">
                      {country.isEditing ? (
                        <>
                          <button
                            onClick={() => onEditSave(section.name, country.id, country.name)}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Save"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => onEditCancel(section.name, country.id)}
                            className="p-1 text-gray-600 hover:text-gray-800"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onEditStart(section.name, country.id)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => onDeleteCountry(section.name, country.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Nota importante */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-blue-800 mb-2">Note:</h4>
        <p className="text-blue-700 text-sm space-y-1">
          <span className="block">• Countries marked as &quot;Qualify&quot; will be shown to participants for selection.</span>
          <span className="block">• Countries marked as &quot;Disqualify&quot; will automatically exclude participants from those countries.</span>
          <span className="block">• Countries with <Star size={14} className="inline text-purple-600" fill="currentColor" /> <strong>star (priority)</strong> will have preference in recruitment.</span>
          <span className="block">• You can exclude entire continents and then exempt specific countries within them.</span>
          <span className="block">• You must keep at least one qualifying country.</span>
        </p>
      </div>

      {/* Validación */}
      {validCountriesCount === 0 && totalCountries > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 text-sm">
            You must have at least one qualifying country for participants to be able to participate.
          </p>
        </div>
      )}
    </>
  );
};
