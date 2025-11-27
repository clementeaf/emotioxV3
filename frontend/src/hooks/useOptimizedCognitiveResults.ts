'use client';

import { useQuery } from '@tanstack/react-query';
import { moduleResponsesAPI } from '@/api/config';

// Tipos de preguntas cognitivas
export type CognitiveQuestionType =
  | 'cognitive_short_text'
  | 'cognitive_long_text'
  | 'cognitive_multiple_choice'
  | 'cognitive_single_choice'
  | 'cognitive_linear_scale'
  | 'cognitive_ranking'
  | 'cognitive_image_selection'
  | 'cognitive_preference_test'
  | 'cognitive_navigation_flow';

// Interfaz para respuestas agrupadas
export interface GroupedResponse {
  participantId: string;
  value: any;
  responseTime?: string;
  timestamp: string;
  metadata?: any;
}

// Interfaz para datos agrupados por questionKey
export interface GroupedResponsesData {
  [questionKey: string]: GroupedResponse[];
}

// Interfaz para datos procesados de Linear Scale
export interface ProcessedLinearScaleData {
  question: string;
  description?: string;
  scaleRange: { start: number; end: number };
  responses: { value: number; count: number }[];
  average: number;
  totalResponses: number;
  distribution: Record<number, number>;
  responseTime?: string;
}

// Interfaz para la distribución de votos en una escala (compatible con RankingResults)
export interface RankingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  6: number;
}

// Interfaz para cada opción del ranking (compatible con RankingResults)
export interface RankingOption {
  id: string;
  text: string;
  mean: number;
  distribution: RankingDistribution;
  responseTime: string;
}

// Interfaz para datos procesados de Ranking (compatible con RankingQuestionData)
export interface ProcessedRankingData {
  question: string;
  options: RankingOption[];
}

// Interfaz para datos procesados de Choice
export interface ProcessedChoiceData {
  question: string;
  options: Array<{ id: string; text: string; count: number; percentage: number; color?: string }>;
  totalResponses: number;
  responseDuration?: string;
}

// Interfaz para datos procesados de Sentiment
export interface ProcessedSentimentData {
  sentimentResults: Array<{ id: string; text: string; sentiment: 'positive' | 'negative' | 'neutral' }>;
  themes?: Array<{ name: string; count: number }>;
  keywords?: Array<{ name: string; count: number }>;
  analysis?: { text: string; actionables?: string[] };
}

