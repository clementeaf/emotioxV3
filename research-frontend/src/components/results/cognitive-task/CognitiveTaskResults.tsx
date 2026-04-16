import { useState, useEffect, useMemo } from 'react';
import { Card } from '../../ui/Card';
import { Filters, type DemographicFiltersState } from '../smart-voc/components/Filters';
import { VOCComments } from '../smart-voc/components/VOCComments';
import { cn } from '../../../lib/utils';
import { useCognitiveTaskResults } from '../../../hooks/useCognitiveTaskResults';
import { ResultsStateHandler } from '../shared/ResultsStateHandler';
import { NavigationFlowResultsWrapper } from './NavigationFlowResultsWrapper';
import { PreferenceTestResultsWrapper } from './PreferenceTestResultsWrapper';
import { ChoiceResultsWrapper } from './ChoiceResultsWrapper';
import { ScaleResultsWrapper } from './ScaleResultsWrapper';
import { RankingResultsWrapper } from './RankingResultsWrapper';
import * as analyticsService from '../../../services/analytics.service';
import apiClient from '../../../services/api/client';

interface CognitiveTaskResultsProps {
  researchId: string;
  className?: string;
}

interface ModuleData {
  moduleId: string;
  moduleName: string;
  questionText?: string;
  description: string;
  totalResponses: number;
  responses: Array<{
    participantId: string;
    value?: string | unknown;
    responseData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    moduleId?: string;
    createdAt: string;
  }>;
}

interface TextResponseFormatted {
  text: string;
  mood: string;
}

