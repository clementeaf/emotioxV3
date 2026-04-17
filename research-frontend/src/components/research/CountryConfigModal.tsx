import { Globe, MapPin, Star, Target, Users } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import React, { useEffect, useMemo, useState } from 'react';
import { QuotasTab } from './demographic-config/QuotasTab';
import { useQuotaManagement } from './demographic-config/useQuotaManagement';
import type { BaseDemographicQuota } from './demographic-config/types';
import type { LocationGranularity } from '../../utils/demographicsMapper';
import type { CityEntry, ContinentSection, CountryConfigModalProps, CountryQuota, CityQuota } from './country-config/types';
import { CONTINENTS_DATA } from './country-config/continentsData';
import { CityManagementSection } from './country-config/CityManagementSection';
import { CountryOptionsTab } from './country-config/CountryOptionsTab';

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

  const handleCountryNameChange = (sectionName: string, countryId: string, newName: string) => {
    setContinentSections(prev =>
      prev.map(s =>
        s.name === sectionName
          ? {
            ...s,
            countries: s.countries.map(c =>
              c.id === countryId
                ? { ...c, name: newName }
                : c
            )
          }
          : s
      )
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
          <CityManagementSection
            cities={cities}
            cityInput={cityInput}
            cityCountry={cityCountry}
            qualifyingCountries={qualifyingCountries}
            onCityInputChange={setCityInput}
            onCityCountryChange={setCityCountry}
            onAddCity={handleAddCity}
            onRemoveCity={handleRemoveCity}
            onToggleCityDisqualifying={handleToggleCityDisqualifying}
            onCityInputKeyDown={handleCityInputKeyDown}
          />
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
          <CountryOptionsTab
            filteredSections={filteredSections}
            searchTerm={searchTerm}
            editingCountry={editingCountry}
            validCountriesCount={validCountriesCount}
            priorityCountriesCount={priorityCountriesCount}
            totalCountries={totalCountries}
            excludedContinentsCount={excludedContinentsCount}
            onSearchTermChange={setSearchTerm}
            onToggleContinentExclusion={handleToggleContinentExclusion}
            onToggleContinentExpansion={handleToggleContinentExpansion}
            onToggleCountryDisqualifying={handleToggleCountryDisqualifying}
            onToggleCountryPriority={handleToggleCountryPriority}
            onEditStart={handleEditStart}
            onEditSave={handleEditSave}
            onEditCancel={handleEditCancel}
            onDeleteCountry={handleDeleteCountry}
            onCountryNameChange={handleCountryNameChange}
          />
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
