import type { LocationGranularity } from '../../../utils/demographicsMapper';

export interface Country {
  id: string;
  name: string;
  continent: string;
  isDisqualifying: boolean;
  isPriority?: boolean;
  isEditing?: boolean;
}

// 🎯 NUEVA INTERFAZ PARA CUOTAS DE PAÍS
export interface CountryQuota {
  id: string;
  country: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

export interface Continent {
  name: string;
  countries: string[];
}

export interface ContinentSection {
  name: string;
  countries: Country[];
  isExcluded: boolean;
  isExpanded: boolean;
}

export interface CityEntry {
  name: string;
  isDisqualifying: boolean;
  country?: string;
}

export interface CityQuota {
  id: string;
  city: string;
  quota: number;
  quotaType: 'absolute' | 'percentage';
  isActive: boolean;
  enforcementMode: 'immediate' | 'post_collection';
}

export interface CountryConfigModalProps {
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
