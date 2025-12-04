/**
 * Utilidades para el componente RankingList
 */

/**
 * Parsea datos de ranking desde diferentes fuentes
 */
export const parseRankingData = (data: unknown): string[] | null => {
  if (!data) return null;

  try {
    if (typeof data === 'string') {
      if (data.startsWith('[')) {
        return JSON.parse(data);
      } else {
        return data.split(',').map(s => s.trim());
      }
    } else if (Array.isArray(data)) {
      return data;
    }
  } catch (error) {
    // Error parsing ranking data - returning null
  }

  return null;
};

/**
 * Intercambia elementos en un array
 */
export const swapArrayElements = <T>(array: T[], index1: number, index2: number): T[] => {
  const newArray = [...array];
  [newArray[index1], newArray[index2]] = [newArray[index2], newArray[index1]];
  return newArray;
};

/**
 * Valida si un índice es válido para movimiento hacia arriba
 */
export const canMoveUp = (index: number): boolean => {
  return index > 0;
};

/**
 * Valida si un índice es válido para movimiento hacia abajo
 */
export const canMoveDown = (index: number, arrayLength: number): boolean => {
  return index < arrayLength - 1;
};

/**
 * Genera clases CSS para botones de movimiento
 */
export const getMoveButtonClasses = (isDisabled: boolean, baseClasses: string = ''): string => {
  const disabledClasses = isDisabled 
    ? 'opacity-40 hover:bg-transparent text-neutral-400' 
    : 'hover:bg-gray-200 text-neutral-600';
  
  return `${baseClasses} p-1 rounded transition-colors ${disabledClasses}`;
};

/**
 * Genera aria-label para botones de movimiento
 */
export const getMoveButtonAriaLabel = (item: string, direction: 'up' | 'down'): string => {
  const itemName = item.trim() === '' ? 'item sin texto' : item;
  const directionText = direction === 'up' ? 'hacia arriba' : 'hacia abajo';
  return `Mover ${itemName} ${directionText}`;
};
