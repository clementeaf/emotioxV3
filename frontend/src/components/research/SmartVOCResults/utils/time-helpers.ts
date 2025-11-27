/**
 * Funciones helper para cálculos de tiempo
 */

/**
 * Calcula el tiempo transcurrido desde un timestamp hasta ahora
 * @param timestamp - Timestamp en formato ISO string o Date
 * @returns String formateado (ej: "2h", "5m", "30s", "3d")
 */
export function calculateTimeAgo(timestamp: string | Date | undefined | null): string {
  if (!timestamp) return '0s';

  const now = new Date();
  const past = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  if (isNaN(past.getTime())) return '0s';

  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
}

/**
 * Obtiene el timestamp más reciente de un array de respuestas
 * @param responses - Array de respuestas con timestamp
 * @returns Timestamp más reciente o null
 */
export function getLatestTimestamp(
  responses: Array<{ timestamp?: string | Date }> | undefined
): string | Date | null {
  if (!responses || responses.length === 0) return null;

  const timestamps = responses
    .map(r => r.timestamp)
    .filter((ts): ts is string | Date => ts !== undefined && ts !== null)
    .map(ts => typeof ts === 'string' ? new Date(ts) : ts)
    .filter(date => !isNaN(date.getTime()));

  if (timestamps.length === 0) return null;

  return timestamps.reduce((latest, current) => 
    current > latest ? current : latest
  );
}

