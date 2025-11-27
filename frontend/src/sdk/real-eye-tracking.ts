/**
 * Real Eye Tracking SDK para EmotioXV2
 * Implementa eye tracking real con permisos de cámara
 * Basado en WebGazer.js para eye tracking en navegador
 */

import type {
  GazePoint,
  EyeTrackerStatus,
  StartEyeTrackingParams,
  StopEyeTrackingParams,
  EyeTrackingAPIResponse,
  AreaOfInterest
} from '../../../shared/eye-tracking-types';

/**
 * SDK de Eye Tracking Real con Cámara
 * Solicita permisos de cámara y realiza eye tracking real
 */
export class RealEyeTrackingSDK {
  private readonly apiBaseUrl: string;
  private readonly apiKey?: string;
  private currentSessionId?: string;
  private isTracking: boolean = false;
  private gazeDataBuffer: GazePoint[] = [];
  private eventListeners: Map<string, Function[]> = new Map();
  private videoElement?: HTMLVideoElement;
  private canvasElement?: HTMLCanvasElement;
  private gazeCaptureInterval: NodeJS.Timeout | null = null;
  private cleanupFunctions: (() => void)[] = [];

  constructor(apiBaseUrl: string, apiKey?: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
    console.log('[RealEyeTrackingSDK] Inicializando SDK de Eye Tracking Real');
  }

