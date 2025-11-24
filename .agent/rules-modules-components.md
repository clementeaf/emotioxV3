# Reglas de Desarrollo - Módulos y Componentes

## Principios Fundamentales

### 1. Separación de Responsabilidades
- **Module Management (ModuleBuilderPage)**: Configura la ESTRUCTURA de los componentes (tipos, labels, configuraciones)
- **Research Builder (ResearchBuilderPage)**: Edita los VALORES de esos componentes en el contexto de un research específico
- **NUNCA** mezclar estas responsabilidades

### 2. Flujo de Datos de Módulos
1. Los módulos pueden venir de templates (`is_from_template: true`)
2. Si vienen de template, cargar estructura desde `moduleTemplatesService.list()` buscando por nombre
3. La estructura se almacena en `template.structure.components` (array de ComponentConfig)
4. En Research Builder, mostrar campos de entrada REALES, no configuración

## Estructura de ComponentConfig

### Tipos Válidos
```typescript
type ComponentType = 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file-upload';
```

### Estructura Requerida
```typescript
interface ComponentConfig {
    id: string;                    // REQUERIDO: UUID único
    type: ComponentType;           // REQUERIDO: Uno de los tipos válidos
    label: string;                 // REQUERIDO: Etiqueta visible del campo
    
    // Configuraciones opcionales por tipo
    placeholder?: PlaceholderConfig;    // Para input/textarea
    selectRange?: SelectRangeConfig;    // Para select
    fileUpload?: FileUploadConfig;      // Para file-upload
    options?: { label: string; value: string }[];  // Para radio/select
    editableFields?: string[];          // Campos editables
    hidden?: boolean;                   // Ocultar componente
}
```

### PlaceholderConfig
```typescript
// ✅ CORRECTO
placeholder: {
    enabled: true,
    text: "Enter your name"
}

// ❌ INCORRECTO
placeholder: "Enter your name"
```

### SelectRangeConfig
```typescript
// Predefined
selectRange: {
    type: 'predefined',
    predefined: '1-5'  // '1-5' | '1-7' | '1-10'
}

// Custom
selectRange: {
    type: 'custom',
    custom: { min: 2, max: 5 },
    startLabel: "Poor",
    endLabel: "Excellent",
    variant: 'scale'  // 'dropdown' | 'scale'
}
```

## Carga de Componentes en Research Builder

### Orden de Prioridad
1. **Primero**: `module.config.structure.components` (si existe y tiene elementos)
2. **Segundo**: Convertir `module.questions` a ComponentConfig
3. **Tercero**: Si `is_from_template: true`, cargar desde template por nombre

### Implementación Requerida
```typescript
// 1. Verificar config.structure.components
if (module.config?.structure?.components?.length > 0) {
    return module.config.structure.components;
}

// 2. Convertir questions
if (module.questions?.length > 0) {
    return module.questions.map(q => ({
        id: q.id,
        type: q.type as ComponentType,
        label: q.text,
        ...q.config
    }));
}

// 3. Cargar desde template
if (module.is_from_template) {
    const templates = await moduleTemplatesService.list();
    const template = templates.find(t => t.name === module.name && t.is_active);
    if (template?.structure?.components) {
        return template.structure.components;
    }
}
```

## Renderizado de Componentes

### En Module Builder (Configuración)
- **MOSTRAR**: Configuración de componentes (Label/Question, Component Type, Component Settings)
- **USAR**: `ComponentConfigPanel` para configuraciones específicas por tipo
- **PERMITIR**: Agregar, editar, eliminar componentes

### En Research Builder (Edición de Valores)
- **MOSTRAR**: Campos de entrada REALES (Input, Textarea, CustomSelect, etc.)
- **NO MOSTRAR**: Configuración de componentes (Label/Question, Component Type, Component Settings)
- **MANEJAR**: Valores en `componentValues: Record<string, string>`
- **INICIALIZAR**: Desde `defaultValue` del componente o valor guardado

