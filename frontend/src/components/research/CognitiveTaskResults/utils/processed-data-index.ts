/**
 * Utilidades para indexar y buscar datos procesados de manera eficiente
 */

interface ProcessedDataItem {
  questionId?: string;
  questionKey?: string;
  totalResponses?: number;
  [key: string]: unknown;
}

interface ProcessedDataIndex {
  byQuestionId: Map<string, ProcessedDataItem>;
  byQuestionKey: Map<string, ProcessedDataItem>;
  byNormalizedKey: Map<string, ProcessedDataItem[]>;
  allItems: ProcessedDataItem[];
}

/**
 * Crea un índice optimizado de processedData para búsquedas rápidas
 * @param processedData - Array de datos procesados
 * @returns Índice con múltiples Mapas para búsquedas O(1)
 */
export function createProcessedDataIndex(processedData: ProcessedDataItem[]): ProcessedDataIndex {
  const byQuestionId = new Map<string, ProcessedDataItem>();
  const byQuestionKey = new Map<string, ProcessedDataItem>();
  const byNormalizedKey = new Map<string, ProcessedDataItem[]>();

  processedData.forEach((item) => {
    // Índice por questionId
    if (item.questionId) {
      byQuestionId.set(item.questionId, item);
    }

    // Índice por questionKey exacto
    if (item.questionKey) {
      byQuestionKey.set(item.questionKey, item);

      // Índice por questionKey normalizado (lowercase) para búsquedas con includes
      const normalizedKey = item.questionKey.toLowerCase();
      if (!byNormalizedKey.has(normalizedKey)) {
        byNormalizedKey.set(normalizedKey, []);
      }
      byNormalizedKey.get(normalizedKey)!.push(item);
    }
  });

  return {
    byQuestionId,
    byQuestionKey,
    byNormalizedKey,
    allItems: processedData
  };
}

/**
 * Busca datos procesados para una pregunta usando múltiples estrategias
 * @param index - Índice de datos procesados
 * @param questionId - ID de la pregunta
 * @param questionType - Tipo de pregunta (ej: 'cognitive_short_text')
 * @returns Datos procesados encontrados o undefined
 */
export function findProcessedDataForQuestion(
  index: ProcessedDataIndex,
  questionId: string,
  questionType: string
): ProcessedDataItem | undefined {
  // Estrategia 1: Búsqueda directa por questionId
  const byId = index.byQuestionId.get(questionId);
  if (byId) {
    return byId;
  }

  // Estrategia 2: Búsqueda por questionKey esperado
  const normalizedType = questionType.replace(/^cognitive_/, '');
  const expectedQuestionKey = `cognitive_${normalizedType}`;
  const byKey = index.byQuestionKey.get(expectedQuestionKey);
  if (byKey) {
    return byKey;
  }

  // Estrategia 3: Búsqueda por questionId como questionKey
  const byIdAsKey = index.byQuestionKey.get(questionId);
  if (byIdAsKey) {
    return byIdAsKey;
  }

  // Estrategia 4: Búsqueda por tipo normalizado (includes)
  if (normalizedType) {
    const normalizedTypeLower = normalizedType.toLowerCase();
    
    // Buscar en todos los items que contengan el tipo normalizado
    const entries = Array.from(index.byNormalizedKey.entries());
    for (const [key, items] of entries) {
      if (key.includes(normalizedTypeLower)) {
        // Si hay múltiples matches, preferir el que también coincida con questionId
        const exactMatch = items.find((item: ProcessedDataItem) => item.questionId === questionId);
        if (exactMatch) {
          return exactMatch;
        }
        // Si no hay match exacto, retornar el primero
        return items[0];
      }
    }
  }

  return undefined;
}

