import type { EmotionCluster, EmotionOption } from '../emotion';

/**
 * Clusters emocionales según la jerarquía de valor emocional
 * Basado en BeyondPhilosophy.com - Versión en español
 */
export const EMOTION_CLUSTERS: EmotionCluster[] = [
  {
    id: 'destroying',
    name: 'Destroying',
    color: '#ef4444', // Red
    value: 1,
    emotions: [
      'Frustrado',
      'Irritado',
      'Decepción',
      'Estresado',
      'Infeliz',
      'Desatendido',
      'Apresurado'
    ],
    description: 'Estados emocionales destructivos que generan valor negativo'
  },
  {
    id: 'attention',
    name: 'Attention',
    color: '#16a34a', // Dark Green
    value: 2,
    emotions: [
      'Indulgente',
      'Reconocido',
      'Espíritu',
      'Foco',
      'Informativo',
      'Comprendido',
      'Sin problemas',
      'Energético',
      'Exploratorio'
    ],
    description: 'Estados que captan la atención de forma positiva'
  },
  {
    id: 'recommendation',
    name: 'Recommendation',
    color: '#22c55e', // Green
    value: 3,
    emotions: [
      'Cuidado',
      'Confianza',
      'Seguro',
      'Satisfecho',
      'Complacido'
    ],
    description: 'Estados que generan recomendación'
  },
  {
    id: 'advocacy',
    name: 'Advocacy',
    color: '#15803d', // Dark Green
    value: 4,
    emotions: [
      'Feliz',
      'Valorado',
      'Importancia',
      'Apreciación'
    ],
    description: 'Estados de máximo valor emocional que generan advocacy'
  }
];

/**
 * Lista completa de emociones con sus propiedades
 * Basado en la imagen con 20 emociones en español - EXACTA COMO FRONTEND
 */
export const ALL_EMOTIONS: EmotionOption[] = [
  // Primera fila - Emociones Positivas (7 emociones) - Verde Claro
  { id: 'feliz', name: 'Feliz', cluster: 'advocacy', value: 4, color: '#86efac' },
  { id: 'satisfecho', name: 'Satisfecho', cluster: 'advocacy', value: 4, color: '#86efac' },
  { id: 'confiado', name: 'Confiado', cluster: 'advocacy', value: 4, color: '#86efac' },
  { id: 'valorado', name: 'Valorado', cluster: 'advocacy', value: 4, color: '#86efac' },
  { id: 'cuidado', name: 'Cuidado', cluster: 'advocacy', value: 4, color: '#86efac' },
  { id: 'seguro', name: 'Seguro', cluster: 'advocacy', value: 4, color: '#86efac' },
  { id: 'enfocado', name: 'Enfocado', cluster: 'advocacy', value: 4, color: '#86efac' },

  // Segunda fila - Emociones de Atención (6 emociones) - Verde Medio
  { id: 'indulgente', name: 'Indulgente', cluster: 'attention', value: 2, color: '#bbf7d0' },
  { id: 'estimulado', name: 'Estimulado', cluster: 'attention', value: 2, color: '#bbf7d0' },
  { id: 'exploratorio', name: 'Exploratorio', cluster: 'attention', value: 2, color: '#bbf7d0' },
  { id: 'interesado', name: 'Interesado', cluster: 'attention', value: 2, color: '#bbf7d0' },
  { id: 'energico', name: 'Enérgico', cluster: 'attention', value: 2, color: '#bbf7d0' },
  { id: 'descontento', name: 'Descontento', cluster: 'attention', value: 2, color: '#bbf7d0' },

  // Tercera fila - Emociones Negativas (7 emociones) - Rojo Claro
  { id: 'frustrado', name: 'Frustrado', cluster: 'destroying', value: 1, color: '#fecaca' },
  { id: 'irritado', name: 'Irritado', cluster: 'destroying', value: 1, color: '#fecaca' },
  { id: 'decepcion', name: 'Decepción', cluster: 'destroying', value: 1, color: '#fecaca' },
  { id: 'estresado', name: 'Estresado', cluster: 'destroying', value: 1, color: '#fecaca' },
  { id: 'infeliz', name: 'Infeliz', cluster: 'destroying', value: 1, color: '#fecaca' },
  { id: 'desatendido', name: 'Desatendido', cluster: 'destroying', value: 1, color: '#fecaca' },
  { id: 'apresurado', name: 'Apresurado', cluster: 'destroying', value: 1, color: '#fecaca' }
];