### Patrón de Renderizado en Research Builder
```typescript
// Para cada componente, renderizar el campo de entrada real
{component.type === 'input' && (
    <Input
        id={`module-${component.id}`}
        label={component.label}
        value={componentValues[component.id] || ''}
        onChange={(e) => setComponentValues({...componentValues, [component.id]: e.target.value})}
        placeholder={component.placeholder?.enabled ? component.placeholder.text : undefined}
    />
)}

{component.type === 'textarea' && (
    <Textarea
        id={`module-${component.id}`}
        label={component.label}
        value={componentValues[component.id] || ''}
        onChange={(e) => setComponentValues({...componentValues, [component.id]: e.target.value})}
        placeholder={component.placeholder?.enabled ? component.placeholder.text : undefined}
        rows={4}
    />
)}
```

## Inicialización de Valores

### En Research Builder
```typescript
// Inicializar valores desde defaultValue o valores guardados
const initialValues: Record<string, string> = {};
components.forEach((comp) => {
    const defaultValue = (comp as unknown as { defaultValue?: string }).defaultValue || '';
    initialValues[comp.id] = defaultValue;
});
setComponentValues(initialValues);
```

## Guardado de Valores

### Estructura de Datos
- Los valores editados se almacenan en `componentValues: Record<string, string>`
- Al guardar, convertir a la estructura apropiada para el backend
- Guardar en `module.config` o crear/actualizar `questions` según corresponda

## Templates de Módulos Conocidos

### Welcome Screen
```typescript
structure: {
    components: [
        {
            id: "title",
            type: "input",
            label: "Title",
            placeholder: { enabled: true, text: "Title of the screen" },
            defaultValue: ""
        },
        {
            id: "message",
            type: "textarea",
            label: "Message",
            placeholder: { enabled: true, text: "Message for the screen" },
            defaultValue: ""
        },
        {
            id: "start_button_text",
            type: "input",
            label: "Start button text",
            placeholder: { enabled: true, text: "Name the button to start the test" },
            defaultValue: ""
        }
    ]
}
```

## Reglas de Implementación

### Al Crear un Nuevo Módulo Template
1. Definir estructura completa con todos los componentes
2. Cada componente debe tener `id`, `type`, `label` como mínimo
3. Agregar configuraciones específicas según el tipo
4. Incluir `defaultValue` si aplica

### Al Editar un Módulo en Research Builder
1. Cargar componentes siguiendo el orden de prioridad
2. Inicializar valores desde `defaultValue` o valores guardados
3. Mostrar campos de entrada reales, NO configuración
4. Manejar cambios en `componentValues`
5. Al guardar, persistir valores en la estructura apropiada

### Al Renderizar Componentes
- **Module Builder**: Usar `ComponentConfigPanel` para configuraciones
- **Research Builder**: Usar componentes UI directos (Input, Textarea, CustomSelect, etc.)
- **Preview**: Usar `PreviewComponent` para vistas previas

## Validaciones

### ComponentConfig
- `id` debe ser único (usar `crypto.randomUUID()` para nuevos)
- `type` debe ser uno de los tipos válidos
- `label` no puede estar vacío
- `placeholder` debe ser objeto con `enabled` y `text`, nunca string
- `selectRange` debe tener `type` y la configuración correspondiente

### Valores de Componentes
- Todos los valores se manejan como `string` en `componentValues`
- Para checkboxes, usar `'true'` o `'false'` como string
- Validar tipos antes de renderizar campos

## Imports Requeridos

### Para Module Builder
```typescript
import { ComponentConfigPanel } from '../../components/modules/ComponentConfigPanel';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
```

### Para Research Builder
```typescript
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { CustomSelect } from '../../components/ui/CustomSelect';
import type { ComponentConfig } from '../../types/moduleBuilder.types';
import { moduleTemplatesService } from '../../services/moduleTemplates.service';
```

## Checklist de Implementación

Al trabajar con módulos y componentes, verificar:

- [ ] ¿Se está usando el tipo correcto de ComponentConfig?
- [ ] ¿Los placeholders están en formato objeto?
- [ ] ¿En Research Builder se muestran campos de entrada reales?
- [ ] ¿En Module Builder se muestra configuración de componentes?
- [ ] ¿Se sigue el orden de prioridad al cargar componentes?
- [ ] ¿Los valores se inicializan correctamente desde defaultValue?
- [ ] ¿Los valores se manejan en componentValues como Record<string, string>?
- [ ] ¿Se usa el servicio correcto (moduleTemplatesService) para cargar templates?

