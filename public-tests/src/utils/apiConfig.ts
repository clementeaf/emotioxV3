/**
 * Configuración de API para public-tests
 * Se actualiza automáticamente en cada deploy
 */

// import { getApiConfig, buildApiUrl, buildWebSocketUrl, getS3Config, getCloudFrontConfig } from 'shared/config/apiConfig';

/**
 * Configuración de API para public-tests
 */
export const apiConfig = {
  // URLs principales
  get apiUrl() {
    return process.env.VITE_API_URL || 'https://api-dev.emotioxv2.com';
  },
  
  get websocketUrl() {
    return process.env.VITE_WEBSOCKET_URL || 'wss://api-dev.emotioxv2.com/ws';
  },
  
  // URLs específicas para public-tests
  get testUrl() {
    return `${this.apiUrl}/test`;
  },
  
  get participantUrl() {
    return `${this.apiUrl}/participant`;
  },
  
  get resultsUrl() {
    return `${this.apiUrl}/results`;
  },
  
  // URLs para diferentes tipos de preguntas
  get smartVocUrl() {
    return `${this.apiUrl}/smart-voc`;
  },
  
  get cognitiveTasksUrl() {
    return `${this.apiUrl}/cognitive-tasks`;
  },
  
  get moduleResponsesUrl() {
    return `${this.apiUrl}/module-responses`;
  },
  
  get eyeTrackingUrl() {
    return `${this.apiUrl}/eye-tracking`;
  },
  
  // Configuración de AWS
  get s3Config() {
    return {
      bucket: process.env.VITE_S3_BUCKET || 'emotioxv2-uploads-dev',
      region: process.env.VITE_AWS_REGION || 'us-east-1',
      baseUrl: `https://${process.env.VITE_S3_BUCKET || 'emotioxv2-uploads-dev'}.s3.${process.env.VITE_AWS_REGION || 'us-east-1'}.amazonaws.com`
    };
  },
  
  get cloudFrontConfig() {
    return {
      distributionId: process.env.VITE_CLOUDFRONT_DISTRIBUTION_ID || 'E1234567890DEV',
      domain: process.env.VITE_CLOUDFRONT_DOMAIN || 'd1234567890dev.cloudfront.net',
      baseUrl: `https://${process.env.VITE_CLOUDFRONT_DOMAIN || 'd1234567890dev.cloudfront.net'}`
    };
  },
  
  // Información del entorno
  get environment() {
    return process.env.NODE_ENV || 'development';
  },
  
  get region() {
    return process.env.VITE_AWS_REGION || 'us-east-1';
  }
};

/**
 * Construye URL completa para un endpoint específico
 */
export const buildEndpointUrl = (endpoint: string, params?: Record<string, string>): string => {
  let url = `${apiConfig.apiUrl}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
};

/**
 * Construye URL para WebSocket con parámetros
 */
export const buildWebSocketEndpoint = (path: string, params?: Record<string, string>): string => {
  let url = `${apiConfig.websocketUrl}${path}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
};

/**
 * Construye URL para archivos en S3
 */
export const buildS3Url = (key: string): string => {
  return `${apiConfig.s3Config.baseUrl}/${key}`;
};

/**
 * Construye URL para archivos en CloudFront
 */
export const buildCloudFrontUrl = (path: string): string => {
  return `${apiConfig.cloudFrontConfig.baseUrl}${path}`;
};

/**
 * Obtiene configuración completa para debugging
 */
export const getFullConfig = () => {
  return {
    api: apiConfig,
    endpoints: {
      test: apiConfig.testUrl,
      participant: apiConfig.participantUrl,
      results: apiConfig.resultsUrl,
      smartVoc: apiConfig.smartVocUrl,
      cognitiveTasks: apiConfig.cognitiveTasksUrl,
      moduleResponses: apiConfig.moduleResponsesUrl,
      eyeTracking: apiConfig.eyeTrackingUrl
    },
    aws: {
      s3: apiConfig.s3Config,
      cloudFront: apiConfig.cloudFrontConfig
    },
    environment: {
      stage: apiConfig.environment,
      region: apiConfig.region
    }
  };
};
