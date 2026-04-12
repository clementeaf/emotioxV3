import { ChevronDown, ChevronRight, Edit2, Globe, MapPin, Plus, Save, Search, Star, Target, Trash2, Users, X } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import React, { useEffect, useMemo, useState } from 'react';
import { QuotasTab } from './demographic-config/QuotasTab';
import { useQuotaManagement } from './demographic-config/useQuotaManagement';
import type { BaseDemographicQuota } from './demographic-config/types';
import type { LocationGranularity } from '../../utils/demographicsMapper';

interface Country {
  id: string;
  name: string;
  continent: string;
  isDisqualifying: boolean;
  isPriority?: boolean;
  isEditing?: boolean;
}

// 🎯 NUEVA INTERFAZ PARA CUOTAS DE PAÍS
interface CountryQuota {
  id: string;
  country: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface Continent {
  name: string;
  countries: string[];
}

interface ContinentSection {
  name: string;
  countries: Country[];
  isExcluded: boolean;
  isExpanded: boolean;
}

interface CityEntry {
  name: string;
  isDisqualifying: boolean;
  country?: string;
}

interface CityQuota {
  id: string;
  city: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

interface CountryConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (validCountries: string[], disqualifyingCountries: string[], priorityCountries: string[], granularity: LocationGranularity, cities: CityEntry[]) => void;
  onQuotasSave?: (quotas: CountryQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  onCityQuotasSave?: (quotas: CityQuota[]) => void;
  onCityQuotasToggle?: (enabled: boolean) => void;
  initialValidCountries?: string[];
  initialDisqualifyingCountries?: string[];
  initialPriorityCountries?: string[];
  initialGranularity?: LocationGranularity;
  initialQuotas?: CountryQuota[];
  quotasEnabled?: boolean;
  initialCities?: CityEntry[];
  initialCityQuotas?: CityQuota[];
  cityQuotasEnabled?: boolean;
}

// Datos de países por continente
const CONTINENTS_DATA: Continent[] = [
  {
    name: 'América del Norte',
    countries: ['Estados Unidos', 'Canadá', 'México', 'Guatemala', 'Belice', 'El Salvador', 'Honduras', 'Nicaragua', 'Costa Rica', 'Panamá']
  },
  {
    name: 'América del Sur',
    countries: ['Brasil', 'Argentina', 'Chile', 'Perú', 'Colombia', 'Venezuela', 'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay', 'Guyana', 'Surinam', 'Guyana Francesa']
  },
  {
    name: 'Europa',
    countries: ['Alemania', 'Francia', 'España', 'Italia', 'Reino Unido', 'Polonia', 'Rumania', 'Países Bajos', 'Bélgica', 'Grecia', 'República Checa', 'Portugal', 'Suecia', 'Hungría', 'Austria', 'Suiza', 'Bulgaria', 'Dinamarca', 'Finlandia', 'Eslovaquia', 'Noruega', 'Irlanda', 'Croacia', 'Eslovenia', 'Estonia', 'Letonia', 'Lituania', 'Luxemburgo', 'Malta', 'Chipre']
  },
  {
    name: 'Asia',
    countries: ['China', 'India', 'Japón', 'Indonesia', 'Pakistán', 'Bangladés', 'Rusia', 'Filipinas', 'Vietnam', 'Turquía', 'Irán', 'Tailandia', 'Myanmar', 'Corea del Sur', 'Irak', 'Afganistán', 'Arabia Saudita', 'Uzbekistán', 'Yemen', 'Malasia', 'Siria', 'Kazajistán', 'Camboya', 'Nepal', 'Tayikistán', 'Corea del Norte', 'Sri Lanka', 'Kuwait', 'Azerbaiyán', 'Jordania', 'Emiratos Árabes Unidos', 'Turkmenistán', 'Israel', 'Hong Kong', 'Taiwán', 'Singapur', 'Líbano', 'Omán', 'Qatar', 'Bahrein', 'Timor Oriental', 'Bután', 'Maldivas', 'Brunei']
  },
  {
    name: 'África',
    countries: ['Nigeria', 'Etiopía', 'Egipto', 'República Democrática del Congo', 'Tanzania', 'Sudáfrica', 'Kenia', 'Uganda', 'Sudán', 'Argelia', 'Marruecos', 'Angola', 'Ghana', 'Mozambique', 'Madagascar', 'Camerún', 'Costa de Marfil', 'Níger', 'Burkina Faso', 'Malí', 'Malawi', 'Zambia', 'Senegal', 'Chad', 'Somalia', 'Zimbabue', 'Guinea', 'Ruanda', 'Benín', 'Burundi', 'Túnez', 'Sudán del Sur', 'Togo', 'Sierra Leona', 'Libia', 'República del Congo', 'Liberia', 'República Centroafricana', 'Mauritania', 'Eritrea', 'Namibia', 'Gambia', 'Gabón', 'Lesoto', 'Guinea-Bissau', 'Guinea Ecuatorial', 'Mauricio', 'Esuatini', 'Yibuti', 'Comoras', 'Cabo Verde', 'Seychelles', 'Santo Tomé y Príncipe']
  },
  {
    name: 'Oceanía',
    countries: ['Australia', 'Papúa Nueva Guinea', 'Nueva Zelanda', 'Fiyi', 'Islas Salomón', 'Vanuatu', 'Nueva Caledonia', 'Polinesia Francesa', 'Samoa', 'Guam', 'Kiribati', 'Micronesia', 'Tonga', 'Islas Marshall', 'Palau', 'Tuvalu', 'Nauru', 'Islas Cook', 'Niue', 'Tokelau']
  }
];

const CountryConfigModal: React.FC<CountryConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onQuotasSave,
  onQuotasToggle,
  onCityQuotasSave,
  onCityQuotasToggle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialValidCountries: _initialValidCountries = [],
  initialDisqualifyingCountries = [],
  initialPriorityCountries = [],
  initialGranularity = 'countryOnly',
  initialQuotas = [],
  quotasEnabled = false,
  initialCities = [],
  initialCityQuotas = [],
  cityQuotasEnabled = false
}) => {
  const [continentSections, setContinentSections] = useState<ContinentSection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCountry, setEditingCountry] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'options' | 'quotas'>('options');
  const [granularity, setGranularity] = useState<LocationGranularity>(initialGranularity);

  // City management state
  const [cities, setCities] = useState<CityEntry[]>(initialCities);
  const [cityInput, setCityInput] = useState('');
  const [cityCountry, setCityCountry] = useState('');

  // 🎯 USAR HOOK DE CUOTAS
  const baseQuotas = useMemo(
    () => initialQuotas.map(quota => ({
      id: quota.id,
      field: quota.country,
      quota: quota.quota,
      quotaType: quota.quotaType || 'absolute',
      isActive: quota.isActive
    } as BaseDemographicQuota<string>)),
    [initialQuotas]
  );

  const quotaConfig = useQuotaManagement<BaseDemographicQuota<string>>(
    baseQuotas,
    quotasEnabled,
    isOpen,
    onQuotasToggle
  );

  // City quota management
  const baseCityQuotas = useMemo(
    () => initialCityQuotas.map(quota => ({
      id: quota.id,
      field: quota.city,
      quota: quota.quota,
      quotaType: quota.quotaType || 'percentage',
      isActive: quota.isActive
    } as BaseDemographicQuota<string>)),
    [initialCityQuotas]
  );

  const cityQuotaConfig = useQuotaManagement<BaseDemographicQuota<string>>(
    baseCityQuotas,
    cityQuotasEnabled,
    isOpen,
    onCityQuotasToggle
  );

  /** Qualifying countries available for city association */
  const qualifyingCountries = useMemo(() => {
    return continentSections
      .flatMap(section => section.countries)
      .filter(country => !country.isDisqualifying)
      .map(country => country.name);
  }, [continentSections]);

  const handleAddCity = () => {
    const trimmed = cityInput.trim();
    if (trimmed && !cities.some(c => c.name === trimmed)) {
      setCities(prev => [...prev, { name: trimmed, isDisqualifying: false, country: cityCountry || undefined }]);
      setCityInput('');
      // Keep the country selection for adding multiple cities to the same country
    }
  };

  const handleRemoveCity = (cityName: string) => {
    setCities(prev => prev.filter(c => c.name !== cityName));
    // Remove associated quota
    cityQuotaConfig.setQuotas(prev =>
      prev.filter((q: BaseDemographicQuota<string>) => q.field !== cityName)
    );
  };

  const handleToggleCityDisqualifying = (cityName: string) => {
    setCities(prev => prev.map(c =>
      c.name === cityName
        ? { ...c, isDisqualifying: !c.isDisqualifying }
        : c
    ));
    // Remove quota if city becomes disqualifying
    const city = cities.find(c => c.name === cityName);
    if (city && !city.isDisqualifying) {
      cityQuotaConfig.setQuotas(prev =>
        prev.filter((q: BaseDemographicQuota<string>) => q.field !== cityName)
      );
    }
  };

  const handleCityInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCity();
    }
  };

  /** Qualifying cities (for quotas tab) */
  const qualifyingCities = useMemo(
    () => cities.filter(c => !c.isDisqualifying),
    [cities]
  );

  // Crear secciones de continentes con países
  const createContinentSections = useMemo(() => {
    return CONTINENTS_DATA.map(continent => {
      const countries = continent.countries.map(countryName => ({
        id: countryName,
        name: countryName,
        continent: continent.name,
        isDisqualifying: initialDisqualifyingCountries.includes(countryName),
        isPriority: initialPriorityCountries.includes(countryName),
        isEditing: false
      }));

      const isExcluded = continent.countries.every(country =>
        initialDisqualifyingCountries.includes(country)
      );

      return {
        name: continent.name,
        countries,
        isExcluded,
        isExpanded: true
      };
    });
  }, [initialDisqualifyingCountries, initialPriorityCountries]);

  useEffect(() => {
    if (isOpen) {
      setContinentSections(createContinentSections);
      setGranularity(initialGranularity);
      setCities(initialCities);
      setCityInput('');
      setCityCountry('');
    }
  }, [isOpen, createContinentSections, initialGranularity, initialCities]);

  // Filtrar continentes y países por búsqueda
  const filteredSections = useMemo(() => {
    if (!searchTerm) return continentSections;

    return continentSections.map(section => ({
      ...section,
      countries: section.countries.filter(country =>
        country.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(section => section.countries.length > 0);
  }, [continentSections, searchTerm]);

  const handleToggleContinentExclusion = (continentName: string) => {
    setContinentSections(prev =>
      prev.map(section =>
        section.name === continentName
          ? {
            ...section,
            isExcluded: !section.isExcluded,
            countries: section.countries.map(country => ({
              ...country,
              isDisqualifying: !section.isExcluded // Si el continente se excluye, todos los países se descalifican
            }))
          }
          : section
      )
    );
  };

  const handleToggleCountryDisqualifying = (continentName: string, countryId: string) => {
    setContinentSections(prev =>
      prev.map(section =>
        section.name === continentName
          ? {
            ...section,
            countries: section.countries.map(country =>
              country.id === countryId
                ? { ...country, isDisqualifying: !country.isDisqualifying }
                : country
            )
          }
          : section
      )
    );
  };

  const handleToggleCountryPriority = (continentName: string, countryId: string) => {
    setContinentSections(prev => {
      const newSections = prev.map(section =>
        section.name === continentName
          ? {
            ...section,
            countries: section.countries.map(country => {
              if (country.id === countryId) {
                const newPriorityState = !country.isPriority;

                // Si se quita la prioridad, eliminar la cuota asociada
                if (!newPriorityState) {
                  quotaConfig.setQuotas(prevQuotas =>
                    prevQuotas.filter((quota: BaseDemographicQuota<string>) => quota.field !== country.name)
                  );
                }

                return { ...country, isPriority: newPriorityState };
              }
              return country;
            })
          }
          : section
      );

      return newSections;
    });
  };

  const handleToggleContinentExpansion = (continentName: string) => {
    setContinentSections(prev =>
      prev.map(section =>
        section.name === continentName
          ? { ...section, isExpanded: !section.isExpanded }
          : section
      )
    );
  };

  const handleEditStart = (continentName: string, countryId: string) => {
    setEditingCountry(countryId);
    setContinentSections(prev =>
      prev.map(section =>
        section.name === continentName
          ? {
            ...section,
            countries: section.countries.map(country =>
              country.id === countryId
                ? { ...country, isEditing: true }
                : country
            )
          }
          : section
      )
    );
  };

  const handleEditSave = (continentName: string, countryId: string, newName: string) => {
    if (newName.trim()) {
      setContinentSections(prev =>
        prev.map(section =>
          section.name === continentName
            ? {
              ...section,
              countries: section.countries.map(country =>
                country.id === countryId
                  ? { ...country, name: newName.trim(), isEditing: false }
                  : country
              )
            }
            : section
        )
      );
      setEditingCountry(null);
    }
  };

  const handleEditCancel = (continentName: string, countryId: string) => {
    setContinentSections(prev =>
      prev.map(section =>
        section.name === continentName
          ? {
            ...section,
            countries: section.countries.map(country =>
              country.id === countryId
                ? { ...country, isEditing: false }
                : country
            )
          }
          : section
      )
    );
    setEditingCountry(null);
  };

  const handleDeleteCountry = (continentName: string, countryId: string) => {
    setContinentSections(prev =>
      prev.map(section =>
        section.name === continentName
          ? {
            ...section,
            countries: section.countries.filter(country => country.id !== countryId)
          }
          : section
      ).filter(section => section.countries.length > 0)
    );
  };

  // 🎯 OBTENER LISTA DE PAÍSES PRIORITARIOS
  const priorityCountries = useMemo(() => {
    return continentSections
      .flatMap(section => section.countries)
      .filter(country => country.isPriority && !country.isDisqualifying);
  }, [continentSections]);

  const mapBaseToCountryQuota = (quota: BaseDemographicQuota<string>): CountryQuota => ({
    id: quota.id,
    country: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  });

  const mapBaseToCityQuota = (quota: BaseDemographicQuota<string>): CityQuota => ({
    id: quota.id,
    city: quota.field,
    quota: quota.quota,
    quotaType: quota.quotaType,
    isActive: quota.isActive,
    enforcementMode: quota.enforcementMode
  });

  const handleSave = () => {
    const allCountries = continentSections.flatMap(section => section.countries);

    const validCountries = allCountries
      .filter(country => !country.isDisqualifying)
      .map(country => country.name);

    const disqualifyingCountries = allCountries
      .filter(country => country.isDisqualifying)
      .map(country => country.name);

    const priorityCountries = allCountries
      .filter(country => country.isPriority && !country.isDisqualifying)
      .map(country => country.name);

    const effectiveCities = granularity === 'countryCity' ? cities : [];
    onSave(validCountries, disqualifyingCountries, priorityCountries, granularity, effectiveCities as CityEntry[]);

    // Save quotas: per city when countryCity, per country when countryOnly
    if (granularity === 'countryCity') {
      if (cityQuotaConfig.quotasEnabled && onCityQuotasSave) {
        onCityQuotasSave(cityQuotaConfig.quotas.map(mapBaseToCityQuota));
      }
    } else {
      if (quotaConfig.quotasEnabled && onQuotasSave) {
        onQuotasSave(quotaConfig.quotas.map(mapBaseToCountryQuota));
      }
    }

    onClose();
  };

  const validCountriesCount = continentSections
    .flatMap(section => section.countries)
    .filter(country => !country.isDisqualifying).length;

  const priorityCountriesCount = continentSections
    .flatMap(section => section.countries)
    .filter(country => country.isPriority && !country.isDisqualifying).length;

  const totalCountries = continentSections
    .flatMap(section => section.countries).length;

  const excludedContinentsCount = continentSections
    .filter(section => section.isExcluded).length;

  const footer = (
    <div className="flex justify-end space-x-3">
      <button
        onClick={onClose}
        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={validCountriesCount === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Save configuration
      </button>
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Configure countries" width="xl" footer={footer}>
      {/* Granularidad geográfica */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Geographic detail level</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Define what level of geographic information the participant will be asked for.
          </p>
          <div className="flex gap-3">
            {([
              { value: 'countryOnly', label: 'Country only' },
              { value: 'countryCity', label: 'Country + City' },
            ] as const).map(option => (
              <label
                key={option.value}
                className={`flex-1 flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  granularity === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="granularity"
                  value={option.value}
                  checked={granularity === option.value}
                  onChange={() => setGranularity(option.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Cities section — shown when granularity is countryCity */}
        {granularity === 'countryCity' && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Configured cities</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Add the cities the participant will be able to select. If you don't add any, a free text field will be shown.
            </p>
            <div className="flex gap-2 mb-3">
              <select
                value={cityCountry}
                onChange={(e) => setCityCountry(e.target.value)}
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Country (optional)</option>
                {qualifyingCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={handleCityInputKeyDown}
                placeholder="City name..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddCity}
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
                          onClick={() => handleToggleCityDisqualifying(city.name)}
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
                        onClick={() => handleRemoveCity(city.name)}
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
        )}

        {/* Tabs para opciones y cuotas */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('options')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'options'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Target className="inline w-4 h-4 mr-2" />
            Country Options
          </button>
          <button
            onClick={() => setActiveTab('quotas')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'quotas'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Users className="inline w-4 h-4 mr-2" />
            {granularity === 'countryCity' && qualifyingCities.length > 0 ? 'City Quotas' : 'Dynamic Quotas'}
          </button>
        </div>

        {/* 🎯 CONTENIDO DE TABS */}
        {activeTab === 'options' ? (
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                    onClick={() => handleToggleContinentExpansion(section.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleContinentExclusion(section.name);
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
                                  setContinentSections(prev =>
                                    prev.map(s =>
                                      s.name === section.name
                                        ? {
                                          ...s,
                                          countries: s.countries.map(c =>
                                            c.id === country.id
                                              ? { ...c, name: e.target.value }
                                              : c
                                          )
                                        }
                                        : s
                                    )
                                  );
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
                                  onClick={() => handleToggleCountryDisqualifying(section.name, country.id)}
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
                                    onClick={() => handleToggleCountryPriority(section.name, country.id)}
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
                                  onClick={() => handleEditSave(section.name, country.id, country.name)}
                                  className="p-1 text-green-600 hover:text-green-800"
                                  title="Save"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={() => handleEditCancel(section.name, country.id)}
                                  className="p-1 text-gray-600 hover:text-gray-800"
                                  title="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditStart(section.name, country.id)}
                                  className="p-1 text-blue-600 hover:text-blue-800"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCountry(section.name, country.id)}
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
        ) : (
          <div className="p-6">
            {granularity === 'countryCity' && qualifyingCities.length > 0 ? (
              /* City quotas when countryCity with qualifying cities */
              <QuotasTab
                options={qualifyingCities.map(city => ({
                  id: city.name,
                  label: city.name,
                  isQualified: true,
                  isCustom: false
                }))}
                quotaConfig={cityQuotaConfig}
                quotasTitle="City Quota System"
                quotasDescription={`Configure specific quotas for the ${qualifyingCities.length} qualifying cities. When a city's quota is full, overquota applies.`}
                quotasInfoTitle="City quotas:"
                quotasInfoItems={[
                  'Each city can have its own quota as a percentage (%) of the participant limit',
                  'The percentage is calculated based on the participant limit configured in the study',
                  'The system increments the counter when validating demographics (per city)',
                  'When the quota is full, the participant is placed in overquota upon submitting demographics',
                  'Cities without assigned quota: no limit will be applied'
                ]}
                quotasDisabledMessage="Enable the quota system to configure limits per city"
                quotasDisabledInfoTitle="Important: Distribution by 'natural falloff'"
                quotasDisabledInfoText={[
                  'Without quotas, participant distribution among cities will be by "natural falloff" (first-come).',
                  'To ensure a controlled distribution, enable the dynamic quota system.'
                ]}
                getAvailableOptions={(options) => options}
                getQuotaFieldValue={(option) => option.label}
                getQuotaFieldLabel={(field) => field}
                fieldSelectLabel="City"
                Icon={MapPin}
              />
            ) : priorityCountries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Star className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="font-medium mb-2">No priority countries selected</p>
                <p className="text-sm">Mark countries as priority in the &quot;Country Options&quot; tab to configure their quotas</p>
              </div>
            ) : (
              <QuotasTab
                options={priorityCountries.map(country => ({
                  id: country.id,
                  label: country.name,
                  isQualified: true,
                  isCustom: false
                }))}
                quotaConfig={quotaConfig}
                quotasTitle="Country Quota System"
                quotasDescription={`Configure specific quotas for the ${priorityCountries.length} selected priority countries. When a country's quota is full, overquota applies, not disqualification by country profile rules.`}
                quotasInfoTitle="Priority country quotas:"
                quotasInfoItems={[
                  'Quotas only apply to countries marked as priority',
                  'Each country can have its own quota as a percentage (%) of the participant limit',
                  'The percentage is calculated based on the participant limit configured in the study',
                  'The system increments the counter when validating demographics (per country)',
                  'When the quota is full, the participant is placed in overquota upon submitting demographics (overquota link if configured)',
                  'Countries without assigned quota: If a priority country has no configured quota, NO limit will be applied and it can receive participants without restriction',
                  'If you remove priority from a country, its quota will be kept but not applied'
                ]}
                quotasDisabledMessage="Enable the quota system to configure limits per priority country"
                quotasDisabledInfoTitle="Important: Distribution by 'natural falloff'"
                quotasDisabledInfoText={[
                  'The previous country filters (valid and disqualifying countries) configured in the "Country Options" tab will remain active.',
                  'However, if you do not enable this section, participant distribution within valid countries will be by "natural falloff" (first-come), which does not guarantee specific quotas per country will be met.',
                  'To ensure a controlled distribution with specific quotas per country, enable the dynamic quota system.'
                ]}
                getAvailableOptions={(options) => options}
                getQuotaFieldValue={(option) => option.label}
                getQuotaFieldLabel={(field) => field}
                fieldSelectLabel="Priority country"
                Icon={Globe}
              />
            )}
          </div>
        )}

    </Drawer>
  );
};

export default CountryConfigModal;
