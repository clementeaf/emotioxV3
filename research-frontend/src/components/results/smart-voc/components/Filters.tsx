import { useState, useEffect, useMemo } from 'react';
import { FileDown } from 'lucide-react';
import * as analyticsService from '../../../../services/analytics.service';
import { triggerCsvDownload } from '../../../../utils/csvDownload';

const DEMOGRAPHIC_LABELS: Record<string, string> = {
    age: 'Age range',
    country: 'Country',
    gender: 'Gender',
    educationLevel: 'Education level',
    annualIncome: 'Annual Income',
    employmentStatus: 'Employment Status',
    dailyHoursOnline: 'Daily Hours Online',
    technicalProficiency: 'Technical Proficiency',
};

const INITIAL_VISIBLE_OPTIONS = 5;

function getDemographicLabel(key: string): string {
    return DEMOGRAPHIC_LABELS[key] ?? key;
}

export type DemographicFiltersState = Record<string, string[]>;

interface FiltersProps {
    researchId?: string;
    /** Demographics data (if provided by parent); otherwise Filters fetches internally */
    demographicData?: analyticsService.DemographicResponsesResult | null;
    /** Selected filter values per demographic type */
    selectedFilters?: DemographicFiltersState;
    /** Called when user toggles a filter option */
    onFilterChange?: (filters: DemographicFiltersState) => void;
    /** Filter by participant ID (substring match) */
    userIdFilter?: string;
    onUserIdFilterChange?: (value: string) => void;
}

export const Filters = ({
    researchId,
    demographicData: demographicDataProp,
    selectedFilters = {},
    onFilterChange,
    userIdFilter = '',
    onUserIdFilterChange,
}: FiltersProps) => {
    const [internalData, setInternalData] = useState<analyticsService.DemographicResponsesResult | null>(null);
    const [isLoading, setIsLoading] = useState(!demographicDataProp && !!researchId);
    const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

    const data = demographicDataProp ?? internalData;

    useEffect(() => {
        if (demographicDataProp !== undefined || !researchId) {
            if (!researchId) setInternalData(null);
            setIsLoading(false);
            return;
        }
        let cancelled = false;
        analyticsService.getDemographicResponses(researchId)
            .then((result: analyticsService.DemographicResponsesResult) => {
                if (!cancelled) setInternalData(result);
            })
            .catch(() => {
                if (!cancelled) setInternalData({ participants: [], demographicTypes: [] });
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => { cancelled = true; };
    }, [researchId, demographicDataProp]);

    const optionsWithCounts = useMemo(() => {
        if (!data?.participants?.length || !data.demographicTypes.length) return {};
        const out: Record<string, Array<{ value: string; count: number }>> = {};
        for (const type of data.demographicTypes) {
            const counts: Record<string, number> = {};
            for (const p of data.participants) {
                const v = p.demographics[type];
                const key = v != null && v !== '' ? String(v) : '—';
                counts[key] = (counts[key] || 0) + 1;
            }
            out[type] = Object.entries(counts)
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => b.count - a.count);
        }
        return out;
    }, [data?.participants, data?.demographicTypes]);

    const toggleFilter = (type: string, value: string): void => {
        const current = selectedFilters[type] ?? [];
        const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        onFilterChange?.({ ...selectedFilters, [type]: next });
    };

    const toggleExpand = (type: string): void => {
        setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
    };

    const handleDownloadCSV = (): void => {
        if (!researchId || !data || data.participants.length === 0) return;
        const headers = ['participant_id', ...data.demographicTypes.map(getDemographicLabel)];
        const rows = data.participants.map((p: analyticsService.DemographicParticipant) => {
            const cells = [
                String(p.participantId ?? '').replace(/"/g, '""'),
                ...data.demographicTypes.map((t: string) => String(p.demographics[t] ?? '').replace(/"/g, '""')),
            ];
            return cells.map((c) => `"${c}"`).join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        triggerCsvDownload(csv, `demographics-${researchId}.csv`);
    };

    if (!researchId) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold mb-2">Filters</h3>
                <p className="text-sm text-gray-500">Select a study to see demographic filters.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold mb-2">Filters</h3>
                <div className="h-32 bg-gray-100 rounded animate-pulse" />
            </div>
        );
    }

    const hasData = data && data.participants.length > 0 && data.demographicTypes.length > 0;

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <h3 className="font-semibold">Filters</h3>

            {!hasData ? (
                <p className="text-sm text-gray-500">No demographic responses for this study.</p>
            ) : (
                <>
                    {data.demographicTypes.map((type) => {
                        const options = optionsWithCounts[type] ?? [];
                        const isExpanded = expandedTypes[type] ?? false;
                        const visibleOptions = isExpanded ? options : options.slice(0, INITIAL_VISIBLE_OPTIONS);
                        const hasMore = options.length > INITIAL_VISIBLE_OPTIONS;
                        const selected = selectedFilters[type] ?? [];

                        return (
                            <div key={type} className="space-y-2">
                                <div className="text-sm font-medium text-gray-700">
                                    {getDemographicLabel(type)}
                                </div>
                                <div className="space-y-1.5">
                                    {visibleOptions.map(({ value, count }) => (
                                        <label
                                            key={value}
                                            className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(value)}
                                                onChange={() => toggleFilter(type, value)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>
                                                {value === '—' ? '(empty)' : value}
                                                <span className="text-gray-500 ml-1">({count})</span>
                                            </span>
                                        </label>
                                    ))}
                                    {hasMore && (
                                        <button
                                            type="button"
                                            onClick={() => toggleExpand(type)}
                                            className="text-xs text-blue-600 hover:underline"
                                        >
                                            {isExpanded ? 'Show less' : 'Show more'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </>
            )}

            {onUserIdFilterChange && (
                <div className="space-y-1.5 pt-2 border-t border-gray-200">
                    <div className="text-sm font-medium text-gray-700">User ID</div>
                    <input
                        type="text"
                        value={userIdFilter}
                        onChange={(e) => onUserIdFilterChange(e.target.value)}
                        placeholder="e.g. e5adfa14-18be-433e..."
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            )}

            {hasData && (
                <div className="pt-2 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleDownloadCSV}
                        className="inline-flex items-center gap-1.5 w-full justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                        <FileDown className="w-4 h-4" />
                        Descargar CSV
                    </button>
                </div>
            )}
        </div>
    );
};