// Hook principal optimizado
export function useOptimizedCognitiveResults(researchId: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['optimized-cognitive-results', researchId],
    queryFn: async () => {
      const response = await moduleResponsesAPI.getResponsesByResearch(researchId);
      return response as GroupedResponsesData;
    },
    enabled: !!researchId,
  });

  // Procesar datos de Linear Scale
  const processLinearScaleData = (questionKey: string, configData?: any): ProcessedLinearScaleData | null => {
    if (!data?.[questionKey]) return null;

    const responses = data[questionKey];
    const questionConfig = configData?.questions?.find((q: any) => q.questionKey === questionKey);
    
    // Obtener rango de escala desde la configuración
    const scaleRange = {
      start: questionConfig?.scaleConfig?.startValue || 1,
      end: questionConfig?.scaleConfig?.endValue || 5
    };

    // Calcular distribución
    const distribution: Record<number, number> = {};
    let totalValue = 0;
    let totalResponses = responses.length;

    responses.forEach(response => {
      const value = response.value;
      if (typeof value === 'number') {
        distribution[value] = (distribution[value] || 0) + 1;
        totalValue += value;
      }
    });

    const average = totalResponses > 0 ? totalValue / totalResponses : 0;

    return {
      question: questionConfig?.title || questionConfig?.description || 'Linear Scale Question',
      description: questionConfig?.description,
      scaleRange,
      responses: Object.entries(distribution).map(([value, count]) => ({
        value: parseInt(value),
        count
      })),
      average,
      totalResponses,
      distribution,
      responseTime: calculateAverageResponseTime(responses)
    };
  };

  // Procesar datos de Ranking
  const processRankingData = (questionKey: string, configData?: any): ProcessedRankingData | null => {
    if (!data?.[questionKey]) return null;

    const responses = data[questionKey];
    const questionConfig = configData?.questions?.find((q: any) => q.questionKey === questionKey);
    
    if (!questionConfig?.choices) return null;

    const options: RankingOption[] = questionConfig.choices.map((choice: any, index: number) => {
      const choiceText = choice.text;
      const rankings = responses
        .map(r => r.value)
        .filter(v => Array.isArray(v))
        .map(ranking => ranking.indexOf(choiceText) + 1)
        .filter(rank => rank > 0);

      const mean = rankings.length > 0 ? rankings.reduce((a, b) => a + b, 0) / rankings.length : 0;
      
      // Crear distribución compatible con RankingDistribution
      const distribution: RankingDistribution = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
      };
      
      rankings.forEach(rank => {
        if (rank >= 1 && rank <= 6) {
          distribution[rank as keyof RankingDistribution] = (distribution[rank as keyof RankingDistribution] || 0) + 1;
        }
      });

      return {
        id: choice.id || `choice-${index + 1}`,
        text: choiceText,
        mean,
        responseTime: calculateAverageResponseTime(responses),
        distribution
      };
    });

    return {
      question: questionConfig?.title || questionConfig?.description || 'Ranking Question',
      options
    };
  };

  // Procesar datos de Choice
  const processChoiceData = (questionKey: string, configData?: any): ProcessedChoiceData | null => {
    if (!data?.[questionKey]) return null;

    const responses = data[questionKey];
    const questionConfig = configData?.questions?.find((q: any) => q.questionKey === questionKey);
    
    if (!questionConfig?.choices) return null;

    const totalResponses = responses.length;
    const optionCounts: Record<string, number> = {};

    responses.forEach(response => {
      const value = response.value;
      if (Array.isArray(value)) {
        // Multiple choice
        value.forEach(v => {
          optionCounts[v] = (optionCounts[v] || 0) + 1;
        });
      } else {
        // Single choice
        optionCounts[value] = (optionCounts[value] || 0) + 1;
      }
    });

    const options = questionConfig.choices.map((choice: any) => ({
      id: choice.id,
      text: choice.text,
      count: optionCounts[choice.id] || 0,
      percentage: totalResponses > 0 ? ((optionCounts[choice.id] || 0) / totalResponses) * 100 : 0,
      color: getRandomColor()
    }));

    return {
      question: questionConfig?.title || questionConfig?.description || 'Choice Question',
      options,
      totalResponses,
      responseDuration: calculateAverageResponseTime(responses)
    };
  };

  // Procesar datos de Sentiment
  const processSentimentData = (questionKey: string): ProcessedSentimentData | null => {
    if (!data?.[questionKey]) return null;

    const responses = data[questionKey];
    const texts = responses
      .map(r => r.value)
      .filter(v => typeof v === 'string' && v.trim().length > 0);

    if (texts.length === 0) return null;

    const sentimentResults = texts.map((text, index) => ({
      id: `sentiment-${index + 1}`,
      text,
      sentiment: 'neutral' as const // Placeholder - implementar análisis de sentimiento real
    }));

    return {
      sentimentResults,
      themes: [],
      keywords: [],
      analysis: { text: 'Análisis de sentimiento pendiente' }
    };
  };

  // Función auxiliar para calcular tiempo promedio de respuesta
  const calculateAverageResponseTime = (responses: GroupedResponse[]): string => {
    const times = responses
      .map(r => r.responseTime)
      .filter(t => t)
      .map(t => parseFloat(t?.replace('s', '') || '0'));
    
    if (times.length === 0) return '0s';
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return `${avg.toFixed(1)}s`;
  };

  // Función auxiliar para generar colores aleatorios
  const getRandomColor = () => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    processLinearScaleData,
    processRankingData,
    processChoiceData,
    processSentimentData
  };
} 