export const CognitiveTaskResults = ({ researchId, className }: CognitiveTaskResultsProps) => {
  const { data, isLoading, error, refetch } = useCognitiveTaskResults(researchId);
  const [demographicData, setDemographicData] = useState<analyticsService.DemographicResponsesResult | null>(null);
  const [demographicFilters, setDemographicFilters] = useState<DemographicFiltersState>({});
  const [userIdFilter, setUserIdFilter] = useState('');
  const [completionMin, setCompletionMin] = useState(0);
  const [progressMap, setProgressMap] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (!researchId) {
      setDemographicData(null);
      return;
    }
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
    const participants = demographicData.participants;
    const hasAnyFilter = Object.values(demographicFilters).some((arr) => arr.length > 0) || userIdFilter.trim() !== '' || completionMin > 0;
    if (!hasAnyFilter) return null;

    const idSet = new Set(
      participants
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

  const modulesToRender = useMemo(() => {
    const list = data?.modules?.filter((m) => {
      const normalized = m.moduleName.toLowerCase();
      if (normalized.includes('research configuration') || normalized.includes('welcome screen') || normalized.includes('thank you screen') ||
          normalized.includes('csat') || normalized.includes('nps') || normalized.includes('ces') || normalized.includes('voc') ||
          normalized.includes('net emotional value') || normalized.includes('nev') || normalized.includes('smart voc')) return false;
      return (normalized.includes('navigation flow') || normalized.includes('preference test') || normalized.includes('short text') ||
              normalized.includes('long text') || normalized.includes('single choice') || normalized.includes('multiple choice') ||
              normalized.includes('linear scale') || normalized.includes('ranking'));
    }) ?? [];

    if (!filteredParticipantIds) return list;
    return list.map((module) => ({
      ...module,
      responses: module.responses.filter((r) => filteredParticipantIds.has(r.participantId)),
      totalResponses: module.responses.filter((r) => filteredParticipantIds.has(r.participantId)).length,
    }));
  }, [data?.modules, filteredParticipantIds]);

  // Helper to detect module type
  const detectModuleType = (moduleName: string): string => {
    const normalized = moduleName.toLowerCase();
    if (normalized.includes('navigation flow') || normalized.includes('navigation_flow')) return 'navigation_flow';
    if (normalized.includes('preference test') || normalized.includes('preference_test')) return 'preference_test';
    if (normalized.includes('short text') || normalized.includes('short_text')) return 'short_text';
    if (normalized.includes('long text') || normalized.includes('long_text')) return 'long_text';
    if (normalized.includes('single choice') || normalized.includes('single_choice')) return 'single_choice';
    if (normalized.includes('multiple choice') || normalized.includes('multiple_choice')) return 'multiple_choice';
    if (normalized.includes('linear scale') || normalized.includes('linear_scale')) return 'linear_scale';
    if (normalized.includes('ranking')) return 'ranking';
    return 'unknown';
  };

  // Renderizar cada módulo según su tipo
  const renderModuleResults = (module: ModuleData, index: number) => {
    const moduleType = detectModuleType(module.moduleName);
    const questionNumber = `3.${index + 1}`;
    // Use questionText from module config if available, otherwise fall back to moduleName
    const displayName = module.questionText || module.moduleName;

    switch (moduleType) {
      case 'navigation_flow':
        return (
          <NavigationFlowResultsWrapper
            key={module.moduleId}
            researchId={researchId}
            moduleId={module.moduleId}
            moduleName={displayName}
            questionNumber={questionNumber}
            filteredParticipantIds={filteredParticipantIds}
          />
        );

      case 'preference_test':
        return (
          <PreferenceTestResultsWrapper
            key={module.moduleId}
            researchId={researchId}
            moduleId={module.moduleId}
            moduleName={displayName}
            questionNumber={questionNumber}
            filteredParticipantIds={filteredParticipantIds}
          />
        );

      case 'short_text':
      case 'long_text': {
        const textResponses = module.responses
          .map((r): TextResponseFormatted | null => {
            try {
              const value = typeof r.value === 'string' ? r.value : JSON.stringify(r.value);
              const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
              return { text: value, mood: meta?.sentiment || '' };
            } catch {
              return null;
            }
          })
          .filter((r): r is TextResponseFormatted => r !== null);

        const cognitiveExportRows = module.responses.map(r => {
          const participantId = (r as { participantId?: string; participant_id?: string }).participantId
            ?? (r as { participant_id?: string }).participant_id ?? '';
          const value = (r as { value?: unknown }).value ?? (r as { responseData?: { value?: unknown } }).responseData?.value;
          const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
          return { participantId, text };
        });

        return (
          <VOCComments
            key={module.moduleId}
            questionNumber={questionNumber}
            questionText={displayName}
            comments={textResponses.length > 0 ? textResponses : [{ text: 'No responses yet', mood: 'gray' }]}
            researchId={researchId}
            cognitiveExportRows={cognitiveExportRows.length > 0 ? cognitiveExportRows : undefined}
          />
        );
      }

      case 'single_choice':
        return (
          <ChoiceResultsWrapper
            key={module.moduleId}
            researchId={researchId}
            moduleId={module.moduleId}
            moduleName={displayName}
            questionNumber={questionNumber}
            isSingleChoice={true}
            filteredParticipantIds={filteredParticipantIds}
          />
        );

      case 'multiple_choice':
        return (
          <ChoiceResultsWrapper
            key={module.moduleId}
            researchId={researchId}
            moduleId={module.moduleId}
            moduleName={displayName}
            questionNumber={questionNumber}
            isSingleChoice={false}
            filteredParticipantIds={filteredParticipantIds}
          />
        );

      case 'linear_scale':
        return (
          <ScaleResultsWrapper
            key={module.moduleId}
            researchId={researchId}
            moduleId={module.moduleId}
            moduleName={displayName}
            questionNumber={questionNumber}
            filteredParticipantIds={filteredParticipantIds}
          />
        );

      case 'ranking':
        return (
          <RankingResultsWrapper
            key={module.moduleId}
            researchId={researchId}
            moduleId={module.moduleId}
            moduleName={displayName}
            questionNumber={questionNumber}
            filteredParticipantIds={filteredParticipantIds}
          />
        );

      // Otros tipos se mostrarán en la siguiente fase
      default:
        return (
          <Card key={module.moduleId} className="p-6">
            <h3 className="text-lg font-semibold">{questionNumber}- {displayName}</h3>
            <p className="text-sm text-gray-500 mt-2">Type: {moduleType}</p>
            <p className="text-sm text-gray-600 mt-1">{module.totalResponses} responses</p>
          </Card>
        );
    }
  };

  return (
    <ResultsStateHandler
      isLoading={isLoading}
      error={error}
      onRetry={refetch}
      loadingSkeleton={
        <div className="p-6 space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      }
    >
      <div className={cn(className)}>
        {/* Main Content + Sidebar */}
        <div className="flex gap-6">
          {/* Left: Main Content */}
          <div className="flex-1 space-y-6">
            {/* Dynamic Module Rendering */}
            {modulesToRender.length > 0 ? (
              modulesToRender.map((module, index) => renderModuleResults(module, index))
            ) : (
              <Card className="p-12 text-center bg-gray-50">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-700 font-medium mb-2">No cognitive task data available yet</p>
                <p className="text-gray-500 text-sm">
                  Cognitive task results will appear here once participants complete the tasks.
                </p>
              </Card>
            )}
          </div>

          {/* Right: Filters Sidebar */}
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
      </div>
    </ResultsStateHandler>
  );
};
