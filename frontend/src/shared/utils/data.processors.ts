/**
 * 🔄 DATA PROCESSORS - Pure Functions
 * Processes raw API data into structured formats
 * Follows KISS and DRY principles
 */

import type {
  GroupedResponse,
  ResponseItem,
  SmartVOCProcessedData,
  SmartVOCResponse,
  SmartVOCProcessors,
  CPVMetrics,
  CPVScores,
  TrustFlowDataPoint,
  VOCResponse
} from '../types/data-processors.types';

// Constants for emotion processing
const POSITIVE_EMOTIONS: string[] = [
  'Feliz', 'Satisfecho', 'Confiado', 'Valorado', 'Cuidado', 'Seguro',
  'Enfocado', 'Indulgente', 'Estimulado', 'Exploratorio', 'Interesado', 'Enérgico'
];

const NEGATIVE_EMOTIONS: string[] = [
  'Descontento', 'Frustrado', 'Irritado', 'Decepción', 
  'Estresado', 'Infeliz', 'Desatendido', 'Apresurado'
];

/**
 * Process SmartVOC data from grouped responses
 */
export function processSmartVOCData(groupedResponses: GroupedResponse[]): SmartVOCProcessedData {
  const processors: SmartVOCProcessors = {
    smartVOCResponses: [],
    npsScores: [],
    csatScores: [],
    cesScores: [],
    nevScores: [],
    cvScores: [],
    vocResponses: []
  };

  groupedResponses.forEach((questionGroup: GroupedResponse) => {
    if (!isSmartVOCQuestion(questionGroup.questionKey) || !hasValidResponses(questionGroup.responses)) {
      return;
    }

    questionGroup.responses.forEach((response: ResponseItem) => {
      const smartVOCResponse = createSmartVOCResponse(questionGroup.questionKey, response);
      processors.smartVOCResponses.push(smartVOCResponse);

      processResponseByType(questionGroup.questionKey, response, processors);
    });
  });

  const totalResponses = processors.smartVOCResponses.length;
  const uniqueParticipants = getUniqueParticipantCount(processors.smartVOCResponses);
  const npsScore = calculateNPSScore(processors.npsScores);

  return {
    totalResponses,
    uniqueParticipants,
    npsScore,
    csatScores: processors.csatScores,
    cesScores: processors.cesScores,
    nevScores: processors.nevScores,
    cvScores: processors.cvScores,
    vocResponses: processors.vocResponses,
    smartVOCResponses: processors.smartVOCResponses
  };
}

/**
 * Process CPV data from grouped responses
 */
export function processCPVData(groupedResponses: GroupedResponse[]): CPVMetrics {
  const scores: CPVScores = {
    csat: [],
    ces: [],
    nps: [],
    nev: [],
    cv: []
  };

  let totalResponses = 0;

  groupedResponses.forEach((questionGroup: GroupedResponse) => {
    if (!isSmartVOCQuestion(questionGroup.questionKey) || !hasValidResponses(questionGroup.responses)) {
      return;
    }

    totalResponses += questionGroup.responses.length;

    questionGroup.responses.forEach((response: ResponseItem) => {
      const numericValue = parseResponseValue(response.value);
      if (isValidScore(numericValue)) {
        categorizeScore(questionGroup.questionKey, numericValue, scores);
      }
    });
  });

  return calculateCPVMetrics(scores, totalResponses);
}

/**
 * Process TrustFlow data from grouped responses
 */
