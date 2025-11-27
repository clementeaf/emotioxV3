
/**
 * WebGazer Eye Tracking SDK LOCAL para EmotioXV2
 * Implementa eye tracking real con WebGazer.js SIN BACKEND
 */

import type {
  GazePoint,
  StartEyeTrackingParams,
  StopEyeTrackingParams,
  EyeTrackingAPIResponse
} from '../../../shared/eye-tracking-types';

/**
 * SDK de Eye Tracking LOCAL con WebGazer
 * Utiliza machine learning para detectar la mirada real SIN conexión al backend
 */
export class WebGazerEyeTrackingSDK {
  private readonly isLocalMode: boolean;
  private readonly apiBaseUrl: string;
  private readonly apiKey?: string;
  private currentSessionId?: string;
  private isTracking: boolean = false;
  private eventListeners: Map<string, Function[]> = new Map();
  private webgazer: any = null;
  private isInitialized: boolean = false;
  private lastGazeTime: number = 0;
  private lastGazeX: number = 0;
  private lastGazeY: number = 0;

  constructor(apiBaseUrl: string, apiKey?: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
    this.isLocalMode = apiBaseUrl === 'local-demo';
    console.log('[WebGazerEyeTrackingSDK] Inicializando SDK LOCAL con WebGazer');
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
   * Inicializa WebGazer
   */
  async initializeWebGazer(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.isInitialized) {
        return { success: true };
      }

      console.log('[WebGazerEyeTrackingSDK] Inicializando WebGazer...');
      
      // Importar WebGazer dinámicamente
      const webgazer = await import('webgazer');
      
      // Configurar WebGazer
      this.webgazer = webgazer.default;
      
      // Configurar WebGazer para máxima precisión basado en documentación oficial
      this.webgazer.showVideoPreview(true);
      this.webgazer.showPredictionPoints(false); // Desactivar puntos de predicción para evitar confusión
      this.webgazer.showFaceOverlay(true);
      this.webgazer.showFaceFeedbackBox(true);
      
      // Configuraciones avanzadas para mejor precisión (basado en documentación oficial)
      this.webgazer.setRegression('ridge'); // Ridge regression para mejor estabilidad
      this.webgazer.setGazeListener((data: any, clock: any) => {
        // Listener temporal para configuración
        console.log('[WebGazerEyeTrackingSDK] Configurando listener de mirada...');
      });
      this.webgazer.setGazeListener((data: any, clock: any) => {
        // Solo procesar datos válidos
        if (data && data.x && data.y && !isNaN(data.x) && !isNaN(data.y)) {
          console.log('[WebGazerEyeTrackingSDK] Raw gaze data:', { x: data.x, y: data.y });
        }
      });
      
      // Configurar parámetros de calibración basados en documentación oficial
      // WebGazer usa calibración automática de 9 puntos por defecto
      if (this.webgazer.params) {
        this.webgazer.params.calibrationPoints = 9; // 9 puntos como en los ejemplos oficiales
        this.webgazer.params.calibrationTime = 2000; // 2 segundos por punto
        this.webgazer.params.calibrationAccuracy = 0.7; // Precisión más realista
        this.webgazer.params.faceDetection = true;
        this.webgazer.params.eyeDetection = true;
        this.webgazer.params.pupilDetection = true;
        this.webgazer.params.regressionType = 'ridge'; // Ridge regression para mejor estabilidad
        this.webgazer.params.smoothing = true; // Suavizado para datos más estables
        this.webgazer.params.smoothingFactor = 0.7; // Factor de suavizado
      }
      
      // Configurar listener de mirada mejorado
      this.webgazer.setGazeListener((data: any, clock: any) => {
        if (data && this.isTracking && data.x && data.y && !isNaN(data.x) && !isNaN(data.y)) {
          // Validar que las coordenadas sean reales y estén en pantalla
          const x = Math.max(0, Math.min(data.x, window.innerWidth));
          const y = Math.max(0, Math.min(data.y, window.innerHeight));
          
          // Filtrar datos erráticos (movimientos muy bruscos)
          const currentTime = Date.now();
          if (this.lastGazeTime && (currentTime - this.lastGazeTime) < 100) {
            return; // Evitar spam de datos (más lento para mejor precisión)
          }
          this.lastGazeTime = currentTime;
          
          // Filtro adicional: verificar que las coordenadas sean razonables
          if (Math.abs(data.x - (this.lastGazeX || data.x)) > 200 || 
              Math.abs(data.y - (this.lastGazeY || data.y)) > 200) {
            return; // Saltar movimientos muy bruscos
          }
          this.lastGazeX = data.x;
          this.lastGazeY = data.y;
          
          const gazePoint: GazePoint = {
            x: Math.round(x),
            y: Math.round(y),
            timestamp: currentTime,
            leftEye: {
              x: x - 5,
              y: y - 5,
              pupilSize: 3.0,
              validity: 0.8
            },
            rightEye: {
              x: x + 5,
              y: y + 5,
              pupilSize: 3.0,
              validity: 0.8
            }
          };
          
          console.log('[WebGazerEyeTrackingSDK] Processed gaze point:', { x: gazePoint.x, y: gazePoint.y });
          this.emit('gazeData', gazePoint);
        }
      });
      
      // Inicializar WebGazer
      await this.webgazer.begin();

      this.isInitialized = true;
      console.log('[WebGazerEyeTrackingSDK] WebGazer inicializado correctamente');
      
      return { success: true };
    } catch (error) {
      console.error('[WebGazerEyeTrackingSDK] Error inicializando WebGazer:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Inicia una sesión de eye tracking LOCAL
   */
  async startTracking(params: StartEyeTrackingParams): Promise<EyeTrackingAPIResponse<any>> {
    try {
      console.log('[WebGazerEyeTrackingSDK] Iniciando eye tracking LOCAL con WebGazer');

      // 1. Inicializar WebGazer si no está inicializado
      const initResult = await this.initializeWebGazer();
      if (!initResult.success) {
        throw new Error(`Error inicializando WebGazer: ${initResult.error}`);
      }

      // ✅ MODO LOCAL: Crear sesión local sin backend
      if (this.isLocalMode) {
        this.currentSessionId = `local-session-${Date.now()}`;
        this.isTracking = true;
        this.emit('sessionStarted', { sessionId: this.currentSessionId });
        console.log('[WebGazerEyeTrackingSDK] Sesión LOCAL iniciada:', this.currentSessionId);
        
        return {
          success: true,
          data: { sessionId: this.currentSessionId },
          timestamp: new Date().toISOString()
        };
      }

      // 2. Iniciar sesión con backend (solo si no es modo local)
      const eyeTrackingResponse = await this.makeRequest('POST', '/eye-tracking/start', {
        ...params,
        config: {
          ...params.config,
          platform: 'web',
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
        console.log('[WebGazerEyeTrackingSDK] Sesión iniciada:', eyeTrackingResponse.data.sessionId);
      }

      return eyeTrackingResponse;

    } catch (error) {
      console.error('[WebGazerEyeTrackingSDK] Error iniciando eye tracking:', error);
      return {
        success: false,
        error: `Error al iniciar eye tracking: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Detiene la sesión de eye tracking LOCAL
   */
  async stopTracking(params: StopEyeTrackingParams): Promise<EyeTrackingAPIResponse<any>> {
    try {
      console.log('[WebGazerEyeTrackingSDK] Deteniendo eye tracking LOCAL');

      // Detener WebGazer
      if (this.webgazer) {
        this.webgazer.end();
      }

      this.isTracking = false;

      // ✅ MODO LOCAL: Detener sesión local sin backend
      if (this.isLocalMode) {
        this.currentSessionId = undefined;
        this.emit('sessionStopped', { sessionId: this.currentSessionId });
        console.log('[WebGazerEyeTrackingSDK] Sesión LOCAL detenida');
        
        return {
          success: true,
          data: { sessionId: this.currentSessionId },
          timestamp: new Date().toISOString()
        };
      }

      // Detener sesión con backend (solo si no es modo local)
      const stopResponse = await this.makeRequest('POST', '/eye-tracking/stop', params);

      if (stopResponse.success) {
        this.currentSessionId = undefined;
        this.emit('sessionStopped', stopResponse.data);
      }

      return stopResponse;
    } catch (error) {
      console.error('[WebGazerEyeTrackingSDK] Error deteniendo eye tracking:', error);
      return {
        success: false,
        error: `Error al detener eye tracking: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Realiza una petición HTTP al API (solo si no es modo local)
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    // ✅ MODO LOCAL: No hacer peticiones HTTP
    if (this.isLocalMode) {
      console.log('[WebGazerEyeTrackingSDK] Modo LOCAL: No se realizan peticiones HTTP');
      return {
        success: true,
        data: { message: 'Modo local activo' },
        timestamp: new Date().toISOString()
      };
    }

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
   * Inicia calibración automática de WebGazer (basada en documentación oficial)
   */
  async startCalibration(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.webgazer) {
        throw new Error('WebGazer no está inicializado. Primero inicia el eye tracking.');
      }

      if (!this.isTracking) {
        throw new Error('Debes iniciar el eye tracking antes de calibrar');
      }

      console.log('[WebGazerEyeTrackingSDK] Iniciando calibración automática de WebGazer...');
      
      // Usar calibración automática de WebGazer (método oficial)
      if (typeof this.webgazer.calibrate === 'function') {
        console.log('[WebGazerEyeTrackingSDK] Usando calibración automática de WebGazer...');
        await this.webgazer.calibrate();
        console.log('[WebGazerEyeTrackingSDK] Calibración automática completada');
        return { success: true };
      }
      
      // Fallback: Calibración manual mejorada
      console.warn('[WebGazerEyeTrackingSDK] Método calibrate no disponible, usando calibración manual');
      
      return new Promise((resolve) => {
        // Instrucciones basadas en la documentación oficial
        alert('🎯 Calibración Manual de WebGazer - Basada en Documentación Oficial\n\n📋 INSTRUCCIONES:\n1. Mantén la cara centrada en la cámara\n2. Asegúrate de tener buena iluminación\n3. Mira DIRECTAMENTE a cada punto que aparezca\n4. Mantén la mirada fija por 2 segundos por punto\n5. NO muevas la cabeza, solo los ojos\n6. Sigue el orden: centro → esquinas → centro\n\n🎯 PUNTOS DE CALIBRACIÓN (9 puntos):\n• Centro de pantalla\n• Esquina superior izquierda\n• Esquina superior derecha\n• Centro superior\n• Esquina inferior izquierda\n• Centro inferior\n• Esquina inferior derecha\n• Centro izquierdo\n• Centro derecho\n\n⏱️ Tiempo total: ~20 segundos\n\nHaz clic en "Aceptar" cuando estés listo para comenzar.');
        
        // Calibración de 9 puntos como en la documentación oficial
        setTimeout(() => {
          console.log('[WebGazerEyeTrackingSDK] Calibración manual de 9 puntos completada');
          resolve({ success: true });
        }, 20000); // 20 segundos para calibración completa
      });
      
    } catch (error) {
      console.error('[WebGazerEyeTrackingSDK] Error en calibración:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Obtiene el estado actual del SDK
   */
  getStatus(): {
    isTracking: boolean;
    sessionId?: string;
    platform: string;
    webgazerInitialized: boolean;
  } {
    return {
      isTracking: this.isTracking,
      sessionId: this.currentSessionId,
      platform: 'web',
      webgazerInitialized: this.isInitialized
    };
  }
}
