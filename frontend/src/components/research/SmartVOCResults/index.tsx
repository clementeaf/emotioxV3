'use client';

import { useCallback, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

import { ResultsStateHandler } from '@/components/research/shared/ResultsStateHandler';
import { useSmartVOCData } from '@/api/domains/smart-voc/smart-voc.hooks';
import { useSmartVOCResponses } from '@/hooks/useSmartVOCResponses';
import { CPVCard } from './CPVCard';
import { EmotionalStates } from './EmotionalStates';
import { Filters } from './Filters';
import { MetricCard } from './MetricCard';
import { NPSQuestion } from './NPSQuestion';
import { QuestionResults } from './QuestionResults';
import { SmartVOCResultsSkeleton } from './SmartVOCResultsSkeleton';
import { TrustRelationshipFlow } from './TrustRelationshipFlow';
import { VOCQuestion } from './VOCQuestion';
import { SmartVOCResultsProps } from './types';
import {
  safeCalculateAverage,
  safeCalculatePercentage,
  hasScores
} from './utils/calculations';
import {
  getQuestionText,
  getQuestionInstructions
} from './utils/question-helpers';
import {
  processMetricData,
  processNEVData,
  isValidComment
} from './utils/data-processors';
import {
  calculateTimeAgo,
  getLatestTimestamp
} from './utils/time-helpers';

export function SmartVOCResults({ researchId, className }: SmartVOCResultsProps) {
  const [timeRange, setTimeRange] = useState<'Today' | 'Week' | 'Month'>('Today');

  const {
    data: smartVOCData,
    isLoading,
    error,
    refetch
  } = useSmartVOCResponses(researchId);

  const {
    data: smartVOCConfig,
    isLoading: isLoadingConfig
  } = useSmartVOCData(researchId);

  const hasData = useMemo(() => {
    return smartVOCData !== null && !error;
  }, [smartVOCData, error]);

  const cpvTrendData = useMemo(() => {
    return smartVOCData?.timeSeriesData?.map(item => ({
      date: new Date(item.date + 'T12:00:00').toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      }),
      value: item.score
    })) || [];
  }, [smartVOCData?.timeSeriesData]);

  const cpvData = useMemo(() => {
    if (!smartVOCData) return null;
    
    return {
      cpvValue: smartVOCData.cpvValue || 0,
      satisfaction: smartVOCData.satisfaction || 0,
      retention: smartVOCData.retention || 0,
      impact: smartVOCData.impact || '',
      trend: smartVOCData.trend || '',
      csatPercentage: hasScores(smartVOCData.csatScores)
        ? Math.round((smartVOCData.csatScores.filter(s => s >= 4).length / smartVOCData.csatScores.length) * 100)
        : 0,
      cesPercentage: hasScores(smartVOCData.cesScores)
        ? Math.round((smartVOCData.cesScores.filter(s => s <= 2).length / smartVOCData.cesScores.length) * 100)
        : 0,
      peakValue: Math.max(smartVOCData.cpvValue || 0, smartVOCData.satisfaction || 0),
      npsValue: smartVOCData.npsScore || 0,
      promoters: smartVOCData.promoters || 0,
      neutrals: smartVOCData.neutrals || 0,
      detractors: smartVOCData.detractors || 0
    };
  }, [smartVOCData]);

  const trustFlowData = useMemo(() => {
    return (smartVOCData?.timeSeriesData || []).map(item => ({
      stage: new Date(item.date + 'T12:00:00').toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      }),
      nps: item.nps || 0,
      nev: item.nev || 0,
      timestamp: item.date,
      count: item.count || 0
    }));
  }, [smartVOCData?.timeSeriesData]);

  const nevData = useMemo(() => {
    return processNEVData(smartVOCData);
  }, [smartVOCData]);

  // Obtener preguntas reales desde la configuración
  const getQuestionFromConfig = useCallback((questionType: string) => {
    if (!smartVOCConfig?.questions) return null;
    return smartVOCConfig.questions.find(q => 
      q.type?.toLowerCase().includes(questionType.toLowerCase()) ||
      q.questionKey?.toLowerCase().includes(questionType.toLowerCase())
    );
  }, [smartVOCConfig]);

  const csatQuestionData = useMemo(() => getQuestionFromConfig('csat'), [getQuestionFromConfig]);
  const cesQuestionData = useMemo(() => getQuestionFromConfig('ces'), [getQuestionFromConfig]);
  const cvQuestionData = useMemo(() => getQuestionFromConfig('cv'), [getQuestionFromConfig]);
  const nevQuestionData = useMemo(() => getQuestionFromConfig('nev'), [getQuestionFromConfig]);
  const npsQuestionData = useMemo(() => getQuestionFromConfig('nps'), [getQuestionFromConfig]);
  const vocQuestionData = useMemo(() => getQuestionFromConfig('voc'), [getQuestionFromConfig]);

  // Helper para obtener título descriptivo (no ID)
  const getDescriptiveTitle = useCallback((questionData: any, questionType: string, defaultTitle: string) => {
    if (!questionData) return defaultTitle;
    // Si el title parece ser un ID (solo letras/números sin espacios), usar el default
    if (questionData.title && /^[a-z0-9]+$/i.test(questionData.title.replace(/[^a-z0-9]/gi, ''))) {
      return defaultTitle;
    }
    // Si el title es descriptivo, usarlo
    if (questionData.title && questionData.title.trim().length > 0) {
      return questionData.title;
    }
    return defaultTitle;
  }, []);

  const csatTitle = getDescriptiveTitle(csatQuestionData, 'csat', 'Customer Satisfaction (CSAT)');
  const csatQuestion = csatQuestionData?.description || getQuestionText('csat') || 
    "How would you rate your overall satisfaction level with [company]?";
  
  const cesTitle = getDescriptiveTitle(cesQuestionData, 'ces', 'Customer Effort Score (CES)');
  const cesQuestion = cesQuestionData?.description || getQuestionText('ces') || 
    "It was easy for me to handle my issue too";
  
  const cvTitle = getDescriptiveTitle(cvQuestionData, 'cv', 'Cognitive Value (CV)');
  const cvQuestion = cvQuestionData?.description || getQuestionText('cv') || 
    "Is there value in your solution over the memory of customers?";
  
  const nevTitle = getDescriptiveTitle(nevQuestionData, 'nev', 'Net Emotional Value (NEV)');
  const nevQuestion = nevQuestionData?.description || getQuestionText('nev') || 
    "How do you feel about the experience offered by the [company]?";
  const nevInstructions = nevQuestionData?.instructions || getQuestionInstructions('nev') || 
    "Please select up to 3 options from these 20 emotional moods";
  
  const npsTitle = getDescriptiveTitle(npsQuestionData, 'nps', 'Net Promoter Score (NPS)');
  const npsQuestion = npsQuestionData?.description || getQuestionText('nps') || 
    "How likely are you to recommend [company] to a friend or colleague?";
  
  const vocTitle = getDescriptiveTitle(vocQuestionData, 'voc', 'Voice of Customer (VOC)');
  const vocQuestion = vocQuestionData?.description || getQuestionText('voc') || 
    "What else would you like to tell us about your experience?";

  const csatData = useMemo(() => {
    return processMetricData(smartVOCData?.csatScores || [], 'csat');
  }, [smartVOCData?.csatScores]);

  const cesData = useMemo(() => {
    return processMetricData(smartVOCData?.cesScores || [], 'ces');
  }, [smartVOCData?.cesScores]);

  const cvData = useMemo(() => {
    return processMetricData(smartVOCData?.cvScores || [], 'cv');
  }, [smartVOCData?.cvScores]);

  const monthlyNPSData = useMemo(() => {
    return smartVOCData?.monthlyNPSData || [
      { month: 'Ene', promoters: 0, neutrals: 0, detractors: 0, npsRatio: 0 },
      { month: 'Feb', promoters: 0, neutrals: 0, detractors: 0, npsRatio: 0 },
      { month: 'Mar', promoters: 0, neutrals: 0, detractors: 0, npsRatio: 0 },
      { month: 'Abr', promoters: 0, neutrals: 0, detractors: 0, npsRatio: 0 },
      { month: 'May', promoters: 0, neutrals: 0, detractors: 0, npsRatio: 0 },
      { month: 'Jun', promoters: 0, neutrals: 0, detractors: 0, npsRatio: 0 }
    ];
  }, [smartVOCData?.monthlyNPSData]);

  const vocComments = useMemo(() => {
    return smartVOCData?.vocResponses?.map(response => ({
      text: response.text,
      mood: isValidComment(response.text) ? 'Positive' : 'Neutral',
      selected: false
    })) || [];
  }, [smartVOCData?.vocResponses]);

  const csatTimeAgo = useMemo(() => {
    if (!smartVOCData?.smartVOCResponses) return '0s';
    const csatResponses = smartVOCData.smartVOCResponses.filter(
      r => r.questionKey?.toLowerCase().includes('csat')
    );
    const latestTimestamp = getLatestTimestamp(csatResponses);
    return calculateTimeAgo(latestTimestamp);
  }, [smartVOCData?.smartVOCResponses]);

  const cesTimeAgo = useMemo(() => {
    if (!smartVOCData?.smartVOCResponses) return '0s';
    const cesResponses = smartVOCData.smartVOCResponses.filter(
      r => r.questionKey?.toLowerCase().includes('ces')
    );
    const latestTimestamp = getLatestTimestamp(cesResponses);
    return calculateTimeAgo(latestTimestamp);
  }, [smartVOCData?.smartVOCResponses]);

  const cvTimeAgo = useMemo(() => {
    if (!smartVOCData?.smartVOCResponses) return '0s';
    const cvResponses = smartVOCData.smartVOCResponses.filter(
      r => r.questionKey?.toLowerCase().includes('cv')
    );
    const latestTimestamp = getLatestTimestamp(cvResponses);
    return calculateTimeAgo(latestTimestamp);
  }, [smartVOCData?.smartVOCResponses]);

  const nevResponseTime = useMemo(() => {
    if (!smartVOCData?.smartVOCResponses) return '0s';
    const nevResponses = smartVOCData.smartVOCResponses.filter(
      r => r.questionKey?.toLowerCase().includes('nev')
    );
    const latestTimestamp = getLatestTimestamp(nevResponses);
    return calculateTimeAgo(latestTimestamp);
  }, [smartVOCData?.smartVOCResponses]);

  return (
    <ResultsStateHandler
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      loadingSkeleton={<SmartVOCResultsSkeleton />}
    >
    <div className={cn('pt-4', className)}>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <CPVCard
              value={cpvData?.cpvValue || 0}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              trendData={cpvTrendData}
              satisfaction={cpvData?.satisfaction || 0}
              retention={cpvData?.retention || 0}
              impact={cpvData?.impact || 'Bajo'}
              trend={cpvData?.trend || 'Neutral'}
              hasData={hasData}
              csatPercentage={cpvData?.csatPercentage || 0}
              cesPercentage={cpvData?.cesPercentage || 0}
              peakValue={cpvData?.peakValue || 0}
              isLoading={isLoading}
            />
          </div>

          <div className="md:col-span-2">
            <TrustRelationshipFlow
              data={trustFlowData}
              hasData={hasData}
              isLoading={isLoading}
              timeRange={timeRange === 'Today' ? '24h' : timeRange === 'Week' ? 'week' : 'month'}
              onTimeRangeChange={(range) => {
                const newRange = range === '24h' ? 'Today' : range === 'week' ? 'Week' : 'Month';
                setTimeRange(newRange as 'Today' | 'Week' | 'Month');
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <MetricCard
            title="Customer Satisfaction"
            score={safeCalculateAverage(smartVOCData?.csatScores)}
            question={csatQuestion}
            data={csatData}
            hasData={hasScores(smartVOCData?.csatScores)}
          />

          <MetricCard
            title="Customer Effort Score"
            score={safeCalculateAverage(smartVOCData?.cesScores)}
            question={cesQuestion}
            data={cesData}
            hasData={hasScores(smartVOCData?.cesScores)}
          />

          <MetricCard
            title="Cognitive Value"
            score={safeCalculateAverage(smartVOCData?.cvScores)}
            question={cvQuestion}
            data={cvData}
            hasData={hasScores(smartVOCData?.cvScores)}
          />
        </div>
      </div>

      <div className="flex gap-8 mt-8">
        <div className="flex-1">
          <div className="space-y-6">
            <QuestionResults
              questionNumber="2.1"
              title={csatTitle}
              questionType="CSAT"
              responses={{
                count: smartVOCData?.csatScores?.length || 0,
                timeAgo: csatTimeAgo
              }}
              score={safeCalculateAverage(smartVOCData?.csatScores)}
              distribution={[
                { 
                  label: 'Satisfied', 
                  percentage: safeCalculatePercentage(smartVOCData?.csatScores, s => s >= 4), 
                  color: '#10B981' 
                },
                { 
                  label: 'Neutral', 
                  percentage: safeCalculatePercentage(smartVOCData?.csatScores, s => s === 3), 
                  color: '#F59E0B' 
                },
                { 
                  label: 'Dissatisfied', 
                  percentage: safeCalculatePercentage(smartVOCData?.csatScores, s => s <= 2), 
                  color: '#EF4444' 
                }
              ]}
            />

            <QuestionResults
              questionNumber="2.2"
              title={cesTitle}
              questionType="CES"
              responses={{
                count: smartVOCData?.cesScores?.length || 0,
                timeAgo: cesTimeAgo
              }}
              score={safeCalculateAverage(smartVOCData?.cesScores)}
              distribution={[
                { 
                  label: 'Little effort', 
                  percentage: safeCalculatePercentage(smartVOCData?.cesScores, s => s <= 2), 
                  color: '#10B981' 
                },
                { 
                  label: 'Neutral', 
                  percentage: safeCalculatePercentage(smartVOCData?.cesScores, s => s >= 3 && s <= 4), 
                  color: '#F59E0B' 
                },
                { 
                  label: 'Much effort', 
                  percentage: safeCalculatePercentage(smartVOCData?.cesScores, s => s >= 5), 
                  color: '#EF4444' 
                }
              ]}
            />

            <QuestionResults
              questionNumber="2.3"
              title={cvTitle}
              questionType="CV"
              responses={{
                count: smartVOCData?.cvScores?.length || 0,
                timeAgo: cvTimeAgo
              }}
              score={safeCalculateAverage(smartVOCData?.cvScores)}
              distribution={[
                { 
                  label: 'Worth', 
                  percentage: safeCalculatePercentage(smartVOCData?.cvScores, s => s >= 4), 
                  color: '#10B981' 
                },
                { 
                  label: 'Neutral', 
                  percentage: safeCalculatePercentage(smartVOCData?.cvScores, s => s === 3), 
                  color: '#F59E0B' 
                },
                { 
                  label: 'Worthless', 
                  percentage: safeCalculatePercentage(smartVOCData?.cvScores, s => s <= 2), 
                  color: '#EF4444' 
                }
              ]}
            />

            <EmotionalStates
              emotionalStates={nevData.emotionalStates}
              longTermClusters={nevData.longTermClusters}
              shortTermClusters={nevData.shortTermClusters}
              totalResponses={nevData.totalResponses}
              responseTime={nevResponseTime}
              positivePercentage={nevData.positivePercentage}
              negativePercentage={nevData.negativePercentage}
              questionText={nevQuestion}
              instructionsText={nevInstructions}
              questionNumber="2.4"
              questionType="NEV"
              title={nevTitle}
            />

            <NPSQuestion
              monthlyData={monthlyNPSData}
              npsScore={smartVOCData?.npsScore || 0}
              promoters={smartVOCData?.promoters || 0}
              detractors={smartVOCData?.detractors || 0}
              neutrals={smartVOCData?.neutrals || 0}
              totalResponses={smartVOCData?.npsScores?.length || 0}
              isLoading={isLoading || isLoadingConfig}
              questionText={npsQuestion}
              questionNumber="2.5"
              questionType="NPS"
              title={npsTitle}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />

            <VOCQuestion
              comments={vocComments}
              questionNumber="2.6"
              questionType="VOC"
              questionText={vocQuestion}
            />
          </div>
        </div>

        <div className="w-80 shrink-0">
          <Filters researchId={researchId} />
        </div>
      </div>
    </div>
    </ResultsStateHandler>
  );
}
