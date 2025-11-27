import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { Card } from '@/components/ui/Card';
import { useDemographicsData } from '@/hooks/useDemographicsData';

import { Checkbox } from './ui/Checkbox';

interface FilterItem {
  id: string;
  label: string;
  count?: number;
}

interface FilterSection {
  title: string;
  items: FilterItem[];
  initialVisibleItems?: number;
}

interface FiltersProps {
  className?: string;
  researchId: string;
}

interface DemographicData {
  countries?: FilterItem[];
  ageRanges?: FilterItem[];
  genders?: FilterItem[];
  educationLevels?: FilterItem[];
  userIds?: FilterItem[];
  participants?: FilterItem[];
}

const MIN_PARTICIPANTS_FOR_SUMMARY = 10;

const DEFAULT_EXPANDED_SECTIONS: Record<string, boolean> = {
  'Country': true,
  'Age range': true,
  'Gender': true,
  'Education level': true,
  'User ID': true,
  'Participants': true,
};

interface SectionConfig {
  key: keyof DemographicData;
  title: string;
  initialVisibleItems?: number;
}

const SECTION_CONFIGS: SectionConfig[] = [
  { key: 'countries', title: 'Country', initialVisibleItems: 5 },
  { key: 'ageRanges', title: 'Age range', initialVisibleItems: 5 },
  { key: 'genders', title: 'Gender' },
  { key: 'educationLevels', title: 'Education level', initialVisibleItems: 5 },
  { key: 'userIds', title: 'User ID', initialVisibleItems: 10 },
  { key: 'participants', title: 'Participants', initialVisibleItems: 10 },
];

/**
 * Construye las secciones de filtros a partir de los datos demográficos
 * @param demographicsData - Datos demográficos procesados
 * @returns Array de secciones de filtros con items
 */
function buildFilterSections(demographicsData: DemographicData | null): FilterSection[] {
  if (!demographicsData) {
    return [];
  }

  const sections: FilterSection[] = [];

  for (const config of SECTION_CONFIGS) {
    const items = demographicsData[config.key];
    if (items && items.length > 0) {
      sections.push({
        title: config.title,
        items,
        initialVisibleItems: config.initialVisibleItems,
      });
    }
  }

  return sections;
}

interface DataSummaryProps {
  totalParticipants: number;
  countriesCount: number;
  ageRangesCount: number;
}

/**
 * Componente que muestra un resumen de los datos demográficos
 */
function DataSummary({ totalParticipants, countriesCount, ageRangesCount }: DataSummaryProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
      <div className="text-sm text-green-800">
        <div className="font-medium">Resumen de Datos</div>
        <div>Total de participantes: {totalParticipants}</div>
        <div>Países: {countriesCount}</div>
        <div>Rangos de edad: {ageRangesCount}</div>
      </div>
    </div>
  );
}

interface FilterItemComponentProps {
  item: FilterItem;
}

/**
 * Componente que renderiza un item individual del filtro
 */
function FilterItemComponent({ item }: FilterItemComponentProps) {
  return (
    <div className="flex items-center">
      <Checkbox id={item.id} />
      <label htmlFor={item.id} className="ml-2 text-sm text-gray-700">
        {item.label}
        {item.count !== undefined && (
          <span className="text-gray-500 ml-1">({item.count})</span>
        )}
      </label>
    </div>
  );
}

interface FilterSectionComponentProps {
  section: FilterSection;
  isExpanded: boolean;
  isShowingAll: boolean;
  onToggleExpand: () => void;
  onToggleShowMore: () => void;
}

/**
 * Componente que renderiza una sección completa de filtros
 */
function FilterSectionComponent({
  section,
  isExpanded,
  isShowingAll,
  onToggleExpand,
  onToggleShowMore,
}: FilterSectionComponentProps) {
  const visibleItems = useMemo(() => {
    if (isShowingAll || !section.initialVisibleItems) {
      return section.items;
    }
    return section.items.slice(0, section.initialVisibleItems);
  }, [section.items, section.initialVisibleItems, isShowingAll]);

  const hasMoreItems = section.initialVisibleItems
    ? section.items.length > section.initialVisibleItems
    : false;

  const remainingCount = hasMoreItems
    ? section.items.length - (section.initialVisibleItems || 0)
    : 0;

  return (
    <div className="border-b border-gray-200 pb-4 last:border-b-0">
      <button
        onClick={onToggleExpand}
        className="flex items-center justify-between w-full text-left font-medium text-gray-900 mb-2"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Colapsar' : 'Expandir'} sección ${section.title}`}
      >
        {section.title}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <FilterItemComponent key={item.id} item={item} />
          ))}

          {hasMoreItems && (
            <button
              onClick={onToggleShowMore}
              className="text-sm text-blue-600 hover:text-blue-800"
              aria-label={isShowingAll ? 'Mostrar menos' : `Mostrar ${remainingCount} más`}
            >
              {isShowingAll ? 'Show less' : `Show ${remainingCount} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Filters({ className, researchId }: FiltersProps) {
  const { data: demographicsData, isLoading, error } = useDemographicsData(researchId);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    DEFAULT_EXPANDED_SECTIONS
  );
  const [showMoreSections, setShowMoreSections] = useState<Record<string, boolean>>({});

  const filterSections = useMemo(
    () => buildFilterSections(demographicsData),
    [demographicsData]
  );

  const totalParticipants = useMemo(() => {
    return (
      demographicsData?.participants?.reduce((sum, item) => sum + (item.count || 0), 0) || 0
    );
  }, [demographicsData?.participants]);

  const showDataSummary = totalParticipants > MIN_PARTICIPANTS_FOR_SUMMARY;

  const toggleSection = useCallback((title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  }, []);

  const toggleShowMore = useCallback((title: string) => {
    setShowMoreSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  }, []);

  if (isLoading) {
    return (
      <Card className={`p-4 ${className || ''}`}>
        <div className="text-center py-8">
          <div className="text-gray-500">Cargando filtros...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-4 ${className || ''}`}>
        <div className="text-center py-8">
          <div className="text-red-500">Error al cargar filtros: {error}</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className || ''}`}>
      <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-4 w-full">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
      </div>

      {showDataSummary && demographicsData && (
        <DataSummary
          totalParticipants={totalParticipants}
          countriesCount={demographicsData.countries?.length || 0}
          ageRangesCount={demographicsData.ageRanges?.length || 0}
        />
      )}

      <div className="space-y-4">
        {filterSections.length > 0 ? (
          filterSections.map((section) => (
            <FilterSectionComponent
              key={section.title}
              section={section}
              isExpanded={expandedSections[section.title] ?? false}
              isShowingAll={showMoreSections[section.title] ?? false}
              onToggleExpand={() => toggleSection(section.title)}
              onToggleShowMore={() => toggleShowMore(section.title)}
            />
          ))
        ) : (
          <div className="text-sm text-gray-500 italic text-center py-8">
            No hay datos de filtros disponibles
          </div>
        )}
      </div>
    </Card>
  );
}
