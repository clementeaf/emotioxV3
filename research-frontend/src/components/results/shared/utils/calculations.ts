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

export const hasScores = (scores: number[] | undefined): boolean => {
  return !!(scores && scores.length > 0);
};
