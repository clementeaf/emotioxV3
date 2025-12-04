// ARCHIVO GENERADO AUTOMÁTICAMENTE
// NO MODIFICAR MANUALMENTE
// Generado: 2025-08-14T16:59:02.872Z

// Endpoints de API exportados desde backend
export const API_ENDPOINTS = {
  // Endpoint HTTP API
  http: "https://h68qs1et9j.execute-api.us-east-1.amazonaws.com/dev",

  // Endpoint WebSocket
  ws: "wss://b59weq4qqh.execute-api.us-east-1.amazonaws.com/dev",

  // Etapa de despliegue (dev, prod, etc.)
  stage: "dev"
};

// URLs de desarrollo local - FIXED: Usar puerto correcto para public-tests
export const LOCAL_URLS = {
  "frontend": "http://localhost:3000",
  "publicTests": "http://localhost:5173"
};

// Constantes para uso más fácil
export const API_HTTP_ENDPOINT = "https://h68qs1et9j.execute-api.us-east-1.amazonaws.com/dev";
export const API_WEBSOCKET_ENDPOINT = "wss://b59weq4qqh.execute-api.us-east-1.amazonaws.com/dev";

// Función para obtener URL completa de una ruta
export function getApiUrl(path) {
  // Eliminar slash inicial si existe
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_HTTP_ENDPOINT}/${cleanPath}`;
}

// Función para websocket
export function getWebsocketUrl() {
  return API_WEBSOCKET_ENDPOINT;
}

// Función para obtener URL de public-tests
export function getPublicTestsUrl() {
  return LOCAL_URLS.publicTests || 'http://localhost:5173';
}

// Función para navegar a public-tests con researchID
export function navigateToPublicTests(researchID) {
  const url = `${getPublicTestsUrl()}/${researchID}`;
  window.open(url, '_blank');
}

// Versión default para import default
export default API_ENDPOINTS;
