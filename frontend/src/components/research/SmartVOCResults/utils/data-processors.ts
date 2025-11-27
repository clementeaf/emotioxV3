/**
 * Procesadores de datos para SmartVOC
 */

import { MONTHS, ALL_EMOTIONS, POSITIVE_EMOTIONS } from '../constants';
import type { useSmartVOCResponses } from '@/hooks/useSmartVOCResponses';

/**
 * Valida si un comentario es válido o es spam
 * @param text - Texto del comentario
 * @returns true si es válido, false si es spam
 */
export function isValidComment(text: string): boolean {
  if (text.length < 3) return false;
  if (/^(.)\1+$/.test(text)) return false;
  if (!/[aeiouáéíóúü]/i.test(text) && text.length > 5) return false;
  if (/^\d+$/.test(text)) return false;
  if (/^[^a-zA-Z0-9\s]+$/.test(text)) return false;
  return true;
}

/**
 * Procesa datos de métricas para MetricCards
 * @param scores - Array de scores
 * @param type - Tipo de métrica (csat, ces, cv)
 * @returns Array de datos procesados por mes
 */
export function processMetricData(scores: number[], type: 'csat' | 'ces' | 'cv') {
  if (!scores || scores.length === 0) {
    return [];
  }

  return MONTHS.map((month, index) => {
    if (index >= scores.length) {
      return {
        date: month,
        satisfied: 0,
        dissatisfied: 0
      };
    }

    const score = scores[index];
    
    if (type === 'csat') {
      const satisfied = ((score - 1) / 4) * 100;
      const dissatisfied = 100 - satisfied;
      return {
        date: month,
        satisfied: Math.round(satisfied),
        dissatisfied: Math.round(dissatisfied)
      };
    } else if (type === 'ces') {
      const littleEffort = ((5 - score) / 4) * 100;
      const muchEffort = 100 - littleEffort;
      return {
        date: month,
        satisfied: Math.round(littleEffort),
        dissatisfied: Math.round(muchEffort)
      };
    } else {
      const worth = ((score - 1) / 4) * 100;
      const worthless = 100 - worth;
      return {
        date: month,
        satisfied: Math.round(worth),
        dissatisfied: Math.round(worthless)
      };
    }
  });
}

interface NEVDataResult {
  emotionalStates: Array<{
    name: string;
    value: number;
    isPositive: boolean;
  }>;
  longTermClusters: Array<{
    name: string;
    value: number;
    trend: 'up';
  }>;
  shortTermClusters: Array<{
    name: string;
    value: number;
    trend: 'up';
  }>;
  totalResponses: number;
  positivePercentage: number;
  negativePercentage: number;
}

/**
 * Procesa datos de NEV para EmotionalStates
 * @param smartVOCData - Datos de SmartVOC del hook
 * @returns Datos procesados de emociones
 */
export function processNEVData(
  smartVOCData: ReturnType<typeof useSmartVOCResponses>['data']
): NEVDataResult {
  const emotionCounts: Record<string, number> = {};
  let totalEmotionResponses = 0;
  
  ALL_EMOTIONS.forEach(emotion => {
    emotionCounts[emotion] = 0;
  });

  if (smartVOCData?.smartVOCResponses && smartVOCData.smartVOCResponses.length > 0) {
    smartVOCData.smartVOCResponses.forEach(response => {
      if (response.questionKey && response.questionKey.toLowerCase().includes('nev')) {
        let emotions: string[] = [];
        
        if (typeof response.response === 'string') {
          emotions = response.response.split(',').map((e: string) => {
            const trimmed = e.trim();
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
          });
        } else if (Array.isArray(response.response)) {
          emotions = response.response.map((e: string) => {
            const trimmed = String(e).trim();
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
          });
        } else if (response.response && typeof response.response === 'object' && 'value' in response.response) {
          const responseObj = response.response as { value: unknown };
          if (typeof responseObj.value === 'string') {
            emotions = responseObj.value.split(',').map((e: string) => {
              const trimmed = e.trim();
              return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
            });
          } else if (Array.isArray(responseObj.value)) {
            emotions = responseObj.value.map((e: string) => {
              const trimmed = String(e).trim();
              return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
            });
          }
        }
        
        emotions.forEach((emotion: string) => {
          const emotionKey = Object.keys(emotionCounts).find(
            key => key.toLowerCase() === emotion.toLowerCase()
          );
          if (emotionKey) {
            emotionCounts[emotionKey]++;
            totalEmotionResponses++;
          }
        });
      }
    });
  }

  const emotionalStates = ALL_EMOTIONS.map(emotion => {
    const count = emotionCounts[emotion];
    const percentage = totalEmotionResponses > 0 
      ? Math.round((count / totalEmotionResponses) * 100) 
      : 0;
    return {
      name: emotion,
      value: percentage,
      isPositive: POSITIVE_EMOTIONS.includes(emotion as typeof POSITIVE_EMOTIONS[number])
    };
  });

  const positiveCount = emotionalStates
    .filter(state => state.isPositive)
    .reduce((sum, state) => sum + state.value, 0);
  
  const negativeCount = emotionalStates
    .filter(state => !state.isPositive)
    .reduce((sum, state) => sum + state.value, 0);
  
  const totalPercentage = positiveCount + negativeCount;
  const positivePercentage = totalPercentage > 0 
    ? Math.round((positiveCount / totalPercentage) * 100) 
    : 0;
  const negativePercentage = totalPercentage > 0 
    ? Math.round((negativeCount / totalPercentage) * 100) 
    : 0;

  const longTermClusters = [
    { 
      name: 'Trust', 
      value: totalEmotionResponses > 0 
        ? Math.round((emotionCounts['Confiado'] / totalEmotionResponses) * 100) 
        : 0, 
      trend: 'up' as const 
    },
    { 
      name: 'Loyalty', 
      value: totalEmotionResponses > 0 
        ? Math.round((emotionCounts['Valorado'] / totalEmotionResponses) * 100) 
        : 0, 
      trend: 'up' as const 
    }
  ];

  const shortTermClusters = [
    { 
      name: 'Satisfaction', 
      value: totalEmotionResponses > 0 
        ? Math.round((emotionCounts['Satisfecho'] / totalEmotionResponses) * 100) 
        : 0, 
      trend: 'up' as const 
    },
    { 
      name: 'Engagement', 
      value: totalEmotionResponses > 0 
        ? Math.round((emotionCounts['Interesado'] / totalEmotionResponses) * 100) 
        : 0, 
      trend: 'up' as const 
    }
  ];

  const totalResponses = smartVOCData?.smartVOCResponses?.filter(
    r => r.questionKey?.toLowerCase().includes('nev')
  ).length || 0;

  return {
    emotionalStates,
    longTermClusters,
    shortTermClusters,
    totalResponses,
    positivePercentage,
    negativePercentage
  };
}

