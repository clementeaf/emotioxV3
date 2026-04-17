import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { ResultsStateHandler } from '../shared/ResultsStateHandler';
import { Filters } from '../smart-voc/components/Filters';
import { useResultsFilter } from '../../../hooks/useResultsFilter';
import * as analyticsService from '../../../services/analytics.service';
import { StimulusCard } from './StimulusCard';

interface EyeTrackingResultsProps {
  researchId: string;
  className?: string;
}

export const EyeTrackingResults = ({ researchId, className }: EyeTrackingResultsProps) => {
  const [data, setData] = useState<analyticsService.EyeTrackingResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const {
    demographicData,
    demographicFilters,
    setDemographicFilters,
    userIdFilter,
    setUserIdFilter,
    completionMin,
    setCompletionMin,
    filteredParticipantIds,
  } = useResultsFilter(researchId);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const results = await analyticsService.getEyeTrackingResults(researchId);
      setData(results);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load eye tracking results'));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [researchId]);

  const refreshData = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter stimulus data by participant IDs
  const filteredStimuli = useMemo(() => {
    if (!data?.stimuli || !filteredParticipantIds) return data?.stimuli ?? [];
    return data.stimuli.map(stimulus => ({
      ...stimulus,
      fixations: stimulus.fixations.filter(f => filteredParticipantIds.has(f.participantId)),
      participants: stimulus.participants.filter(p => filteredParticipantIds.has(p.participantId)),
      uniqueParticipants: stimulus.participants.filter(p => filteredParticipantIds.has(p.participantId)).length,
      emotions: {
        ...stimulus.emotions,
        perParticipant: stimulus.emotions.perParticipant.filter(p => filteredParticipantIds.has(p.participantId)),
      },
    }));
  }, [data?.stimuli, filteredParticipantIds]);

  const loadingSkeleton = (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-96 bg-gray-200 rounded-xl" />
      <div className="h-96 bg-gray-200 rounded-xl" />
    </div>
  );

  return (
    <ResultsStateHandler
      isLoading={isLoading}
      error={error}
      onRetry={fetchData}
      loadingSkeleton={loadingSkeleton}
    >
      {data && (
        <div className={`flex gap-6 ${className ?? ''}`}>
          <div className="flex-1 min-w-0">
            {filteredStimuli.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                <Eye className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-lg font-medium text-gray-900 mb-2">No Eye Tracking modules found</p>
                <p className="text-sm text-gray-500">
                  This research does not have Eye Tracking stimuli configured.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {filteredStimuli.map(stimulus => (
                  <StimulusCard key={stimulus.moduleId} stimulus={stimulus} researchId={researchId} onRefresh={refreshData} />
                ))}
              </div>
            )}
          </div>
          <div className="w-80 shrink-0 sticky top-4 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
            <Filters
              researchId={researchId}
              demographicData={demographicData}
              selectedFilters={demographicFilters}
              onFilterChange={setDemographicFilters}
              userIdFilter={userIdFilter}
              onUserIdFilterChange={setUserIdFilter}
              completionMin={completionMin}
              onCompletionMinChange={setCompletionMin}
            />
          </div>
        </div>
      )}
    </ResultsStateHandler>
  );
};
