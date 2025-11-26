# Módulos Smart VOC - Documentación Completa

## Resumen

En la configuración de Smart VOC del frontend existen **6 módulos disponibles** para crear preguntas de Voice of Customer.

---

## Módulos Disponibles

### 1. CSAT (Customer Satisfaction Score)

**ID:** `smartvoc_csat`  
**Descripción:** Customer Satisfaction - Satisfacción del cliente

#### Componentes de Configuración:
- **FormInput**: Título de la pregunta (requerido)
- **FormTextarea**: Descripción (opcional)
- **FormTextarea**: Instrucciones (opcional)
- **CustomSelect**: Tipo de visualización
  - Opciones: `'stars'` (Estrellas) | `'numbers'` (Números)

#### Configuración por Defecto:
```typescript
{
  type: 'stars'
}
```

#### Estructura de Config:
```typescript
{
  type: 'stars' | 'numbers'
}
```

---

### 2. CES (Customer Effort Score)

**ID:** `smartvoc_ces`  
**Descripción:** Customer Effort Score - Esfuerzo del cliente

#### Componentes de Configuración:
- **FormInput**: Título (requerido)
- **FormTextarea**: Descripción (opcional)
- **FormTextarea**: Instrucciones (opcional)
- **CustomSelect**: Escala
  - Opciones: `'1-5'` | `'1-7'` | `'1-10'`
  - Convierte string a objeto: `{ start: number, end: number }`
- **FormInput**: Etiqueta inicial (opcional, ej: "Muy difícil")
- **FormInput**: Etiqueta final (opcional, ej: "Muy fácil")

#### Configuración por Defecto:
```typescript
{
  type: 'scale',
  scaleRange: { start: 1, end: 5 }
}
```

#### Estructura de Config:
```typescript
{
  type: 'scale',
  scaleRange: { start: number, end: number },
  startLabel?: string,
  endLabel?: string
}
```

---

### 3. CV (Customer Value)

**ID:** `smartvoc_cv`  
**Descripción:** Customer Value - Valor del cliente

#### Componentes de Configuración:
- **FormInput**: Título (requerido)
- **FormTextarea**: Descripción (opcional)
- **FormTextarea**: Instrucciones (opcional)
- **CustomSelect**: Escala
  - Opciones: `'1-5'` | `'1-7'` | `'1-10'`
- **FormInput**: Etiqueta inicial (opcional)
- **FormInput**: Etiqueta final (opcional)

#### Configuración por Defecto:
```typescript
{
  type: 'scale',
  scaleRange: { start: 1, end: 7 },
  startLabel: '',
  endLabel: ''
}
```

#### Estructura de Config:
```typescript
{
  type: 'scale',
  scaleRange: { start: number, end: number },
  startLabel?: string,
  endLabel?: string
}
```

---

### 4. NPS (Net Promoter Score)

**ID:** `smartvoc_nps`  
**Descripción:** Net Promoter Score - Puntuación de promotor neto

#### Componentes de Configuración:
- **FormInput**: Título (requerido)
- **FormTextarea**: Descripción (opcional)
- **FormTextarea**: Instrucciones (opcional)
- **CustomSelect**: Escala
  - Opciones: `'0-10'` (Estándar NPS) | `'1-10'`

#### Configuración por Defecto:
```typescript
{
  type: 'scale',
  scaleRange: { start: 0, end: 10 },
  startLabel: '',
  endLabel: ''
}
```

#### Estructura de Config:
```typescript
{
  type: 'scale',
  scaleRange: { start: number, end: number }
}
```

---

### 5. NEV (Net Emotional Value)

**ID:** `smartvoc_nev`  
**Descripción:** Net Emotional Value - Valor emocional neto

#### Componentes de Configuración:
- **FormInput**: Título (requerido)
- **FormTextarea**: Descripción (opcional)
- **FormTextarea**: Instrucciones (opcional)
- **Info adicional**: "Jerarquía de Valor Emocional"

#### Configuración por Defecto:
```typescript
{
  type: 'emojis'
}
```

#### Estructura de Config:
```typescript
{
  type: 'emojis',
  companyName?: string,
  emotions?: string[]
}
```

---

### 6. VOC (Voice of Customer)

**ID:** `smartvoc_voc`  
**Descripción:** Voice of Customer - Voz del cliente

