import { useState, useEffect, useMemo } from 'react';
import * as analyticsService from '../services/analytics.service';

export type DemographicFiltersState = Record<string, string[]>;

/**
 * Shared results filter hook — extracts the identical demographic filtering
 * logic used by SmartVOCResults and CognitiveTaskResults into a reusable hook.
 *
 * Returns filter state, setters, filtered participant IDs, and a filterByParticipant helper.
 */
export function useResultsFilter(researchId: string) {
  const [demographicData, setDemographicData] = useState<analyticsService.DemographicResponsesResult | null>(null);
  const [demographicFilters, setDemographicFilters] = useState<DemographicFiltersState>({});
  const [userIdFilter, setUserIdFilter] = useState('');

  useEffect(() => {
    if (!researchId) return;
    let cancelled = false;
    analyticsService.getDemographicResponses(researchId)
      .then((result) => { if (!cancelled) setDemographicData(result); })
      .catch(() => { if (!cancelled) setDemographicData({ participants: [], demographicTypes: [] }); });
    return () => { cancelled = true; };
  }, [researchId]);

  const filteredParticipantIds = useMemo(() => {
    if (!demographicData?.participants.length) return null;
    const hasAnyFilter = Object.values(demographicFilters).some((arr) => arr.length > 0) || userIdFilter.trim() !== '';
    if (!hasAnyFilter) return null;

    const idSet = new Set(
      demographicData.participants
        .filter((p) => {
          for (const [type, selected] of Object.entries(demographicFilters)) {
            if (selected.length === 0) continue;
            const val = p.demographics[type];
            const key = val != null && val !== '' ? String(val) : '—';
            if (!selected.includes(key)) return false;
          }
          if (userIdFilter.trim()) {
            if (!p.participantId.toLowerCase().includes(userIdFilter.trim().toLowerCase())) return false;
          }
          return true;
        })
        .map((p) => p.participantId)
    );
    return idSet;
  }, [demographicData?.participants, demographicFilters, userIdFilter]);

  const filterByParticipant = <T extends { participantId?: string }>(items: T[]): T[] => {
    if (!filteredParticipantIds) return items;
    return items.filter((item) => item.participantId && filteredParticipantIds.has(item.participantId));
  };

  return {
    demographicData,
    demographicFilters,
    setDemographicFilters,
    userIdFilter,
    setUserIdFilter,
    filteredParticipantIds,
    filterByParticipant,
  };
}
