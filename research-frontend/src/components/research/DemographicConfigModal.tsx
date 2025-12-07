import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface RangeConfig {
  min: number;
  max: number;
  step: number;
}

interface QuotaConfig {
  id: string;
  value: string;
  limit: number;
  description?: string;
  enabled: boolean;
}

interface DisqualificationConfig {
  id: string;
  value: string;
  description?: string;
  enabled: boolean;
}



interface InitialConfig {
  range?: RangeConfig;
  quotas?: QuotaConfig[];
  disqualifications?: DisqualificationConfig[];
  selectedEducationLevels?: string[];
  selectedEmploymentStatuses?: string[];
  selectedTechnicalProficiencies?: string[];
  continent?: string;
  country?: string;
  region?: string;
  commune?: string;
}

interface AdvancedRule {
  id: string;
  condition: string;
  action: string;
  enabled: boolean;
  quotaLimit?: number;
  redirectUrl?: string;
  customMessage?: string;
}

interface DemographicConfig {
  range?: RangeConfig;
  quotas?: QuotaConfig[];
  disqualifications?: DisqualificationConfig[];
  continent?: string;
  country?: string;
  region?: string;
  commune?: string;
  levels?: string[];
  statuses?: string[];
  proficiencies?: string[];
  advancedRules?: AdvancedRule[];
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  demographicType: string;
  onSave: (config: DemographicConfig) => void;
  initialConfig?: InitialConfig;
}

const CONTINENTS = [
  'Africa', 'Antarctica', 'Asia', 'Europe', 
  'North America', 'Oceania', 'South America'
];

const CHILE_REGIONS = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama',
  'Coquimbo', 'Valparaíso', 'Metropolitana de Santiago', 
  'Libertador General Bernardo O\'Higgins', 'Maule', 'Ñuble',
  'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos',
  'Aysén del General Carlos Ibáñez del Campo', 'Magallanes y de la Antártica Chilena'
];

const CHILE_COMMUNES: Record<string, string[]> = {
  'Arica y Parinacota': ['Arica', 'Camarones', 'Putre', 'General Lagos'],
  'Tarapacá': ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Camiña', 'Colchane', 'Huara', 'Pica'],
  // ... más regiones y comunas
};

const EDUCATION_LEVELS = [
  'Basic', 'High School', 'Technical', 'Professional', 
  'Master', 'Doctorate'
];

const EMPLOYMENT_STATUSES = [
  'Employed Full-time', 'Employed Part-time', 'Self-employed', 
  'Unemployed', 'Student', 'Retired', 'Homemaker', 'Other'
];

const TECHNICAL_PROFICIENCIES = [
  'Beginner', 'Intermediate', 'Advanced', 'Expert'
];