#### Componentes de Configuración:
- **FormInput**: Título (requerido)
- **FormTextarea**: Descripción (opcional)
- **FormTextarea**: Instrucciones (opcional)
- **Tipo**: Texto abierto (maxLength: 500)

#### Configuración por Defecto:
```typescript
{
  type: 'text',
  maxLength: 500
}
```

#### Estructura de Config:
```typescript
{
  type: 'text',
  maxLength?: number
}
```

---

## Componentes UI Base

### FormInput
**Ubicación:** `frontend/src/components/common/FormInput.tsx`

**Props:**
- `label: string` - Etiqueta del campo
- `value: string` - Valor actual
- `onChange: (value: string) => void` - Handler de cambio
- `placeholder?: string` - Texto placeholder
- `disabled?: boolean` - Estado deshabilitado
- `error?: string` - Mensaje de error
- `className?: string` - Clases CSS adicionales
- `id?: string` - ID del elemento

**Uso:** Input de texto estándar con label y manejo de errores.

---

### FormTextarea
**Ubicación:** `frontend/src/components/common/FormTextarea.tsx`

**Props:**
- `label: string` - Etiqueta del campo
- `value: string` - Valor actual
- `onChange: (value: string) => void` - Handler de cambio
- `placeholder?: string` - Texto placeholder
- `rows?: number` - Número de filas (default: 4)
- `disabled?: boolean` - Estado deshabilitado
- `error?: string` - Mensaje de error
- `className?: string` - Clases CSS adicionales
- `id?: string` - ID del elemento

**Uso:** Textarea con label, redimensionable verticalmente.

---

### CustomSelect
**Ubicación:** `frontend/src/components/ui/CustomSelect.tsx`

**Props:**
- `value: string` - Valor seleccionado
- `onChange: (value: string) => void` - Handler de cambio
- `options: Option[]` - Array de opciones
  ```typescript
  interface Option {
    value: string;
    label: string;
    disabled?: boolean;
  }
  ```
- `placeholder?: string` - Texto placeholder (default: "Select an option")
- `disabled?: boolean` - Estado deshabilitado
- `error?: boolean` - Estado de error
- `className?: string` - Clases CSS adicionales
- `id?: string` - ID del elemento

**Características:**
- Dropdown personalizado con animaciones
- Soporte para navegación con teclado (ArrowUp, ArrowDown, Enter, Escape)
- Cierre automático al hacer click fuera
- Manejo especial para `scaleRange`: convierte entre string `"1-5"` y objeto `{ start: 1, end: 5 }`

**Uso:** Selector dropdown con opciones personalizadas.

---

### DynamicFieldRenderer
**Ubicación:** `frontend/src/components/research/SmartVOC/components/DynamicFieldRenderer.tsx`

**Props:**
- `field: FieldConfig` - Configuración del campo
- `value: any` - Valor actual
- `onChange: (value: any) => void` - Handler de cambio
- `disabled?: boolean` - Estado deshabilitado

**Componentes Soportados:**
- `FormInput` - Input de texto
- `FormTextarea` - Textarea
- `FormSelect` - Select básico
- `CustomSelect` - Select personalizado (con manejo especial de scaleRange)
- `LabeledInput` - Input con label
- `ScaleSelector` - Selector de escala

**Uso:** Renderiza dinámicamente el componente apropiado según `field.component`.

---

## Flujo de Datos

### 1. Configuración
Los módulos se definen en `frontend/src/components/research/SmartVOC/config.ts`:
```typescript
export const QUESTION_TYPE_CONFIGS: Record<string, QuestionTypeConfig>
```

Cada configuración incluye:
- `id`: Identificador del módulo
- `name`: Nombre para mostrar
- `description`: Descripción del módulo
- `fields`: Array de campos configurables
- `previewType`: Tipo para la vista previa
- `info`: Información adicional (opcional)

### 2. Renderizado
`DynamicFieldRenderer` renderiza cada campo según su `component`:
- Lee `field.component` para determinar qué componente usar
- Maneja conversiones especiales (ej: `scaleRange` string ↔ objeto)
- Pasa props comunes a todos los componentes

