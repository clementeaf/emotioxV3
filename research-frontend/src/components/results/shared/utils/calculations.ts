/**
 * Safe calculation utilities for scores and percentages
 */

export const safeCalculateAverage = (scores: number[] | undefined): number => {
  if (!scores || scores.length === 0) return 0;
  return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
};

export const safeCalculatePercentage = (
  scores: number[] | undefined,
  filterFn: (score: number) => boolean
): number => {
  if (!scores || scores.length === 0) return 0;
  return Math.round((scores.filter(filterFn).length / scores.length) * 100);
};

/**
 * Calculate CSAT score: (Number of satisfied customers / Total respondents) × 100
 * Satisfied customers = scores 4 and 5
 */
export const calculateCSAT = (scores: number[] | undefined): number => {
  if (!scores || scores.length === 0) return 0;
  const satisfiedCustomers = scores.filter(score => score >= 4).length;
  const totalRespondents = scores.length;
  return parseFloat(((satisfiedCustomers / totalRespondents) * 100).toFixed(2));
};

/**
 * CES sentiment zones by scale max.
 * CES asks "How easy was it?" — high scores = easy (positive), low scores = hard (negative).
 * Matches participant-frontend ScaleSelector zones.
 */
export const getCESZones = (scaleMax: number): { positive: [number, number]; neutral: [number, number]; negative: [number, number] } => {
  if (scaleMax === 10) return { negative: [1, 3], neutral: [4, 7], positive: [8, 10] };
  if (scaleMax === 7)  return { negative: [1, 3], neutral: [4, 4], positive: [5, 7] };
  return { negative: [1, 2], neutral: [3, 3], positive: [4, 5] }; // 1-5 default
};

/**
 * Calculate CES score: (% Easy / positive) - (% Hard / negative)
 * Zones adapt to scale (1-5, 1-7, 1-10).
 */
export const calculateCES = (scores: number[] | undefined, scaleMax = 5): number => {
  if (!scores || scores.length === 0) return 0;
  const zones = getCESZones(scaleMax);
  const littleEffort = scores.filter(s => s >= zones.positive[0] && s <= zones.positive[1]).length;
  const muchEffort = scores.filter(s => s >= zones.negative[0] && s <= zones.negative[1]).length;
  const total = scores.length;

  const littleEffortPct = (littleEffort / total) * 100;
  const muchEffortPct = (muchEffort / total) * 100;

  return parseFloat((littleEffortPct - muchEffortPct).toFixed(2));
};

/**
 * Calculate CV (Cognitive Value) score: (% Positive results) - (% Negative results)
 * Positive results = scores 4 and 5
 * Negative results = scores 1 and 2
 */
export const calculateCV = (scores: number[] | undefined): number => {
  if (!scores || scores.length === 0) return 0;
  const positiveResults = scores.filter(score => score >= 4).length;
  const negativeResults = scores.filter(score => score <= 2).length;
  const total = scores.length;
  
  const positivePercentage = (positiveResults / total) * 100;
  const negativePercentage = (negativeResults / total) * 100;
  
  return parseFloat((positivePercentage - negativePercentage).toFixed(2));
};

export const hasScores = (scores: number[] | Array<{ value: number }> | undefined): boolean => {
  return !!(scores && scores.length > 0);
};
