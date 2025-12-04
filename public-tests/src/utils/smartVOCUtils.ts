/**
 * Utilidades para SmartVOC renderers
 */

export interface ScaleConfig extends Record<string, unknown> {
  min: number;
  max: number;
  leftLabel: string;
  rightLabel: string;
  startLabel: string;
  endLabel: string;
}

/**
 * Configuraciones por defecto para diferentes tipos de SmartVOC
 */
export const DEFAULT_SMARTVOC_CONFIGS = {
  CSAT: {
    min: 1,
    max: 5,
    leftLabel: 'Muy insatisfecho',
    rightLabel: 'Muy satisfecho',
    startLabel: 'Muy insatisfecho',
    endLabel: 'Muy satisfecho'
  },
  CES: {
    min: 1,
    max: 5,
    leftLabel: 'Muy difícil',
    rightLabel: 'Muy fácil',
    startLabel: 'Muy difícil',
    endLabel: 'Muy fácil'
  },
  CV: {
    min: 1,
    max: 5,
    leftLabel: 'No en absoluto',
    rightLabel: 'Totalmente',
    startLabel: 'No en absoluto',
    endLabel: 'Totalmente'
  },
  NPS: {
    min: 0,
    max: 10,
    leftLabel: 'No lo recomendaría',
    rightLabel: 'Lo recomendaría',
    startLabel: 'No lo recomendaría',
    endLabel: 'Lo recomendaría'
  }
} as const;

/**
 * Crea configuración de escala con valores personalizados
 */
export const createScaleConfig = (
  baseConfig: ScaleConfig,
  customConfig?: Partial<ScaleConfig>
): ScaleConfig => {
  const config = { ...baseConfig, ...customConfig };

  // Generar labels con valores si no están personalizados
  if (!customConfig?.leftLabel && !customConfig?.rightLabel) {
    config.leftLabel = `${config.min} - ${config.leftLabel}`;
    config.rightLabel = `${config.max} - ${config.rightLabel}`;
    config.startLabel = `${config.min} - ${config.startLabel}`;
    config.endLabel = `${config.max} - ${config.endLabel}`;
  }

  return config;
};

/**
 * Extrae el número máximo de selecciones de las instrucciones
 * @param instructions - Texto de instrucciones a analizar
 * @returns Número máximo de selecciones encontrado, o undefined si no se encuentra
 */
export const extractMaxSelections = (instructions: string): number | undefined => {
  if (!instructions || typeof instructions !== 'string') {
    return undefined;
  }

  // 🎯 Mapeo de números escritos en palabras a dígitos
  const wordToNumber: Record<string, number> = {
    'un': 1,
    'una': 1,
    'uno': 1,
    'dos': 2,
    'tres': 3,
    'cuatro': 4,
    'cinco': 5,
    'seis': 6,
    'siete': 7,
    'ocho': 8,
    'nueve': 9,
    'diez': 10
  };

  // 🎯 Primero intentar con números escritos en palabras
  const wordNumberPattern = /selecciona\s+(?:máximo\s+|maximo\s+|hasta\s+)?(un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+emociones?/i;
  const wordMatch = instructions.match(wordNumberPattern);
  if (wordMatch && wordMatch[1]) {
    const wordNumber = wordMatch[1].toLowerCase();
    const number = wordToNumber[wordNumber];
    if (number && number > 0 && number <= 10) {
      console.log('[extractMaxSelections] ✅ Número en palabras encontrado:', number, 'en instrucciones:', instructions);
      return number;
    }
  }

  // 🎯 Patrones con dígitos (comportamiento original)
  const patterns = [
    /selecciona\s+maximo\s+(\d+)\s+emociones/i,
    /selecciona\s+máximo\s+(\d+)\s+emociones/i,
    /selecciona\s+hasta\s+(\d+)\s+emociones/i,
    /selecciona\s+(\d+)\s+emociones/i,
    /hasta\s+(\d+)\s+emociones/i,
    /máximo\s+(\d+)\s+emociones/i,
    /max\s+(\d+)\s+emociones/i,
    /máx\s+(\d+)\s+emociones/i,
    /(\d+)\s+emociones/i,
    /selecciona\s+hasta\s+(\d+)/i,
    /selecciona\s+máximo\s+(\d+)/i,
    /selecciona\s+maximo\s+(\d+)/i,
    /hasta\s+(\d+)/i,
    /máximo\s+(\d+)/i,
    /máx\s+(\d+)/i,
    /max\s+(\d+)/i
  ];

  for (const pattern of patterns) {
    const match = instructions.match(pattern);
    if (match && match[1]) {
      const number = parseInt(match[1], 10);
      if (number > 0 && number <= 10) {
        console.log('[extractMaxSelections] ✅ Número encontrado:', number, 'en instrucciones:', instructions);
        return number;
      }
    }
  }

  // 🎯 ÚLTIMO INTENTO: Buscar cualquier número entre 1 y 10 en el texto
  const allNumbers = instructions.match(/\b(\d+)\b/g);
  if (allNumbers) {
    for (const numStr of allNumbers) {
      const number = parseInt(numStr, 10);
      if (number > 0 && number <= 10) {
        console.log('[extractMaxSelections] ✅ Número encontrado (búsqueda general):', number, 'en instrucciones:', instructions);
        return number;
      }
    }
  }

  // No se encontró número en las instrucciones
  console.warn('[extractMaxSelections] ❌ No se identificó número máximo de selecciones en las instrucciones:', instructions);
  return undefined;
};

/**
 * Crea configuración base para QuestionComponent
 */
export const createQuestionConfig = (
  contentConfiguration: Record<string, unknown>,
  currentQuestionKey: string,
  type: string,
  config: Record<string, unknown>
) => ({
  title: String(contentConfiguration?.title || ''),
  questionKey: currentQuestionKey,
  type,
  config: {
    ...config,
    instructions: contentConfiguration?.instructions as string
  },
  choices: [],
  description: String(contentConfiguration?.description || '')
});