export function processTrustFlowData(groupedResponses: GroupedResponse[]): TrustFlowDataPoint[] {
  const responsesByDate: Record<string, Array<ResponseItem & { questionKey: string }>> = {};

  groupedResponses.forEach((questionGroup: GroupedResponse) => {
    if (!hasValidResponses(questionGroup.responses)) return;

    questionGroup.responses.forEach((response: ResponseItem) => {
      if (!response.timestamp || typeof response.timestamp !== 'string') return;

      const dateKey = extractDateKey(response.timestamp);
      if (!responsesByDate[dateKey]) {
        responsesByDate[dateKey] = [];
      }
      responsesByDate[dateKey].push({ ...response, questionKey: questionGroup.questionKey });
    });
  });

  return Object.keys(responsesByDate)
    .map(date => processDateResponses(date, responsesByDate[date]))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// Helper functions
function isSmartVOCQuestion(questionKey: string): boolean {
  return questionKey?.toLowerCase().includes('smartvoc') ?? false;
}

function hasValidResponses(responses: ResponseItem[]): boolean {
  return Array.isArray(responses) && responses.length > 0;
}

function createSmartVOCResponse(questionKey: string, response: ResponseItem): SmartVOCResponse {
  return {
    questionKey,
    response: typeof response.value === 'object' && !Array.isArray(response.value) 
      ? JSON.stringify(response.value) 
      : response.value as string | number | string[],
    participantId: response.participantId as string,
    participantName: 'Participante',
    timestamp: (response.timestamp as string) || new Date().toISOString()
  };
}

function processResponseByType(
  questionKey: string, 
  response: ResponseItem, 
  processors: SmartVOCProcessors
): void {
  const lowerKey = questionKey.toLowerCase();
  
  if (lowerKey.includes('nps')) {
    const score = parseResponseValue(response.value);
    if (score > 0) processors.npsScores.push(score);
  } else if (lowerKey.includes('csat')) {
    const score = parseResponseValue(response.value);
    if (score > 0) processors.csatScores.push(score);
  } else if (lowerKey.includes('ces')) {
    const score = parseResponseValue(response.value);
    if (score > 0) processors.cesScores.push(score);
  } else if (lowerKey.includes('nev')) {
    const nevScore = calculateNEVScore(response.value);
    if (nevScore !== null) processors.nevScores.push(nevScore);
  } else if (lowerKey.includes('cv')) {
    const score = parseResponseValue(response.value);
    if (score > 0) processors.cvScores.push(score);
  } else if (lowerKey.includes('voc')) {
    processors.vocResponses.push({
      text: parseResponseText(response.value),
      participantId: response.participantId,
      participantName: 'Participante',
      timestamp: response.timestamp
    });
  }
}

function calculateNEVScore(value: string | number | boolean | string[] | Record<string, unknown>): number | null {
  if (!Array.isArray(value)) return null;

  const emotions = value as string[];
  const positiveCount = emotions.filter(emotion => 
    POSITIVE_EMOTIONS.includes(emotion)
  ).length;
  
  const negativeCount = emotions.filter(emotion => 
    NEGATIVE_EMOTIONS.includes(emotion)  
  ).length;

  const totalEmotions = emotions.length;
  if (totalEmotions === 0) return null;

  return Math.round(((positiveCount - negativeCount) / totalEmotions) * 100);
}

function getUniqueParticipantCount(responses: SmartVOCResponse[]): number {
  return new Set(responses.map(r => r.participantId)).size;
}

function calculateNPSScore(npsScores: number[]): number {
  if (npsScores.length === 0) return 0;
  
  const promoters = npsScores.filter(score => score >= 9).length;
  const detractors = npsScores.filter(score => score <= 6).length;
  
  return Math.round(((promoters - detractors) / npsScores.length) * 100);
}

function isValidScore(score: number): boolean {
  return !isNaN(score) && score > 0;
}

function categorizeScore(
  questionKey: string, 
  score: number, 
  scores: CPVScores
): void {
  const lowerKey = questionKey.toLowerCase();
  
  if (lowerKey.includes('csat')) {
    scores.csat.push(score);
  } else if (lowerKey.includes('ces')) {
    scores.ces.push(score);
  } else if (lowerKey.includes('nps')) {
    scores.nps.push(score);
  } else if (lowerKey.includes('cv')) {
    scores.cv.push(score);
  }
}

function calculateCPVMetrics(
  scores: CPVScores, 
  totalResponses: number
): CPVMetrics {
  const csatAvg = calculateAverage(scores.csat);
  const cesAvg = calculateAverage(scores.ces);
  const npsAvg = calculateAverage(scores.nps);
  const cvAvg = calculateAverage(scores.cv);
  const nevAvg = calculateAverage(scores.nev);

  const cpvValue = roundToOne(csatAvg);
  const satisfaction = roundToOne(csatAvg);
  
  const csatPercentage = calculatePercentage(scores.csat, score => score >= 4);
  const cesPercentage = calculatePercentage(scores.ces, score => score <= 2);
  
  const promoters = scores.nps.filter(score => score >= 9).length;
  const neutrals = scores.nps.filter(score => score >= 7 && score <= 8).length;
  const retention = totalResponses > 0 ? Math.round(((promoters + neutrals) / totalResponses) * 100) : 0;
  
  const detractors = scores.nps.length - promoters - neutrals;
  const impact: 'Alto' | 'Medio' | 'Bajo' = promoters > detractors ? 'Alto' : totalResponses > 0 ? 'Medio' : 'Bajo';
  const trend: 'Positiva' | 'Neutral' | 'Negativa' = promoters > detractors ? 'Positiva' : totalResponses > 0 ? 'Neutral' : 'Negativa';
  
  const npsValue = scores.nps.length > 0 ? Math.round(((promoters - detractors) / scores.nps.length) * 100) : 0;
  const peakValue = Math.max(cpvValue, satisfaction, retention);

  return {
    cpvValue,
    satisfaction,
    retention,
    impact,
    trend,
    csatPercentage,
    cesPercentage,
    cvValue: roundToOne(cvAvg),
    nevValue: roundToOne(nevAvg),
    npsValue,
    peakValue
  };
}

/**
 * Extrae la clave de fecha usando la zona horaria local del navegador
 * Esto asegura que las fechas se agrupen correctamente según la hora local del usuario
 */
function extractDateKey(timestamp: string): string {
  const date = new Date(timestamp);
  // Usar métodos locales en lugar de UTC para mantener consistencia con la zona horaria del usuario
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function processDateResponses(
  date: string, 
  responses: Array<ResponseItem & { questionKey: string }>
): TrustFlowDataPoint {
  const npsScores = responses
    .filter(r => r.questionKey?.toLowerCase().includes('nps'))
    .map(r => parseResponseValue(r.value))
    .filter(score => isValidScore(score));

  const nevScores = responses
    .filter(r => r.questionKey?.toLowerCase().includes('nev'))
    .map(r => calculateNEVScore(r.value))
    .filter((score): score is number => score !== null);

  const avgNps = calculateAverage(npsScores);
  const avgNev = calculateAverage(nevScores);

  // Formatear fecha usando la fecha ISO completa para evitar problemas de zona horaria
  // date viene como 'YYYY-MM-DD', agregamos hora del mediodía para evitar problemas de zona horaria
  const dateObj = new Date(date + 'T12:00:00');
  return {
    stage: dateObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    nps: roundToOne(avgNps),
    nev: roundToOne(avgNev),
    timestamp: date
  };
}

// Utility functions
export function parseResponseValue(response: string | number | boolean | string[] | Record<string, unknown>): number {
  if (typeof response === 'number') return response;
  if (typeof response === 'boolean') return response ? 1 : 0;
  if (typeof response === 'string') {
    const parsed = parseFloat(response);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (response && typeof response === 'object' && 'value' in response) {
    return parseResponseValue(response.value as string | number | boolean | string[] | Record<string, unknown>);
  }
  return 0;
}

export function parseResponseText(response: string | number | boolean | string[] | Record<string, unknown>): string {
  if (typeof response === 'string') return response;
  if (typeof response === 'boolean') return response ? 'true' : 'false';
  if (response && typeof response === 'object' && 'value' in response) {
    return parseResponseText(response.value as string | number | boolean | string[] | Record<string, unknown>);
  }
  return JSON.stringify(response);
}

function calculateAverage(scores: number[]): number {
  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}

function calculatePercentage(scores: number[], predicate: (score: number) => boolean): number {
  return scores.length > 0 ? Math.round((scores.filter(predicate).length / scores.length) * 100) : 0;
}

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}