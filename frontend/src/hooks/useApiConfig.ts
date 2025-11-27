import { useMemo } from 'react';

/**
 * Hook para obtener configuración de API en el frontend
 */
export const useApiConfig = () => {
  return useMemo(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-dev.emotioxv2.com';
    const websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://api-dev.emotioxv2.com/ws';
    
    return {
      apiUrl,
      websocketUrl,
      
      // URLs específicas
      authUrl: `${apiUrl}/auth`,
      researchUrl: `${apiUrl}/research`,
      participantsUrl: `${apiUrl}/participants`,
      responsesUrl: `${apiUrl}/responses`,
      formsUrl: `${apiUrl}/forms`,
      educationalContentUrl: `${apiUrl}/educational-content`,
      eyeTrackingUrl: `${apiUrl}/eye-tracking`,
      smartVocUrl: `${apiUrl}/smart-voc`,
      cognitiveTasksUrl: `${apiUrl}/cognitive-tasks`,
      moduleResponsesUrl: `${apiUrl}/module-responses`,
      
      // Configuración de AWS
      s3: {
        bucket: process.env.NEXT_PUBLIC_S3_BUCKET || 'emotioxv2-uploads-dev',
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
        baseUrl: `https://${process.env.NEXT_PUBLIC_S3_BUCKET || 'emotioxv2-uploads-dev'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'}.amazonaws.com`
      },
      cloudFront: {
        distributionId: process.env.NEXT_PUBLIC_CLOUDFRONT_DISTRIBUTION_ID || 'E1234567890DEV',
        domain: process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || 'd1234567890dev.cloudfront.net',
        baseUrl: `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || 'd1234567890dev.cloudfront.net'}`
      },
      
      // Información del entorno
      environment: process.env.NODE_ENV || 'development',
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
    };
  }, []);
};

/**
 * Hook para obtener URLs dinámicas basadas en el entorno
 */
export const useDynamicEndpoints = () => {
  const config = useApiConfig();
  
  return useMemo(() => ({
    // URLs que cambian según el entorno
    getApiUrl: (endpoint: string) => `${config.apiUrl}${endpoint}`,
    getWebSocketUrl: (path: string) => `${config.websocketUrl}${path}`,
    getS3Url: (key: string) => `${config.s3.baseUrl}/${key}`,
    getCloudFrontUrl: (path: string) => `${config.cloudFront.baseUrl}${path}`,
    
    // URLs específicas para diferentes servicios
    getResearchUrl: (researchId: string) => `${config.researchUrl}/${researchId}`,
    getParticipantUrl: (participantId: string) => `${config.participantsUrl}/${participantId}`,
    getResponseUrl: (responseId: string) => `${config.responsesUrl}/${responseId}`,
    
    // URLs para archivos
    getUploadUrl: (filename: string) => `${config.s3.baseUrl}/uploads/${filename}`,
    getImageUrl: (imagePath: string) => `${config.cloudFront.baseUrl}/images/${imagePath}`,
  }), [config]);
};
