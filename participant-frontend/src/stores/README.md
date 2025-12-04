# Store de Participante

Store unificado simple y limpio para manejar respuestas y navegación.

## Características

- ✅ **Tipado estricto**: Todos los tipos están definidos explícitamente
- ✅ **Persistencia automática**: Guarda el último step y las respuestas en localStorage
- ✅ **Actualización de respuestas**: Si el usuario vuelve a un step, carga la respuesta previa
- ✅ **Código limpio**: Métodos claros y precisos
- ✅ **Escalable**: Preparado para condiciones desde research-frontend

## Uso Básico

### Navegación

```typescript
import { useParticipantStore } from './stores/useParticipantStore';

function MyComponent() {
  const { currentStep, setCurrentStep } = useParticipantStore();
  
  // Cambiar de step
  setCurrentStep('csat');
}
```

### Respuestas - Método 1: Hook helper (Recomendado)

```typescript
import { useResponse } from './hooks/useResponse';

function MyComponent() {
  const { value, save, exists } = useResponse({
    moduleId: 'csat-module',
    componentId: 'csat-scale'
  });
  
  // Guardar respuesta
  save(5);
  
  // Verificar si existe respuesta previa
  if (exists) {
    console.log('Respuesta previa:', value);
  }
}
```

### Respuestas - Método 2: Store directo

```typescript
import { useParticipantStore } from './stores/useParticipantStore';

function MyComponent() {
  const { saveResponse, getResponse, getResponsesByModule } = useParticipantStore();
  
  // Guardar respuesta
  saveResponse('csat-module', 'csat-scale', 5);
  
  // Obtener respuesta específica
  const response = getResponse('csat-module', 'csat-scale');
  
  // Obtener todas las respuestas de un módulo
  const moduleResponses = getResponsesByModule('csat-module');
}
```

## Estructura de Datos

### Response

```typescript
interface Response {
  id: string;              // "moduleId-componentId"
  moduleId: string;        // ID del módulo
  componentId: string;     // ID del componente
  value: ResponseValue;    // Valor de la respuesta
  metadata?: {             // Metadata opcional
    timestamp?: number;
    [key: string]: unknown;
  };
}
```

### ResponseValue

Puede ser: `string | number | boolean | string[] | number[] | null`

## Persistencia

El store persiste automáticamente en `localStorage` con la clave `participant-store`:

- `currentStep`: Último step visitado
- `responses`: Todas las respuestas guardadas

Al recargar la página, se restauran automáticamente.

## Métodos Disponibles

### Navegación
- `setCurrentStep(step: string)`: Establece el step actual

### Respuestas
- `saveResponse(moduleId, componentId, value, metadata?)`: Guarda o actualiza una respuesta
- `getResponse(moduleId, componentId)`: Obtiene una respuesta específica
- `getResponsesByModule(moduleId)`: Obtiene todas las respuestas de un módulo
- `updateResponse(moduleId, componentId, value, metadata?)`: Actualiza una respuesta (alias de saveResponse)
- `clearResponse(moduleId, componentId)`: Elimina una respuesta específica
- `clearAllResponses()`: Elimina todas las respuestas