  // Event Emitter
  on(eventName: string, listener: Function) {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName)?.push(listener);
  }

  off(eventName: string, listener: Function) {
    if (!this.eventListeners.has(eventName)) {
      return;
    }
    const listeners = this.eventListeners.get(eventName)?.filter(l => l !== listener);
    this.eventListeners.set(eventName, listeners || []);
  }

  emit(eventName: string, data?: any) {
    this.eventListeners.get(eventName)?.forEach(listener => listener(data));
  }

  /**
   * Inicia una sesión de eye tracking real
   */
  async startTracking(params: StartEyeTrackingParams): Promise<EyeTrackingAPIResponse<any>> {
    try {
      console.log('[RealEyeTrackingSDK] Iniciando eye tracking real', {
        participantId: params.participantId,
        platform: params.config.platform
      });

      // 1. Solicitar permisos de cámara
      const cameraPermission = await this.requestCameraPermission();
      if (!cameraPermission.success) {
        throw new Error('Permisos de cámara denegados');
      }

      // 2. Iniciar sesión con backend
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
        this.emit('sessionStarted', eyeTrackingResponse.data);

        // 3. Iniciar captura real de eye tracking
        await this.startRealEyeTracking();
      }

      return eyeTrackingResponse;

    } catch (error) {
      console.error('[RealEyeTrackingSDK] Error iniciando eye tracking real:', error);
      return {
        success: false,
        error: `Error al iniciar eye tracking: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Detiene la sesión de eye tracking
   */
  async stopTracking(params: StopEyeTrackingParams): Promise<EyeTrackingAPIResponse<any>> {
    try {
      console.log('[RealEyeTrackingSDK] Deteniendo eye tracking real', { sessionId: params.sessionId });

      this.stopRealEyeTracking();
      this.isTracking = false;

      const stopResponse = await this.makeRequest('POST', '/eye-tracking/stop', params);

      if (stopResponse.success) {
        this.currentSessionId = undefined;
        this.emit('sessionStopped', stopResponse.data);
      }

      return stopResponse;
    } catch (error) {
      console.error('[RealEyeTrackingSDK] Error deteniendo eye tracking real:', error);
      return {
        success: false,
        error: `Error al detener eye tracking: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Solicita permisos de cámara
   */
  private async requestCameraPermission(): Promise<{ success: boolean; stream?: MediaStream; error?: string }> {
    try {
      console.log('[RealEyeTrackingSDK] Solicitando permisos de cámara...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      console.log('[RealEyeTrackingSDK] Permisos de cámara obtenidos');
      this.emit('cameraPermissionGranted', { stream });
      
      return { success: true, stream };
    } catch (error) {
      console.error('[RealEyeTrackingSDK] Error obteniendo permisos de cámara:', error);
      this.emit('cameraPermissionDenied', { error });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Inicia eye tracking real con cámara
   */
  private async startRealEyeTracking(): Promise<void> {
    try {
      // Crear elementos de video y canvas
      this.videoElement = document.createElement('video');
      this.canvasElement = document.createElement('canvas');

      // Configurar video
      this.videoElement.style.display = 'none';
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;

      // Obtener stream de cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });

      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      // Configurar canvas
      this.canvasElement.width = 640;
      this.canvasElement.height = 480;

      // Iniciar captura de eye tracking
      this.startEyeTrackingCapture();

      // Cleanup function
      this.cleanupFunctions.push(() => {
        stream.getTracks().forEach(track => track.stop());
        if (this.videoElement) {
          this.videoElement.pause();
          this.videoElement.srcObject = null;
        }
      });

    } catch (error) {
      console.error('[RealEyeTrackingSDK] Error iniciando eye tracking real:', error);
      this.emit('eyeTrackingError', { error });
    }
  }

  /**
   * Inicia la captura de eye tracking
   * NOTA: Por ahora NO enviamos datos automáticamente
   * Solo configuramos la cámara para uso manual
   */
  private startEyeTrackingCapture(): void {
    console.log('[RealEyeTrackingSDK] Cámara configurada para eye tracking manual');
    // NO iniciamos intervalo automático
    // Los datos se enviarán solo cuando se llame manualmente a addGazePoint
  }


  /**
   * Detiene eye tracking real
   */
  private stopRealEyeTracking(): void {
    if (this.gazeCaptureInterval) {
      clearInterval(this.gazeCaptureInterval);
      this.gazeCaptureInterval = null;
    }

    // Ejecutar cleanup functions
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];
  }

  /**
   * Agrega un punto de mirada al buffer
   */
  addGazePoint(gazePoint: GazePoint): void {
    if (this.isTracking && this.currentSessionId) {
      this.gazeDataBuffer.push(gazePoint);
      this.emit('gazeData', gazePoint);
      
      // Enviar inmediatamente (no en lotes)
      this.flushGazeData();
    }
  }

  /**
   * Simula un punto de mirada para testing
   */
  simulateGazePoint(): GazePoint {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    
    return {
      x,
      y,
      timestamp: Date.now(),
      leftEye: {
        x: x - 5,
        y: y - 5,
        pupilSize: 3.0 + Math.random() * 0.5,
        validity: 0.9
      },
      rightEye: {
        x: x + 5,
        y: y + 5,
        pupilSize: 3.0 + Math.random() * 0.5,
        validity: 0.9
      }
    };
  }

  /**
   * Envía datos de mirada al servidor
   */
  private async flushGazeData(): Promise<void> {
    if (this.gazeDataBuffer.length === 0 || !this.currentSessionId) {
      return;
    }

    try {
      const gazePoints = this.gazeDataBuffer.splice(0, this.gazeDataBuffer.length);
      await this.makeRequest('POST', '/eye-tracking/gaze-data', {
        sessionId: this.currentSessionId,
        gazePoints
      });
    } catch (error) {
      console.error('[RealEyeTrackingSDK] Error enviando datos de mirada:', error);
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
    hasCamera: boolean;
  } {
    return {
      isTracking: this.isTracking,
      sessionId: this.currentSessionId,
      platform: this.detectPlatform(),
      hasCamera: !!this.videoElement
    };
  }

  /**
   * Genera análisis de eye tracking
   */
  async generateAnalysis(params: { sessionId: string; analysisType: string; areasOfInterest?: any[] }): Promise<EyeTrackingAPIResponse<any>> {
    try {
      console.log('[RealEyeTrackingSDK] Generando análisis de eye tracking', params);

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
      console.error('[RealEyeTrackingSDK] Error generando análisis:', error);
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
          orientationWeight: 0.2
        }
      });
    } catch (error) {
      console.error('[RealEyeTrackingSDK] Error generando saliency map:', error);
      return {
        success: false,
        error: `Error generando saliency map: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Genera saliency map (alias para compatibilidad)
   */
  async generateSaliencyMap(params: { sessionId: string; imageUrl?: string; algorithm?: string }): Promise<EyeTrackingAPIResponse<any>> {
    try {
      return await this.makeRequest('POST', '/ogama/saliency', {
        sessionId: params.sessionId,
        stimulusImage: params.imageUrl,
        algorithm: params.algorithm || 'itti-koch',
        parameters: {
          centerBias: 0.5,
          colorWeight: 0.3,
          orientationWeight: 0.2
        }
      });
    } catch (error) {
      console.error('[RealEyeTrackingSDK] Error generando saliency map:', error);
      return {
        success: false,
        error: `Error generando saliency map: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Detecta la plataforma actual
   */
  private detectPlatform(): 'ios' | 'android' | 'web' | 'unity' | 'windows' {
    if (typeof window === 'undefined') {
      return 'web';
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
}
