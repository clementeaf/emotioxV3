/**
 * Archivo centralizado de rutas para la aplicación
 * Contiene todas las rutas disponibles como constantes para evitar errores de tipeo
 */

// Rutas públicas
export const PUBLIC_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password'
};

// Rutas del dashboard autenticadas
export const DASHBOARD_ROUTES = {
  DASHBOARD: '/dashboard',
  PROFILE: '/dashboard/profile',
  SETTINGS: '/dashboard/settings'
};

// Rutas para investigación
export const RESEARCH_ROUTES = {
  LIST: '/research',
  CREATE: '/research/create',
  EDIT: (id: string) => `/research/edit/${id}`,
  VIEW: (id: string) => `/research/view/${id}`
};

// Rutas para pantallas de bienvenida
export const WELCOME_SCREEN_ROUTES = {
  LIST: '/welcome-screens',
  CREATE: '/welcome-screens/create',
  EDIT: (id: string) => `/welcome-screens/edit/${id}`,
  VIEW: (id: string) => `/welcome-screens/view/${id}`
};

// Rutas para pantallas de agradecimiento
export const THANK_YOU_SCREEN_ROUTES = {
  LIST: '/thank-you-screens',
  CREATE: '/thank-you-screens/create',
  EDIT: (id: string) => `/thank-you-screens/edit/${id}`,
  VIEW: (id: string) => `/thank-you-screens/view/${id}`
};

// Rutas para tareas cognitivas
export const COGNITIVE_TASK_ROUTES = {
  LIST: '/cognitive-tasks',
  CREATE: '/cognitive-tasks/create',
  EDIT: (id: string) => `/cognitive-tasks/edit/${id}`,
  VIEW: (id: string) => `/cognitive-tasks/view/${id}`
};

// Rutas para eye tracking
export const EYE_TRACKING_ROUTES = {
  LIST: '/eye-tracking',
  CREATE: '/eye-tracking/create',
  EDIT: (id: string) => `/eye-tracking/edit/${id}`,
  VIEW: (id: string) => `/eye-tracking/view/${id}`
};

// Rutas para participantes
export const PARTICIPANT_ROUTES = {
  LIST: '/participants',
  CREATE: '/participants/create',
  EDIT: (id: string) => `/participants/edit/${id}`,
  VIEW: (id: string) => `/participants/view/${id}`
};

// Rutas para SmartVOC
export const SMART_VOC_ROUTES = {
  LIST: '/smart-voc',
  CREATE: '/smart-voc/create',
  EDIT: (id: string) => `/smart-voc/edit/${id}`,
  VIEW: (id: string) => `/smart-voc/view/${id}`
};

// NUEVA SECCIÓN: Rutas API para el backend
export const API_ROUTES = {
  // Base de Research
  RESEARCH: {
    BASE: '/research',
    USER: '/research/user',
    CURRENT: '/research/current',
    ALL: '/research/all',
    ITEM: (id: string) => `/research/${id}`,
    STATUS: (id: string) => `/research/${id}/status`,
    
    // Rutas jerárquicas para recursos asociados a una investigación
    WELCOME_SCREEN: (id: string) => `/research/${id}/welcome-screen`,
    THANK_YOU_SCREEN: (id: string) => `/research/${id}/thank-you-screen`,
    COGNITIVE_TASK: (id: string) => `/research/${id}/cognitive-task`,
    EYE_TRACKING: (id: string) => `/research/${id}/eye-tracking`,
    SMART_VOC: (id: string) => `/research/${id}/smart-voc`,
    // Para rutas de reclutamiento
    EYE_TRACKING_RECRUIT: (id: string) => `/research/${id}/eye-tracking-recruit`
  },
  
  // Para las rutas de compatibilidad con versiones anteriores
  // NOTA: Estas rutas están en proceso de obsolescencia, favor de usar las nuevas rutas jerárquicas en API_ROUTES.RESEARCH
  LEGACY: {
    WELCOME_SCREEN: '/api/welcome-screen',
    THANK_YOU_SCREEN: '/api/thank-you-screen',
    COGNITIVE_TASK: '/api/cognitive-task',
    EYE_TRACKING: '/api/eye-tracking',
    EYE_TRACKING_RECRUIT: '/api/eye-tracking-recruit',
    SMART_VOC: '/api/smart-voc',
    PARTICIPANTS: '/api/participants',
    S3: '/api/s3'
  },
  
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
    REFRESH_TOKEN: '/auth/refreshToken'
  }
};

// Función helper para obtener una ruta basada en su nombre
export function getRoute(routeName: string, id?: string): string {
  const allRoutes = {
    ...PUBLIC_ROUTES,
    ...DASHBOARD_ROUTES,
    ...RESEARCH_ROUTES,
    ...WELCOME_SCREEN_ROUTES,
    ...THANK_YOU_SCREEN_ROUTES,
    ...COGNITIVE_TASK_ROUTES,
    ...EYE_TRACKING_ROUTES,
    ...PARTICIPANT_ROUTES,
    ...SMART_VOC_ROUTES
  };

  const route = allRoutes[routeName as keyof typeof allRoutes];
  
  if (typeof route === 'function' && id) {
    return route(id);
  }
  
  return route as string || '/';
}

export default {
  PUBLIC_ROUTES,
  DASHBOARD_ROUTES,
  RESEARCH_ROUTES,
  WELCOME_SCREEN_ROUTES,
  THANK_YOU_SCREEN_ROUTES,
  COGNITIVE_TASK_ROUTES,
  EYE_TRACKING_ROUTES,
  PARTICIPANT_ROUTES,
  SMART_VOC_ROUTES,
  API_ROUTES,
  getRoute
}; 