/**
 * Funciones de cálculo seguro para scores
 */

/**
 * Calcula el promedio de un array de scores de forma segura
 * @param scores - Array de scores numéricos
 * @returns Promedio calculado o 0 si no hay scores
 */
export function safeCalculateAverage(scores: number[] | undefined): number {
  if (!scores || scores.length === 0) return 0;
  return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
}

/**
 * Calcula el porcentaje de scores que cumplen una condición
 * @param scores - Array de scores numéricos
 * @param filterFn - Función de filtrado
 * @returns Porcentaje redondeado o 0 si no hay scores
 */
export function safeCalculatePercentage(
  scores: number[] | undefined, 
  filterFn: (score: number) => boolean
): number {
  if (!scores || scores.length === 0) return 0;
  return Math.round((scores.filter(filterFn).length / scores.length) * 100);
}

/**
 * Verifica si hay scores disponibles
 * @param scores - Array de scores numéricos
 * @returns true si hay scores, false en caso contrario
 */
export function hasScores(scores: number[] | undefined): boolean {
  return !!(scores && scores.length > 0);
}

