/**
 * Unified Eye Tracking SDK para EmotioXV2
 * SDK optimizado que combina Eyedid SDK (mobile) + Ogama (análisis avanzado)
 * Arquitectura híbrida sin duplicaciones ni conflictos
 */

import type { 
  GazePoint, 
  StartEyeTrackingParams,
  EyeTrackingAPIResponse,
} from '../../../shared/eye-tracking-types';

/**
 * Clase principal del SDK Híbrido para EmotioXV2
 * Combina Eyedid SDK para captura + Ogama para análisis
 */
export class HybridEyeTrackingSDK {
  private readonly apiBaseUrl: string;
  private readonly apiKey?: string;
  private currentSessionId?: string;
  private isTracking: boolean = false;
  private gazeDataBuffer: GazePoint[] = [];
  private eventListeners: Map<string, Function[]> = new Map();
  private deviceType: 'eyedid' | 'theeyetribe' | 'tobii' | 'smi' | 'custom' = 'eyedid';

  constructor(apiBaseUrl: string, apiKey?: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
    console.log('[HybridEyeTrackingSDK] Inicializando SDK Híbrido para EmotioXV2');
  }

  /**
   * Inicia una sesión de eye tracking híbrida
   */
  async startTracking(params: StartEyeTrackingParams, useOgama: boolean = true): Promise<EyeTrackingAPIResponse<any>> {
    try {
      console.log('[HybridEyeTrackingSDK] Iniciando eye tracking híbrido', {
        participantId: params.participantId,
        platform: params.config.platform,
        useOgama
      });

      // 1. Iniciar sesión con Eyedid SDK
      const eyeTrackingResponse = await this.makeRequest('POST', '/eye-tracking/start', {
        ...params,
        config: {
          ...params.config,
          platform: this.detectPlatform(),
          sdkVersion: '1.0.0',
          enableRemoteTesting: true,
          enableHeatmaps: true,
          enableRealTimeInsights: true
        }
      });

      if (eyeTrackingResponse.success && eyeTrackingResponse.data) {
        this.currentSessionId = eyeTrackingResponse.data.sessionId;
        this.isTracking = true;
        this.deviceType = this.detectDeviceType();
        this.emit('sessionStarted', eyeTrackingResponse.data);
        
        // Iniciar captura de datos de mirada
        this.startGazeCapture();

        // 2. Si se solicita, iniciar análisis con Ogama (deshabilitado para demo)
        if (useOgama) { // Habilitado cuando sea necesario
          setTimeout(async () => {
            try {
              const ogamaResponse = await this.startOgamaAnalysis(this.currentSessionId!, this.deviceType);
              this.emit('ogamaAnalysisStarted', ogamaResponse.data);
            } catch (error) {
              console.warn('[HybridEyeTrackingSDK] Error iniciando análisis Ogama:', error);
            }
          }, 2000); // Esperar 2 segundos para tener datos
        }
      }

      return eyeTrackingResponse;

    } catch (error) {
      console.error('[HybridEyeTrackingSDK] Error iniciando eye tracking híbrido:', error);
      return {
        success: false,
        error: `Error iniciando eye tracking híbrido: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Detiene la sesión de eye tracking híbrida
   */
  async stopTracking(saveData: boolean = true, generateAnalysis: boolean = false): Promise<EyeTrackingAPIResponse<any>> {
    if (!this.currentSessionId) {
      return {
        success: false,
        error: 'No hay sesión activa',
        timestamp: new Date().toISOString()
      };
    }

    try {
      console.log('[HybridEyeTrackingSDK] Deteniendo eye tracking híbrido', {
        sessionId: this.currentSessionId,
        saveData,
        generateAnalysis
      });

      // 1. Enviar datos de mirada restantes
      if (this.gazeDataBuffer.length > 0) {
        await this.flushGazeData();
      }

      // 2. Detener sesión de eye tracking
      const eyeTrackingResponse = await this.makeRequest('POST', '/eye-tracking/stop', {
        sessionId: this.currentSessionId,
        saveData,
        generateAnalysis
      });

      // 3. Si se solicita, generar análisis final con Ogama
      if (generateAnalysis) {
        try {
          const ogamaAnalysis = await this.generateOgamaAnalysis(this.currentSessionId);
          this.emit('ogamaAnalysisCompleted', ogamaAnalysis.data);
        } catch (error) {
          console.warn('[HybridEyeTrackingSDK] Error en análisis final Ogama:', error);
        }
      }

      if (eyeTrackingResponse.success) {
        this.isTracking = false;
        this.currentSessionId = undefined;
        this.gazeDataBuffer = [];
        this.emit('sessionStopped', eyeTrackingResponse.data);
      }

      return eyeTrackingResponse;

    } catch (error) {
      console.error('[HybridEyeTrackingSDK] Error deteniendo eye tracking híbrido:', error);
      return {
        success: false,
        error: `Error deteniendo eye tracking híbrido: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Inicia análisis con Ogama
   */
  async startOgamaAnalysis(sessionId: string, deviceType: string): Promise<EyeTrackingAPIResponse<any>> {
    try {
      return await this.makeRequest('POST', '/ogama/analyze', {
        sessionId,
        deviceType
      });
    } catch (error) {
      console.error('[HybridEyeTrackingSDK] Error iniciando análisis Ogama:', error);
      return {
        success: false,
        error: `Error iniciando análisis Ogama: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Genera análisis de eye tracking
   */
  async generateAnalysis(params: { sessionId: string; analysisType: string; areasOfInterest?: any[] }): Promise<EyeTrackingAPIResponse<any>> {
    try {
      console.log('[HybridEyeTrackingSDK] Generando análisis de eye tracking', params);
      
      // Usar Ogama para análisis avanzado
      const ogamaResponse = await this.makeRequest('POST', '/ogama/analyze', {
        sessionId: params.sessionId,
        analysisType: params.analysisType,
        areasOfInterest: params.areasOfInterest
      });

      if (ogamaResponse.success) {
        this.emit('ogamaAnalysisCompleted', ogamaResponse.data);
      }

      return ogamaResponse;
    } catch (error) {
      console.error('[HybridEyeTrackingSDK] Error generando análisis:', error);
      return {
        success: false,
        error: `Error generando análisis: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Genera saliency maps con Ogama
   */
  async generateSaliencyMaps(sessionId: string, stimulusImage?: string): Promise<EyeTrackingAPIResponse<any>> {
    try {
      return await this.makeRequest('POST', '/ogama/saliency', {
        sessionId,
        stimulusImage,
        algorithm: 'itti-koch',
        parameters: {
          centerBias: 0.5,
          colorWeight: 0.3,
          intensityWeight: 0.3,
          orientationWeight: 0.4
        }
      });
    } catch (error) {
      console.error('[HybridEyeTrackingSDK] Error generando saliency maps:', error);
      return {
        success: false,
        error: `Error generando saliency maps: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Analiza múltiples dispositivos con Ogama
   */
  async analyzeMultiDevice(sessions: Array<{sessionId: string, deviceType: string}>): Promise<EyeTrackingAPIResponse<any>> {
    try {
      return await this.makeRequest('POST', '/ogama/multi-device', {
        sessions
      });
    } catch (error) {
      console.error('[HybridEyeTrackingSDK] Error analizando múltiples dispositivos:', error);
      return {
        success: false,
        error: `Error analizando múltiples dispositivos: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Obtiene dispositivos soportados por Ogama
   */
  async getSupportedDevices(): Promise<EyeTrackingAPIResponse<string[]>> {
    try {
      return await this.makeRequest('GET', '/ogama/devices');
    } catch (error) {
      console.error('[HybridEyeTrackingSDK] Error obteniendo dispositivos soportados:', error);
      return {
        success: false,
        error: `Error obteniendo dispositivos soportados: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verifica el estado de Ogama
   */
  async checkOgamaStatus(): Promise<EyeTrackingAPIResponse<any>> {
    try {
      return await this.makeRequest('GET', '/ogama/status');
    } catch (error) {
      console.error('[HybridEyeTrackingSDK] Error verificando estado de Ogama:', error);
      return {
        success: false,
        error: `Error verificando estado de Ogama: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Genera análisis completo con Ogama
   */
  async generateOgamaAnalysis(sessionId: string): Promise<EyeTrackingAPIResponse<any>> {
    try {
      const analysisResponse = await this.startOgamaAnalysis(sessionId, this.deviceType);
      
      if (analysisResponse.success) {
        // Generar saliency maps
        const saliencyResponse = await this.generateSaliencyMaps(sessionId);
        
        return {
          success: true,
          data: {
            analysis: analysisResponse.data,
            saliency: saliencyResponse.data
          },
          timestamp: new Date().toISOString()
        };
      }

      return analysisResponse;
    } catch (error) {
      console.error('[HybridEyeTrackingSDK] Error generando análisis Ogama:', error);
      return {
        success: false,
        error: `Error generando análisis Ogama: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Agrega un listener de eventos
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remueve un listener de eventos
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emite un evento
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[HybridEyeTrackingSDK] Error en listener de evento ${event}:`, error);
        }
      });
    }
  }

  /**
   * Detecta la plataforma actual
   */
  private detectPlatform(): 'ios' | 'android' | 'web' | 'unity' | 'windows' {
    if (typeof window === 'undefined') {
      return 'web'; // Node.js environment
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    } else if (/unity/.test(userAgent)) {
      return 'unity';
    } else if (/windows/.test(userAgent)) {
      return 'windows';
    } else {
      return 'web';
    }
  }

  /**
   * Detecta el tipo de dispositivo
   */
  private detectDeviceType(): 'eyedid' | 'theeyetribe' | 'tobii' | 'smi' | 'custom' {
    const platform = this.detectPlatform();
    
    if (platform === 'ios' || platform === 'android') {
      return 'eyedid'; // Eyedid SDK para mobile
    } else if (platform === 'web') {
      return 'theeyetribe'; // TheEyeTribe para web
    } else {
      return 'custom'; // Dispositivo personalizado
    }
  }

  /**
   * Inicia la captura de datos de mirada
   */
  private startGazeCapture(): void {
    // Simulación de captura de datos de mirada
    // En implementación real, esto se conectaría con el SDK apropiado
    const captureInterval = setInterval(() => {
      if (!this.isTracking) {
        clearInterval(captureInterval);
        return;
      }

      // Simular datos de mirada
      const gazePoint: GazePoint = {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        timestamp: Date.now(),
        leftEye: {
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          pupilSize: Math.random() * 5 + 2,
          validity: Math.random() * 0.5 + 0.5
        },
        rightEye: {
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          pupilSize: Math.random() * 5 + 2,
          validity: Math.random() * 0.5 + 0.5
        }
      };

      this.gazeDataBuffer.push(gazePoint);
      this.emit('gazeData', gazePoint);

      // Enviar datos en lotes
      if (this.gazeDataBuffer.length >= 10) {
        this.flushGazeData();
      }

    }, 1000 / 60); // 60 FPS
  }

  /**
   * Agrega un punto de mirada al buffer
   */
  addGazePoint(gazePoint: GazePoint): void {
    if (this.isTracking && this.currentSessionId) {
      this.gazeDataBuffer.push(gazePoint);
      // Solo enviar cada 5 puntos para reducir spam
      if (this.gazeDataBuffer.length >= 5) {
        this.flushGazeData();
      }
    }
  }

  /**
   * Envía datos de mirada al servidor
   */
  private async flushGazeData(): Promise<void> {
    if (this.gazeDataBuffer.length === 0 || !this.currentSessionId) {
      return;
    }

    try {
      // Enviar todos los puntos acumulados en un solo request
      const gazePoints = this.gazeDataBuffer.splice(0, this.gazeDataBuffer.length);
      await this.makeRequest('POST', '/eye-tracking/gaze-data', {
        sessionId: this.currentSessionId,
        gazePoints // Enviar array de puntos
      });
    } catch (error) {
      console.error('[HybridEyeTrackingSDK] Error enviando datos de mirada:', error);
    }
  }

  /**
   * Realiza una petición HTTP al API
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const options: RequestInit = {
      method,
      headers,
      ...(data && { body: JSON.stringify(data) })
    };

    const response = await fetch(url, options);
    return await response.json();
  }

  /**
   * Obtiene el estado actual del SDK
   */
  getStatus(): {
    isTracking: boolean;
    sessionId?: string;
    platform: string;
    deviceType: string;
    gazeDataCount: number;
  } {
    return {
      isTracking: this.isTracking,
      sessionId: this.currentSessionId,
      platform: this.detectPlatform(),
      deviceType: this.deviceType,
      gazeDataCount: this.gazeDataBuffer.length
    };
  }

  /**
   * Limpia recursos del SDK
   */
  cleanup(): void {
    this.isTracking = false;
    this.currentSessionId = undefined;
    this.gazeDataBuffer = [];
    this.eventListeners.clear();
    console.log('[HybridEyeTrackingSDK] SDK híbrido limpiado');
  }
}

/**
 * Factory function para crear instancia del SDK híbrido
 */
export function createHybridEyeTrackingSDK(apiBaseUrl: string, apiKey?: string): HybridEyeTrackingSDK {
  return new HybridEyeTrackingSDK(apiBaseUrl, apiKey);
}

/**
 * Hook de React para usar SDK Híbrido
 */
export function useHybridEyeTrackingSDK(apiBaseUrl: string, apiKey?: string) {
  const [sdk] = useState(() => createHybridEyeTrackingSDK(apiBaseUrl, apiKey));
  const [status, setStatus] = useState(sdk.getStatus());
  const [ogamaStatus, setOgamaStatus] = useState<any>(null);

  useEffect(() => {
    const updateStatus = () => setStatus(sdk.getStatus());
    
    sdk.on('sessionStarted', updateStatus);
    sdk.on('sessionStopped', updateStatus);
    sdk.on('ogamaAnalysisStarted', (data: any) => {
      setOgamaStatus({ status: 'started', data });
    });
    sdk.on('ogamaAnalysisCompleted', (data: any) => {
      setOgamaStatus({ status: 'completed', data });
    });

    return () => {
      sdk.off('sessionStarted', updateStatus);
      sdk.off('sessionStopped', updateStatus);
      sdk.off('ogamaAnalysisStarted', () => {});
      sdk.off('ogamaAnalysisCompleted', () => {});
    };
  }, [sdk]);

  return {
    sdk,
    status,
    ogamaStatus,
    startTracking: sdk.startTracking.bind(sdk),
    stopTracking: sdk.stopTracking.bind(sdk),
    generateSaliencyMaps: sdk.generateSaliencyMaps.bind(sdk),
    analyzeMultiDevice: sdk.analyzeMultiDevice.bind(sdk),
    getSupportedDevices: sdk.getSupportedDevices.bind(sdk),
    checkOgamaStatus: sdk.checkOgamaStatus.bind(sdk)
  };
}

// Importaciones necesarias para React
import { useState, useEffect } from 'react';
