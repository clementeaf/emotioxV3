import { useState, useEffect, useMemo } from 'react';
import * as analyticsService from '../services/analytics.service';
import apiClient from '../services/api/client';

export type DemographicFiltersState = Record<string, string[]>;

/**
 * Shared results filter hook — extracts the identical demographic filtering
 * logic used by SmartVOCResults and CognitiveTaskResults into a reusable hook.
 *
 * Returns filter state, setters, filtered participant IDs, and a filterByParticipant helper.
 */
export type SentimentFilter = string[]; // e.g. ['positive', 'negative']

export function useResultsFilter(researchId: string) {
  const [demographicData, setDemographicData] = useState<analyticsService.DemographicResponsesResult | null>(null);
  const [demographicFilters, setDemographicFilters] = useState<DemographicFiltersState>({});
  const [userIdFilter, setUserIdFilter] = useState('');
  const [completionMin, setCompletionMin] = useState(0);
  const [progressMap, setProgressMap] = useState<Map<string, number>>(new Map());
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>([]);

  useEffect(() => {
    if (!researchId) return;
    let cancelled = false;
    analyticsService.getDemographicResponses(researchId)
      .then((result) => { if (!cancelled) setDemographicData(result); })
      .catch(() => { if (!cancelled) setDemographicData({ participants: [], demographicTypes: [] }); });
    return () => { cancelled = true; };
  }, [researchId]);

  useEffect(() => {
    if (!researchId) return;
    let cancelled = false;
    apiClient.get<Array<{ id: string; progress: number }>>(`/research/${researchId}/participants/status`)
      .then((res) => {
        if (cancelled) return;
        const arr = Array.isArray(res) ? res : (res as unknown as { data: Array<{ id: string; progress: number }> }).data ?? [];
        const map = new Map<string, number>();
        for (const p of arr) map.set(p.id, p.progress);
        setProgressMap(map);
      })
      .catch(() => { if (!cancelled) setProgressMap(new Map()); });
    return () => { cancelled = true; };
  }, [researchId]);

  const filteredParticipantIds = useMemo(() => {
    if (!demographicData?.participants.length) {
      // Even without demographics, apply completion filter if active
      if (completionMin > 0 && progressMap.size > 0) {
        return new Set(
          Array.from(progressMap.entries())
            .filter(([, prog]) => prog >= completionMin)
            .map(([id]) => id)
        );
      }
      return null;
    }
    const hasAnyFilter = Object.values(demographicFilters).some((arr) => arr.length > 0) || userIdFilter.trim() !== '' || completionMin > 0;
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
          if (completionMin > 0) {
            const prog = progressMap.get(p.participantId) ?? 0;
            if (prog < completionMin) return false;
          }
          return true;
        })
        .map((p) => p.participantId)
    );
    return idSet;
  }, [demographicData?.participants, demographicFilters, userIdFilter, completionMin, progressMap]);

  const filterByParticipant = <T extends { participantId?: string }>(items: T[]): T[] => {
    if (!filteredParticipantIds) return items;
    return items.filter((item) => item.participantId && filteredParticipantIds.has(item.participantId));
  };

  /** Filter items by sentiment/mood. Only applies when sentimentFilter is non-empty. */
  const filterBySentiment = <T extends { mood?: string; sentiment?: string }>(items: T[]): T[] => {
    if (sentimentFilter.length === 0) return items;
    return items.filter((item) => {
      const mood = (item.mood || item.sentiment || '').toLowerCase();
      return sentimentFilter.includes(mood);
    });
  };

  return {
    demographicData,
    demographicFilters,
    setDemographicFilters,
    userIdFilter,
    setUserIdFilter,
    completionMin,
    setCompletionMin,
    filteredParticipantIds,
    filterByParticipant,
    sentimentFilter,
    setSentimentFilter,
    filterBySentiment,
  };
}