### 3. Manejo de Cambios
`createFieldChangeHandler` (en `utils.ts`) maneja campos anidados:
- Soporta notación de punto: `config.scaleRange`
- Crea estructura anidada automáticamente
- Actualiza el objeto de pregunta completo

### 4. Vista Previa
`QuestionPreview` muestra una vista previa no interactiva:
- Renderiza según `previewType`
- Muestra estrellas, números, escalas, etc.
- Solo para visualización, no editable

---

## Archivos Clave

### Configuración
- `frontend/src/components/research/SmartVOC/config.ts` - Configuraciones de módulos
- `frontend/src/components/research/SmartVOC/templates.ts` - Plantillas por defecto
- `frontend/src/components/research/SmartVOC/constants.ts` - Constantes y textos UI

### Componentes
- `frontend/src/components/research/SmartVOC/components/DynamicFieldRenderer.tsx` - Renderizador dinámico
- `frontend/src/components/research/SmartVOC/components/SmartVOCQuestions.tsx` - Lista de preguntas
- `frontend/src/components/research/SmartVOC/components/AddQuestionModal.tsx` - Modal para agregar preguntas

### Utilidades
- `frontend/src/components/research/SmartVOC/utils.ts` - Funciones helper
- `frontend/src/components/research/SmartVOC/hooks/useSmartVOCForm.ts` - Hook principal

### Interfaces
- `frontend/src/shared/interfaces/smart-voc.interface.ts` - Tipos TypeScript
- `frontend/src/shared/interfaces/question-types.enum.ts` - Enum de tipos

### Componentes UI Base
- `frontend/src/components/common/FormInput.tsx`
- `frontend/src/components/common/FormTextarea.tsx`
- `frontend/src/components/ui/CustomSelect.tsx`
- `frontend/src/components/common/QuestionPreview.tsx`

---

## Estructura de Datos

### SmartVOCQuestion
```typescript
interface SmartVOCQuestion {
  id: string;
  type: QuestionType; // smartvoc_csat, smartvoc_ces, etc.
  title: string;
  description: string;
  instructions?: string;
  required?: boolean;
  showConditionally: boolean;
  config: QuestionConfig; // Específico por tipo
  moduleResponseId?: string;
  questionKey?: string;
}
```

### QuestionConfig (por tipo)

**CSAT:**
```typescript
{
  type: 'stars' | 'numbers' | 'emojis';
  companyName?: string;
}
```

**CES/CV/NPS:**
```typescript
{
  type: 'scale';
  scaleRange: { start: number, end: number };
  startLabel?: string;
  endLabel?: string;
}
```

**NEV:**
```typescript
{
  type: 'emojis';
  companyName?: string;
  emotions?: string[];
}
```

**VOC:**
```typescript
{
  type: 'text';
  maxLength?: number;
}
```

---

## Notas Importantes

1. **Conversión de scaleRange**: El `CustomSelect` maneja automáticamente la conversión entre string (`"1-5"`) y objeto (`{ start: 1, end: 5 }`).

2. **Campos Anidados**: Los campos con notación de punto (ej: `config.scaleRange`) se manejan automáticamente por `createFieldChangeHandler`.

3. **Vista Previa**: `QuestionPreview` solo muestra una vista estática, no es interactiva para los participantes.

4. **Validación**: Los campos `required: true` deben validarse antes de guardar.

5. **Templates**: Cada módulo tiene un template por defecto en `templates.ts` que se usa al crear nuevas preguntas.

---

## Ejemplo de Uso

```typescript
// Crear una pregunta CSAT
const csatQuestion: SmartVOCQuestion = {
  id: 'csat_1',
  type: QuestionType.SMARTVOC_CSAT,
  title: '¿Qué tan satisfecho estás con nuestro servicio?',
  description: 'Evalúa tu nivel de satisfacción',
  instructions: 'Selecciona una opción',
  required: true,
  showConditionally: false,
  config: {
    type: 'stars'
  }
};
```

---

## Estado Actual

✅ **Completado:**
- Configuración de módulos
- Componentes de edición para investigadores
- Vista previa de preguntas
- Manejo de datos y validación

⚠️ **Pendiente de Verificar:**
- Renderizado interactivo para participantes (estrellas clickeables, escalas interactivas)
- Componentes de respuesta donde los participantes responden las preguntas

---

**Última actualización:** 2025-01-27

