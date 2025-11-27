export const NAVIGATION_FLOW_CONFIG = {
  // Configuración de imágenes placeholder
  placeholderImages: [
    {
      id: '1',
      name: 'Imagen 1',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="%23f8fafc"/><text x="400" y="300" font-family="Arial" font-size="24" text-anchor="middle" dominant-baseline="middle" fill="%23666">Imagen 1</text></svg>',
      hitZones: []
    },
    {
      id: '2',
      name: 'Imagen 2',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="%23f8fafc"/><text x="400" y="300" font-family="Arial" font-size="24" text-anchor="middle" dominant-baseline="middle" fill="%23666">Imagen 2</text></svg>',
      hitZones: []
    },
    {
      id: '3',
      name: 'Imagen 3',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="%23f8fafc"/><text x="400" y="300" font-family="Arial" font-size="24" text-anchor="middle" dominant-baseline="middle" fill="%23666">Imagen 3</text></svg>',
      hitZones: []
    }
  ],

  // Configuración de estilos
  styles: {
    clickPoint: {
      size: 12, // w-3 h-3
      correctColor: 'bg-green-500',
      incorrectColor: 'bg-red-500',
      border: 'border-2 border-white shadow-lg',
      baseClasses: 'absolute rounded-full pointer-events-none'
    },
    clickPointLarge: {
      size: 16, // w-4 h-4
      correctColor: 'bg-green-500',
      incorrectColor: 'bg-red-500',
      border: 'border-2 border-white shadow-lg',
      baseClasses: 'absolute rounded-full pointer-events-none'
    },
    imageSelector: {
      selected: 'bg-blue-500 text-white border-blue-500',
      unselected: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
      baseClasses: 'px-4 py-2 rounded-lg border transition-colors'
    }
  },

  // Configuración de comportamiento
  behavior: {
    defaultShowHeatmap: true,
    defaultShowCorrectClicks: true,
    defaultShowIncorrectClicks: true,
    enableDebugLogging: process.env.NODE_ENV === 'development'
  }
};
