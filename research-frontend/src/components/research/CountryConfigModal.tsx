import { ChevronDown, ChevronRight, Edit2, Globe, MapPin, Save, Search, Star, Target, Trash2, Users, X } from 'lucide-react';
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

interface CountryConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (validCountries: string[], disqualifyingCountries: string[], priorityCountries: string[], granularity: LocationGranularity) => void;
  onQuotasSave?: (quotas: CountryQuota[]) => void;
  onQuotasToggle?: (enabled: boolean) => void;
  initialValidCountries?: string[];
  initialDisqualifyingCountries?: string[];
  initialPriorityCountries?: string[];
  initialGranularity?: LocationGranularity;
  initialQuotas?: CountryQuota[];
  quotasEnabled?: boolean;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialValidCountries: _initialValidCountries = [],
  initialDisqualifyingCountries = [],
  initialPriorityCountries = [],
  initialGranularity = 'countryOnly',
  initialQuotas = [],
  quotasEnabled = false
}) => {
  const [continentSections, setContinentSections] = useState<ContinentSection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCountry, setEditingCountry] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'options' | 'quotas'>('options');
  const [granularity, setGranularity] = useState<LocationGranularity>(initialGranularity);

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
    }
  }, [isOpen, createContinentSections, initialGranularity]);

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

  // 🎯 FUNCIONES DE MAPEO PARA CUOTAS
  const mapBaseToCountryQuota = (quota: BaseDemographicQuota<string>): CountryQuota => {
    return {
      id: quota.id,
      country: quota.field,
      quota: quota.quota,
      quotaType: quota.quotaType,
      isActive: quota.isActive,
      enforcementMode: quota.enforcementMode
    };
  };

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

    onSave(validCountries, disqualifyingCountries, priorityCountries, granularity);

    // 🎯 GUARDAR CUOTAS SI ESTÁN HABILITADAS
    if (quotaConfig.quotasEnabled && onQuotasSave) {
      const countryQuotas = quotaConfig.quotas.map(mapBaseToCountryQuota);
      onQuotasSave(countryQuotas);
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
        Cancelar
      </button>
      <button
        onClick={handleSave}
        disabled={validCountriesCount === 0}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Guardar configuración
      </button>
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Configurar países" width="xl" footer={footer}>
      {/* Granularidad geográfica */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Nivel de detalle geográfico</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Define qué nivel de información geográfica se le pedirá al participante.
          </p>
          <div className="flex gap-3">
            {([
              { value: 'countryOnly', label: 'Solo país' },
              { value: 'countryCity', label: 'País + Ciudad' },
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
            Opciones de País
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
              Organiza países por continentes. Excluye continentes completos o exceptúa países específicos.
            </p>

            {/* Búsqueda */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar países..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Estadísticas */}
            <div className="mb-6 grid grid-cols-4 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="font-medium text-blue-800">Total países</div>
                <div className="text-blue-600">{totalCountries}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="font-medium text-green-800">Países válidos</div>
                <div className="text-green-600">{validCountriesCount}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="font-medium text-purple-800">Prioritarios</div>
                <div className="text-purple-600">{priorityCountriesCount}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="font-medium text-orange-800">Continentes excluidos</div>
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
                            {section.countries.length} países
                            {section.isExcluded && (
                              <span className="text-red-600 ml-2">(Excluido)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm ${section.isExcluded ? 'text-red-600' : 'text-gray-600'}`}>
                          {section.isExcluded ? 'Excluido' : 'Incluido'}
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
                                  {country.isDisqualifying ? 'Desclasifica' : 'Clasifica'}
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
                                    title={country.isPriority ? 'Quitar prioridad' : 'Marcar como prioritario'}
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
                                  title="Guardar"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={() => handleEditCancel(section.name, country.id)}
                                  className="p-1 text-gray-600 hover:text-gray-800"
                                  title="Cancelar"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditStart(section.name, country.id)}
                                  className="p-1 text-blue-600 hover:text-blue-800"
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCountry(section.name, country.id)}
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
                  )}
                </div>
              ))}
            </div>

            {/* Nota importante */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-800 mb-2">Nota:</h4>
              <p className="text-blue-700 text-sm space-y-1">
                <span className="block">• Los países marcados como "Clasifica" se mostrarán a los participantes para seleccionar.</span>
                <span className="block">• Los países marcados como "Desclasifica" excluirán automáticamente a los participantes de esos países.</span>
                <span className="block">• Los países con <Star size={14} className="inline text-purple-600" fill="currentColor" /> <strong>estrella (prioritarios)</strong> tendrán preferencia en el reclutamiento.</span>
                <span className="block">• Puedes excluir continentes completos y luego exceptuar países específicos dentro de ellos.</span>
                <span className="block">• Debes mantener al menos un país que clasifique.</span>
              </p>
            </div>

            {/* Validación */}
            {validCountriesCount === 0 && totalCountries > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 text-sm">
                  ⚠️ Debes tener al menos un país que clasifique para que los participantes puedan participar.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="p-6">
            {priorityCountries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Star className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="font-medium mb-2">No hay países prioritarios seleccionados</p>
                <p className="text-sm">Marca países como prioritarios en la pestaña "Opciones de País" para configurar sus cuotas</p>
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
                quotasTitle="Sistema de Cuotas por País"
                quotasDescription={`Configura cuotas específicas para los ${priorityCountries.length} países prioritarios seleccionados. Cuando el cupo de un país esté lleno, aplica sobre cuota, no descalificación por reglas de perfil de país.`}
                quotasInfoTitle="Cuotas para países prioritarios:"
                quotasInfoItems={[
                  'Las cuotas solo se aplican a países marcados como prioritarios',
                  'Cada país puede tener su propia cuota en porcentaje (%) del límite de participantes',
                  'El porcentaje se calcula sobre el límite de participantes configurado en el estudio',
                  'El sistema incrementa el contador al validar demografía (por país)',
                  'Cuando el cupo esté lleno, el participante queda en sobre cuota al enviar demografía (enlace de sobre cuota si lo configuraste)',
                  'Países sin cuota asignada: Si un país prioritario no tiene cuota configurada, NO se le aplicará ningún límite y podrá recibir participantes sin restricción',
                  'Si quitas la prioridad de un país, su cuota se mantendrá pero no se aplicará'
                ]}
                quotasDisabledMessage="Habilita el sistema de cuotas para configurar límites por país prioritario"
                quotasDisabledInfoTitle="Importante: Distribución por 'caída natural'"
                quotasDisabledInfoText={[
                  'Los filtros previos de país (países válidos y descalificantes) configurados en la pestaña "Opciones de País" seguirán activos.',
                  'Sin embargo, si no habilitas esta sección, la distribución de participantes dentro de los países válidos será por "caída natural" (orden de llegada), lo que no garantiza que se completen cuotas específicas por país.',
                  'Para asegurar una distribución controlada con cuotas específicas por país, habilita el sistema de cuotas dinámicas.'
                ]}
                getAvailableOptions={(options) => options}
                getQuotaFieldValue={(option) => option.label}
                getQuotaFieldLabel={(field) => field}
                fieldSelectLabel="País prioritario"
                Icon={Globe}
              />
            )}
          </div>
        )}

    </Drawer>
  );
};

export default CountryConfigModal;
