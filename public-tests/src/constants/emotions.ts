// 🎯 CONSTANTES DE EMOCIONES PARA SMARTVOC NEV
// Organizadas por categorías para mejor mantenimiento

export const EMOTIONS = {
  // 🟢 EMOCIONES POSITIVAS (Primera fila - 7 emociones)
  POSITIVE: [
    'Feliz',
    'Satisfecho', 
    'Confiado',
    'Valorado',
    'Cuidado',
    'Seguro',
    'Enfocado'
  ],
  
  // 🟡 EMOCIONES NEUTRAS/MIXTAS (Segunda fila - 6 emociones)
  NEUTRAL: [
    'Indulgente',
    'Estimulado',
    'Exploratorio',
    'Interesado',
    'Enérgico',
    'Descontento'
  ],
  
  // 🔴 EMOCIONES NEGATIVAS (Tercera fila - 7 emociones)
  NEGATIVE: [
    'Frustrado',
    'Irritado',
    'Decepción',
    'Estresado',
    'Infeliz',
    'Desatendido',
    'Apresurado'
  ]
} as const;

// 🎯 CONFIGURACIÓN DE GRID PARA CADA FILA
export const EMOTION_GRID_CONFIG = {
  POSITIVE: {
    className: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7',
    buttonClass: 'bg-green-100 border-green-200 text-green-800 hover:bg-green-200',
    selectedClass: 'bg-blue-500 border-blue-600 text-white shadow-lg'
  },
  NEUTRAL: {
    className: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
    buttonClass: 'bg-green-200 border-green-300 text-green-900 hover:bg-green-300',
    selectedClass: 'bg-blue-500 border-blue-600 text-white shadow-lg'
  },
  NEGATIVE: {
    className: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7',
    buttonClass: 'bg-red-100 border-red-200 text-red-800 hover:bg-red-200',
    selectedClass: 'bg-blue-500 border-blue-600 text-white shadow-lg'
  }
} as const;

// 🎯 TIPOS DERIVADOS
export type EmotionCategory = keyof typeof EMOTIONS;
export type Emotion = typeof EMOTIONS[EmotionCategory][number];
