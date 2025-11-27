/**
 * Interfaces para el módulo de análisis de emociones
 */

/**
 * Datos de una emoción individual con su valor y color
 */
export interface EmotionData {
  emotion: string;
  value: number;
  color: string;
}

/**
 * Item de análisis reciente de emociones
 */
export interface AnalysisItem {
  id: number;
  title: string;
  date: string;
  dominantEmotion: string;
  score: number;
}

/**
 * Item de lista con punto de color (para insights, recomendaciones, etc.)
 */
export interface BulletItem {
  color: string;
  text: string;
}

/**
 * Configuración de dashboard de emociones
 */
export interface EmotionsDashboardConfig {
  emotionData: EmotionData[];
  keyInsights: BulletItem[];
  nextSteps: BulletItem[];
  recentAnalysis: AnalysisItem[];
  recommendations: BulletItem[];
}

/**
 * Props para componentes de emociones
 */
export interface EmotionBarProps {
  emotion: string;
  value: number;
  color: string;
}

export interface AnalysisItemProps {
  item: AnalysisItem;
}

export interface BulletPointProps {
  color: string;
  text: string;
}
