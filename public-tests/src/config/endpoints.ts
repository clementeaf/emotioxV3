// ARCHIVO GENERADO AUTOMÁTICAMENTE
// NO MODIFICAR MANUALMENTE
// Generado: 2025-07-20T16:20:17.392Z
// ACTUALIZADO PARA USAR ENDPOINTS DINÁMICOS

import { DYNAMIC_API_ENDPOINTS, isEndpointsSynced } from './dynamic-endpoints';

// Endpoints de API exportados desde backend - Priorizar endpoints dinámicos
export const API_ENDPOINTS = {
  // Endpoint HTTP API - FIXED: Siempre usar AWS Lambda
  http: "https://h68qs1et9j.execute-api.us-east-1.amazonaws.com/dev",

  // Endpoint WebSocket - FIXED: Siempre usar AWS Lambda
  ws: "wss://b59weq4qqh.execute-api.us-east-1.amazonaws.com/dev",

  // Etapa de despliegue (dev, prod, etc.)
  stage: isEndpointsSynced() ? DYNAMIC_API_ENDPOINTS.stage : "dev"
};

// URLs de desarrollo local - FIXED: Usar puerto correcto para public-tests
export const LOCAL_URLS = {
  "frontend": "http://localhost:3000",
  "publicTests": "http://localhost:5173",
  "generatedAt": "2025-01-07T15:30:00.000Z"
};

// Constantes para uso más fácil - FIXED: Siempre usar AWS Lambda
export const API_HTTP_ENDPOINT = import.meta.env.VITE_API_URL || "https://h68qs1et9j.execute-api.us-east-1.amazonaws.com/dev";

export const API_WEBSOCKET_ENDPOINT = import.meta.env.VITE_WS_URL || "wss://b59weq4qqh.execute-api.us-east-1.amazonaws.com/dev";

// Función para obtener URL completa de una ruta
export function getApiUrl(path: string): string {
  // Eliminar slash inicial si existe
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_HTTP_ENDPOINT}/${cleanPath}`;
}

// Función para websocket
export function getWebsocketUrl(): string {
  return API_WEBSOCKET_ENDPOINT;
}

// Función para obtener URL de public-tests
export function getPublicTestsUrl(): string {
  return LOCAL_URLS.publicTests || 'http://localhost:5173';
}

// Función para navegar a public-tests con researchID
export function navigateToPublicTests(researchID: string): void {
  const url = `${getPublicTestsUrl()}/${researchID}`;
  window.open(url, '_blank');
}

// Versión default para import default
export default API_ENDPOINTS;
