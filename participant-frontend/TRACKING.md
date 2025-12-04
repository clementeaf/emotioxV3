# Sistema de Tracking de Usuario

Sistema minimalista pero completo para conocer el estado del usuario en `participant-frontend`.

## 🎯 Características

### 1. **Información del Dispositivo**
- Tipo de dispositivo (mobile, tablet, desktop)
- Navegador y sistema operativo
- Resolución de pantalla y viewport
- Idioma del navegador

### 2. **Tracking de Ubicación**
- GPS con consentimiento explícito del usuario
- Fallback a IP si GPS no está disponible
- Registro de permisos denegados
- Precisión y timestamp de captura

### 3. **Métricas de Sesión**
- Tiempo total de sesión
- Tiempo de foco activo (usuario interactuando)
- Tiempo idle (sin actividad)
- Número de cambios de paso
- Contador de interacciones

### 4. **Tracking de Interacciones** (Opcional)
- Clicks del usuario
- Inputs en formularios
- Cambios de paso (navegación)
- Eventos de foco/blur

## 🚀 Uso

### Configuración Básica

```typescript
import { useSessionStore } from './stores/useSessionStore';

// Configurar la sesión
const { setConfig } = useSessionStore();

setConfig({
  id: 'research-123',
  settings: {
    enableDeviceCapture: true,        // Capturar info del dispositivo
    enableLocationCapture: true,       // Solicitar ubicación GPS
    enableSessionRecording: true,      // Trackear tiempo de sesión
    enableInteractionTracking: true,   // Trackear interacciones (opcional)
  },
});
```

### Hooks Automáticos

```typescript
import { 
  useDeviceCollector,
  useLocationCollector,
  useSessionTimer 
} from './hooks';

function App() {
  // Se inicializan automáticamente
  useDeviceCollector();    // Captura info del dispositivo
  useLocationCollector();  // Solicita ubicación (si está habilitado)
  useSessionTimer();       // Comienza a trackear tiempo

  return <YourApp />;
}
```

### Tracking Manual de Interacciones

```typescript
import { useInteractionTracker } from './hooks';

function MyComponent() {
  const { trackClick, trackInput, trackStepChange } = useInteractionTracker();

  const handleClick = () => {
    trackClick('button-submit', { 
      moduleId: 'nps',
      value: 8 
    });
  };

  const handleInput = (value: string) => {
    trackInput('text-field', { 
      length: value.length 
    });
  };

  return <YourComponent />;
}
```

### Obtener Resumen de Sesión

```typescript
import { useSessionStore } from './stores/useSessionStore';

function DebugPanel() {
  const { getSessionSummary } = useSessionStore();
  const summary = getSessionSummary();

  console.log('Device:', summary.device);
  console.log('Location:', summary.location);
  console.log('Metrics:', summary.metrics);
  console.log('Total interactions:', summary.interactionCount);
}
```

## 📊 Estructura de Datos

### DeviceInfo
```typescript
{
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;  // e.g., "1920x1080"
  viewportSize: string;       // e.g., "1440x900"
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browserName: 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Opera';
  osName: 'Windows' | 'macOS' | 'Linux' | 'Android' | 'iOS';
}
```

### LocationInfo
```typescript
{
  latitude: number;
  longitude: number;
  accuracy: number;         // metros de precisión
  timestamp: number;        // Unix timestamp
  source: 'gps' | 'ip' | 'denied';
}
```

### SessionMetrics
```typescript
{
  startTime: number;         // Unix timestamp
  endTime: number | null;    // Unix timestamp o null si sesión activa
  duration: number;          // milisegundos
  stepChanges: number;       // cantidad de cambios de paso
  interactionCount: number;  // cantidad de interacciones
  focusTime: number;         // tiempo con foco (ms)
  idleTime: number;          // tiempo idle (ms)
}
```

### UserInteraction
```typescript
{
  type: 'click' | 'input' | 'focus' | 'blur' | 'step_change';
  target: string;            // identificador del objetivo
  timestamp: number;         // Unix timestamp
  metadata?: {               // datos adicionales opcionales
    [key: string]: unknown;
  };
}
```

## 🔧 Configuración Avanzada

### Personalizar Timeout de Idle

```typescript
// En useSessionTimer.ts
const IDLE_TIMEOUT = 30000; // 30 segundos por defecto
```

### Limitar Almacenamiento de Interacciones

```typescript
// En useSessionStore.ts
const updatedInteractions = [...interactions, newInteraction].slice(-100);
// Mantiene solo las últimas 100 interacciones
```

## 📈 Visualización en DevSidebar

El `DevSidebar` muestra automáticamente las métricas en tiempo real:

- Device type y navegador
- Duración de la sesión
- Tiempo de foco activo
- Número de interacciones
- Número de cambios de paso

## 🎨 Diferencias con public-tests

### Ventajas de participant-frontend:
- ✅ **Más limpio**: Código modular y organizado
- ✅ **Más simple**: Sin complejidad innecesaria
- ✅ **Mejor tipado**: TypeScript estricto en todas las interfaces
- ✅ **Más eficiente**: Hooks optimizados con callbacks
- ✅ **No intrusivo**: El tracking es opcional y configurable

### Características únicas:
- Tracking de tiempo de foco vs idle
- Métricas en tiempo real en DevSidebar
- Sistema de interacciones extensible
- Mejor separación de responsabilidades

## 🔐 Privacidad

- La ubicación GPS **requiere consentimiento explícito**
- Todas las métricas se almacenan solo en memoria
- No se envían datos automáticamente (debes implementar el envío)
- El usuario puede denegar permisos en cualquier momento

## 📝 TODO

- [ ] Implementar envío de métricas al backend
- [ ] Agregar persistencia opcional en localStorage
- [ ] Crear hook para exportar datos de sesión
- [ ] Implementar modal de consentimiento de ubicación
- [ ] Agregar tracking de errores/excepciones
