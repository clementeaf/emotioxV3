/**
 * Utilidades para comparación y manipulación de strings
 */

/**
 * Calcula la distancia de Levenshtein entre dos strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j += 1) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calcula el porcentaje de similitud entre dos strings
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 100;
  if (str1.length === 0 || str2.length === 0) return 0;

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;

  return Math.max(0, similarity);
}

/**
 * Normaliza un string para comparación (elimina espacios extra, convierte a minúsculas, etc.)
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Reemplaza múltiples espacios por uno solo
    .replace(/[^\w\s]/g, ''); // Elimina caracteres especiales
}

/**
 * Encuentra strings similares en una lista
 */
export function findSimilarStrings(
  target: string,
  candidates: string[],
  threshold: number = 70
): Array<{ text: string; similarity: number }> {
  const normalizedTarget = normalizeString(target);

  return candidates
    .map(candidate => ({
      text: candidate,
      similarity: calculateSimilarity(normalizedTarget, normalizeString(candidate))
    }))
    .filter(result => result.similarity >= threshold && result.similarity < 100) // Excluir coincidencias exactas
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Verifica si dos strings son suficientemente similares para considerarse duplicados
 */
export function areSimilarEnough(str1: string, str2: string, threshold: number = 85): boolean {
  return calculateSimilarity(str1, str2) >= threshold;
}

/**
 * Encuentra la coincidencia más cercana en una lista
 */
export function findClosestMatch(
  target: string,
  candidates: string[]
): { text: string; similarity: number } | null {
  if (candidates.length === 0) return null;

  const similarities = findSimilarStrings(target, candidates, 0);
  return similarities.length > 0 ? similarities[0] : null;
}