export const DemographicConfigModal = ({ 
  isOpen, 
  onClose, 
  demographicType, 
  onSave,
  initialConfig = {}
}: ModalProps) => {
  const [rangeConfig, setRangeConfig] = useState<RangeConfig>(
    initialConfig?.range || { min: 0, max: 100, step: 1 }
  );
  const [quotas, setQuotas] = useState<QuotaConfig[]>(initialConfig?.quotas || []);
  const [disqualifications, setDisqualifications] = useState<DisqualificationConfig[]>(initialConfig?.disqualifications || []);
  const [selectedContinent, setSelectedContinent] = useState<string>(initialConfig?.continent || '');
  const [selectedCountry, setSelectedCountry] = useState<string>(initialConfig?.country || '');
  const [selectedRegion, setSelectedRegion] = useState<string>(initialConfig?.region || '');
  const [selectedCommune, setSelectedCommune] = useState<string>(initialConfig?.commune || '');
  const [selectedEducationLevels, setSelectedEducationLevels] = useState<string[]>(initialConfig?.selectedEducationLevels || []);
  const [selectedEmploymentStatuses, setSelectedEmploymentStatuses] = useState<string[]>(initialConfig?.selectedEmploymentStatuses || []);
  const [selectedTechnicalProficiencies, setSelectedTechnicalProficiencies] = useState<string[]>(initialConfig?.selectedTechnicalProficiencies || []);
    
    const [advancedRules, setAdvancedRules] = useState<AdvancedRule[]>([]);

  // Initialize state with initialConfig only once when the component mounts
  useEffect(() => {
    if (initialConfig) {
      // We'll initialize the state directly in the useState calls above
    }
  }, [initialConfig]);

  const handleSave = () => {
    const config: DemographicConfig = {};
    
    switch (demographicType) {
      case 'age':
      case 'annualIncome':
      case 'dailyHoursOnline':
        config.range = rangeConfig;
        config.quotas = quotas;
        config.disqualifications = disqualifications;
        break;
      case 'country':
        config.continent = selectedContinent;
        config.country = selectedCountry;
        config.region = selectedRegion;
        config.commune = selectedCommune;
        config.quotas = quotas;
        config.disqualifications = disqualifications;
        break;
      case 'educationLevel':
        config.levels = selectedEducationLevels;
        config.quotas = quotas;
        config.disqualifications = disqualifications;
        break;
      case 'employmentStatus':
        config.statuses = selectedEmploymentStatuses;
        config.quotas = quotas;
        config.disqualifications = disqualifications;
        break;
      case 'technicalProficiency':
        config.proficiencies = selectedTechnicalProficiencies;
        config.quotas = quotas;
        config.disqualifications = disqualifications;
        break;
    }
    
    // Add advanced rules to config
    config.advancedRules = advancedRules;
    
    onSave(config);
    onClose();
  };

  const addQuota = () => {
    setQuotas([...quotas, { id: Date.now().toString(), value: '', limit: 0, enabled: true }]);
  };

  const updateQuota = (index: number, field: keyof QuotaConfig, value: string | number | boolean) => {
    const newQuotas = [...quotas];
    newQuotas[index] = { ...newQuotas[index], [field]: value };
    setQuotas(newQuotas);
  };

  const removeQuota = (index: number) => {
    setQuotas(quotas.filter((_, i) => i !== index));
  };

  const addDisqualification = () => {
    setDisqualifications([...disqualifications, { id: Date.now().toString(), value: '', enabled: true }]);
  };

  const updateDisqualification = (index: number, value: string | { value: string } | boolean) => {
    const newDisqualifications = [...disqualifications];
    
    if (typeof value === 'boolean') {
      newDisqualifications[index] = { ...newDisqualifications[index], enabled: value };
    } else if (typeof value === 'string') {
      newDisqualifications[index] = { ...newDisqualifications[index], value };
    } else {
      newDisqualifications[index] = { ...newDisqualifications[index], ...value };
    }
    
    setDisqualifications(newDisqualifications);
  };

  const removeDisqualification = (index: number) => {
    setDisqualifications(disqualifications.filter((_, i) => i !== index));
  };

  const toggleEducationLevel = (level: string) => {
    setSelectedEducationLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level) 
        : [...prev, level]
    );
  };

  const toggleEmploymentStatus = (status: string) => {
    setSelectedEmploymentStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const toggleTechnicalProficiency = (proficiency: string) => {
    setSelectedTechnicalProficiencies(prev => 
      prev.includes(proficiency) 
        ? prev.filter(p => p !== proficiency) 
        : [...prev, proficiency]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Configure {demographicType.replace(/([A-Z])/g, ' $1').trim()}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Range Configuration */}
            {(demographicType === 'age' || demographicType === 'annualIncome' || demographicType === 'dailyHoursOnline') && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800">Range Configuration</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min</label>
                    <Input
                      type="number"
                      value={rangeConfig.min}
                      onChange={(e) => setRangeConfig({...rangeConfig, min: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max</label>
                    <Input
                      type="number"
                      value={rangeConfig.max}
                      onChange={(e) => setRangeConfig({...rangeConfig, max: parseInt(e.target.value) || 100})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Step</label>
                    <Input
                      type="number"
                      value={rangeConfig.step}
                      onChange={(e) => setRangeConfig({...rangeConfig, step: parseInt(e.target.value) || 1})}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Country Selection */}
            {demographicType === 'country' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800">Country Selection</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Continent</label>
                    <select
                      value={selectedContinent}
                      onChange={(e) => setSelectedContinent(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select a continent</option>
                      {CONTINENTS.map(continent => (
                        <option key={continent} value={continent}>{continent}</option>
                      ))}
                    </select>
                  </div>

                  {selectedContinent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select a country</option>
                        <option value="Chile">Chile</option>
                        {/* Más países */}
                      </select>
                    </div>
                  )}

                  {selectedCountry === 'Chile' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                        <select
                          value={selectedRegion}
                          onChange={(e) => setSelectedRegion(e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">Select a region</option>
                          {CHILE_REGIONS.map(region => (
                            <option key={region} value={region}>{region}</option>
                          ))}
                        </select>
                      </div>

                      {selectedRegion && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Commune</label>
                          <select
                            value={selectedCommune}
                            onChange={(e) => setSelectedCommune(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select a commune</option>
                            {CHILE_COMMUNES[selectedRegion]?.map(commune => (
                              <option key={commune} value={commune}>{commune}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Education Level Selection */}
            {demographicType === 'educationLevel' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800">Education Levels</h3>
                <div className="grid grid-cols-2 gap-2">
                  {EDUCATION_LEVELS.map(level => (
                    <label key={level} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedEducationLevels.includes(level)}
                        onChange={() => toggleEducationLevel(level)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Employment Status Selection */}
            {demographicType === 'employmentStatus' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800">Employment Statuses</h3>
                <div className="grid grid-cols-2 gap-2">
                  {EMPLOYMENT_STATUSES.map(status => (
                    <label key={status} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedEmploymentStatuses.includes(status)}
                        onChange={() => toggleEmploymentStatus(status)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Proficiency Selection */}
            {demographicType === 'technicalProficiency' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800">Technical Proficiencies</h3>
                <div className="grid grid-cols-2 gap-2">
                  {TECHNICAL_PROFICIENCIES.map(proficiency => (
                    <label key={proficiency} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedTechnicalProficiencies.includes(proficiency)}
                        onChange={() => toggleTechnicalProficiency(proficiency)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{proficiency}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Quotas Configuration */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Quotas</h3>
                <Button onClick={addQuota} variant="outline" size="sm">
                  Add Quota
                </Button>
              </div>
              {quotas.map((quota, index) => (
                <div key={quota.id} className="p-4 bg-gray-50 rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={quota.enabled}
                        onChange={(e) => updateQuota(index, 'enabled', e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="font-medium text-gray-700">Quota #{index + 1}</span>
                    </div>
                    <Button 
                      onClick={() => removeQuota(index)}
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                      <Input
                        value={quota.value}
                        onChange={(e) => updateQuota(index, 'value', e.target.value)}
                        placeholder="Enter value"
                        disabled={!quota.enabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
                      <Input
                        type="number"
                        value={quota.limit}
                        onChange={(e) => updateQuota(index, 'limit', parseInt(e.target.value) || 0)}
                        placeholder="Enter limit"
                        disabled={!quota.enabled}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                    <Input
                      value={quota.description || ''}
                      onChange={(e) => updateQuota(index, 'description', e.target.value)}
                      placeholder="Enter description"
                      disabled={!quota.enabled}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Disqualification Configuration */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Disqualifications</h3>
                <Button onClick={addDisqualification} variant="outline" size="sm">
                  Add Disqualification
                </Button>
              </div>
              {disqualifications.map((disqualification, index) => (
                <div key={disqualification.id} className="p-4 bg-gray-50 rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={disqualification.enabled}
                        onChange={(e) => updateDisqualification(index, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="font-medium text-gray-700">Disqualification #{index + 1}</span>
                    </div>
                    <Button 
                      onClick={() => removeDisqualification(index)}
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </Button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                    <Input
                      value={disqualification.value}
                      onChange={(e) => updateDisqualification(index, e.target.value)}
                      placeholder="Enter value that disqualifies"
                      disabled={!disqualification.enabled}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                    <Input
                      value={disqualification.description || ''}
                      onChange={(e) => updateDisqualification(index, e.target.value)}
                      placeholder="Enter description"
                      disabled={!disqualification.enabled}
                    />
                  </div>
                </div>
              ))}
            </div>
                      {/* Advanced Dynamic Rules */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Advanced Dynamic Rules</h3>
                <Button onClick={() => setAdvancedRules([...advancedRules, { id: Date.now().toString(), condition: '', action: '', enabled: true }])} variant="outline" size="sm">
                  Add Rule
                </Button>
              </div>
              {advancedRules.map((rule, index) => (
                <div key={rule.id} className="p-4 bg-blue-50 rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => {
                          const newRules = [...advancedRules];
                          newRules[index] = { ...newRules[index], enabled: e.target.checked };
                          setAdvancedRules(newRules);
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="font-medium text-gray-700">Rule #{index + 1}</span>
                    </div>
                    <Button 
                      onClick={() => setAdvancedRules(advancedRules.filter((_, i) => i !== index))}
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                      <Input
                        value={rule.condition}
                        onChange={(e) => {
                          const newRules = [...advancedRules];
                          newRules[index] = { ...newRules[index], condition: e.target.value };
                          setAdvancedRules(newRules);
                        }}
                        placeholder="e.g., age > 65 AND country == 'Chile'"
                        disabled={!rule.enabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                      <select
                        value={rule.action}
                        onChange={(e) => {
                          const newRules = [...advancedRules];
                          newRules[index] = { ...newRules[index], action: e.target.value };
                          setAdvancedRules(newRules);
                        }}
                        disabled={!rule.enabled}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select action</option>
                        <option value="quota_limit">Apply Quota Limit</option>
                        <option value="disqualify">Disqualify Participant</option>
                        <option value="redirect">Redirect to Custom URL</option>
                        <option value="custom_message">Show Custom Message</option>
                      </select>
                    </div>
                  </div>
                  
                  {rule.action === 'quota_limit' && rule.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quota Limit</label>
                      <Input
                        type="number"
                        value={rule.quotaLimit || ''}
                        onChange={(e) => {
                          const newRules = [...advancedRules];
                          newRules[index] = { ...newRules[index], quotaLimit: parseInt(e.target.value) || 0 };
                          setAdvancedRules(newRules);
                        }}
                        placeholder="Enter quota limit"
                      />
                    </div>
                  )}
                  
                  {rule.action === 'redirect' && rule.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Redirect URL</label>
                      <Input
                        value={rule.redirectUrl || ''}
                        onChange={(e) => {
                          const newRules = [...advancedRules];
                          newRules[index] = { ...newRules[index], redirectUrl: e.target.value };
                          setAdvancedRules(newRules);
                        }}
                        placeholder="https://example.com"
                      />
                    </div>
                  )}
                  
                  {rule.action === 'custom_message' && rule.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Custom Message</label>
                      <Input
                        value={rule.customMessage || ''}
                        onChange={(e) => {
                          const newRules = [...advancedRules];
                          newRules[index] = { ...newRules[index], customMessage: e.target.value };
                          setAdvancedRules(newRules);
                        }}
                        placeholder="Enter custom message"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Configuration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};