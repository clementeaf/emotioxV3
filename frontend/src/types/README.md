# Tipos e Interfaces Compartidas

Este directorio contiene importaciones de todas las interfaces y tipos compartidos utilizados en el proyecto EmotioX.

## Archivo principal

El archivo principal `index.ts` re-exporta todas las interfaces, tipos y constantes desde el directorio `shared/interfaces/` para centralizar las importaciones en toda la aplicación frontend.

### Ventajas

- **Punto único de importación**: Importar interfaces desde un solo archivo en lugar de múltiples importaciones
- **Consistencia de tipos**: Asegurar que todos los componentes usen exactamente las mismas definiciones de tipos
- **Facilidad de mantenimiento**: Si cambia la ubicación de las interfaces, solo hay que actualizar este archivo
- **Mejor organización**: Tener todas las interfaces categorizadas y documentadas en un solo lugar

## Uso

```typescript
// Importar tipos
import { 
  ResearchRecord,
  WelcomeScreenFormData,
  EyeTrackingConfig 
} from 'src/types';

// Importar valores por defecto
import { 
  DEFAULT_WELCOME_SCREEN_CONFIG,
  DEFAULT_EYE_TRACKING_CONFIG 
} from 'src/types';

// Importar enums y tipos literales
import { 
  ResearchStatus,
  TrackingDeviceType,
  PresentationSequenceType
} from 'src/types';
```

## Categorías de tipos

Los tipos están organizados por módulos:

### Investigación
- `ResearchRecord`, `ResearchFormData`, `ResearchConfig` - Datos de investigación
- `ResearchType`, `ResearchStatus`, `ResearchStage` - Enumeraciones

### Nueva Investigación
- `NewResearch` - Estructura para creación de investigaciones
- `DEFAULT_NEW_RESEARCH`, `FORM_STEPS` - Constantes y valores predeterminados

### Pantalla de Bienvenida
- `WelcomeScreenConfig`, `WelcomeScreenRecord`, `WelcomeScreenFormData`
- `DEFAULT_WELCOME_SCREEN_CONFIG` - Configuración predeterminada

### SmartVOC
- `SmartVOCFormData`, `SmartVOCQuestion` - Datos de formularios de preguntas
- `QuestionConfig`, `CSATConfig`, `NPSConfig` - Configuraciones de tipos de preguntas

### Eye Tracking
- `EyeTrackingConfig`, `EyeTrackingFormData`, `EyeTrackingModel`
- `TrackingDeviceType`, `PresentationSequenceType` - Tipos literales
- `DEFAULT_EYE_TRACKING_CONFIG` - Configuración predeterminada

### Pantalla de Agradecimiento
- `ThankYouScreenConfig`, `ThankYouScreenModel`, `ThankYouScreenFormData`
- `DEFAULT_THANK_YOU_SCREEN_CONFIG` - Configuración predeterminada

## Problemas comunes y soluciones

### Tipos literales vs Interfaces

Al exportar tipos desde archivos externos, hay que prestar atención a cómo se exportan los tipos literales como `TrackingDeviceType` y `PresentationSequenceType`. Estos deben exportarse con la palabra clave `type` dentro de un bloque `export {}` para mantener la información completa del tipo:

```typescript
// Correcto
export {
  DEFAULT_EYE_TRACKING_CONFIG,
  type TrackingDeviceType,
  type PresentationSequenceType 
} from '../../../shared/interfaces/eye-tracking.interface';

// Incorrecto - puede perder información del tipo
export type {
  TrackingDeviceType,
  PresentationSequenceType
} from '../../../shared/interfaces/eye-tracking.interface';
```

### Importaciones en servicios

Los servicios deben importar interfaces desde este archivo central de tipos, no directamente desde `shared/interfaces`:

```typescript
// Correcto
import { EyeTrackingFormData } from '../types';

// Incorrecto
import { EyeTrackingFormData } from '../../../shared/interfaces/eye-tracking.interface';
```

## Actualización

Cuando se añadan nuevas interfaces o tipos al proyecto, se debe actualizar este archivo para mantener la consistencia en todo el frontend. 