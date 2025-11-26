# Módulos Cognitive Tasks - Documentación Completa

## Resumen

En la configuración de Cognitive Tasks del frontend existen **8 tipos de preguntas** disponibles para crear tareas cognitivas y evaluaciones.

---

## Tipos de Preguntas Disponibles

### 1. Short Text (Texto Corto)

**ID:** `cognitive_short_text` / `short_text`  
**Descripción:** Respuestas cortas de texto

#### Componentes de Configuración:
- **FormField (text)**: Título de la pregunta (requerido)
- **FormField (textarea)**: Descripción (opcional)
- **FormField (text)**: Placeholder de respuesta (opcional)

#### Configuración por Defecto:
```typescript
{
  type: 'short_text',
  title: '',
  description: '',
  answerPlaceholder: 'Short text answer',
  required: true,
  showConditionally: false,
  deviceFrame: false
}
```

#### Estructura de Datos:
```typescript
{
  id: string;
  type: 'short_text';
  title: string;
  description?: string;
  answerPlaceholder?: string;
  required: boolean;
  showConditionally: boolean;
  deviceFrame: boolean;
}
```

---

### 2. Long Text (Texto Largo)

**ID:** `cognitive_long_text` / `long_text`  
**Descripción:** Respuestas largas de texto

#### Componentes de Configuración:
- **FormField (text)**: Título de la pregunta (requerido)
- **FormField (textarea)**: Descripción (opcional)
- **FormField (text)**: Placeholder de respuesta (opcional)

#### Configuración por Defecto:
```typescript
{
  type: 'long_text',
  title: '',
  description: '',
  answerPlaceholder: 'Long text answer',
  required: true,
  showConditionally: false,
  deviceFrame: false
}
```

#### Estructura de Datos:
```typescript
{
  id: string;
  type: 'long_text';
  title: string;
  description?: string;
  answerPlaceholder?: string;
  required: boolean;
  showConditionally: boolean;
  deviceFrame: boolean;
}
```

---

### 3. Single Choice (Opción Única)

**ID:** `cognitive_single_choice` / `single_choice`  
**Descripción:** Seleccionar una opción

#### Componentes de Configuración:
- **FormField (text)**: Título de la pregunta (requerido)
- **FormField (textarea)**: Descripción (opcional)
- **Opciones dinámicas**:
  - **FormField (text)**: Texto de cada opción
  - **Button**: Eliminar opción (si hay más de 1)
- **Button**: Añadir opción

#### Configuración por Defecto:
```typescript
{
  type: 'single_choice',
  title: '',
  required: true,
  showConditionally: false,
  deviceFrame: false,
  choices: [
    { id: '1', text: '', isQualify: false, isDisqualify: false },
    { id: '2', text: '', isQualify: false, isDisqualify: false },
    { id: '3', text: '', isQualify: false, isDisqualify: false }
  ]
}
```

#### Estructura de Datos:
```typescript
{
  id: string;
  type: 'single_choice';
  title: string;
  description?: string;
  required: boolean;
  showConditionally: boolean;
  deviceFrame: boolean;
  choices: Array<{
    id: string;
    text: string;
    isQualify?: boolean;
    isDisqualify?: boolean;
  }>;
}
```

---

### 4. Multiple Choice (Opción Múltiple)

**ID:** `cognitive_multiple_choice` / `multiple_choice`  
**Descripción:** Seleccionar múltiples opciones

#### Componentes de Configuración:
- **FormField (text)**: Título de la pregunta (requerido)
- **FormField (textarea)**: Descripción (opcional)
- **Opciones dinámicas**:
  - **FormField (text)**: Texto de cada opción
  - **Button**: Eliminar opción (si hay más de 1)
- **Button**: Añadir opción

#### Configuración por Defecto:
```typescript
{
  type: 'multiple_choice',
  title: '',
  required: true,
  showConditionally: false,
  deviceFrame: false,
  choices: [
    { id: '1', text: '', isQualify: false, isDisqualify: false },
    { id: '2', text: '', isQualify: false, isDisqualify: false },
    { id: '3', text: '', isQualify: false, isDisqualify: false }
  ]
}
```

#### Estructura de Datos:
```typescript
{
  id: string;
  type: 'multiple_choice';
  title: string;
  description?: string;
  required: boolean;
  showConditionally: boolean;
  deviceFrame: boolean;
  choices: Array<{
    id: string;
    text: string;
    isQualify?: boolean;
    isDisqualify?: boolean;
  }>;
}
```

---

### 5. Linear Scale (Escala Lineal)

**ID:** `cognitive_linear_scale` / `linear_scale`  
**Descripción:** Escala numérica

#### Componentes de Configuración:
- **FormField (text)**: Título de la pregunta (requerido)
- **FormField (textarea)**: Descripción (opcional)
- **FormField (number)**: Valor inicial (requerido, min: 0, max: 100)
- **FormField (number)**: Valor final (requerido, min: 0, max: 100)
- **FormField (text)**: Etiqueta valor inicial (opcional)
- **FormField (text)**: Etiqueta valor final (opcional)

#### Configuración por Defecto:
```typescript
{
  type: 'linear_scale',
  title: '',
  required: true,
  showConditionally: false,
  deviceFrame: false,
  scaleConfig: {
    startValue: 1,
    endValue: 5
  }
}
```

#### Estructura de Datos:
```typescript
{
  id: string;
  type: 'linear_scale';
  title: string;
  description?: string;
  required: boolean;
  showConditionally: boolean;
  deviceFrame: boolean;
  scaleConfig: {
    startValue: number;
    endValue: number;
    startLabel?: string;
    endLabel?: string;
  };
}
```

---

### 6. Ranking (Clasificación)

**ID:** `cognitive_ranking` / `ranking`  
**Descripción:** Ordenar opciones por preferencia

#### Componentes de Configuración:
- **FormField (text)**: Título de la pregunta (requerido)
- **FormField (textarea)**: Descripción (opcional)
- **Opciones dinámicas**:
  - **FormField (text)**: Texto de cada opción
  - **Button**: Eliminar opción (si hay más de 1)
- **Button**: Añadir opción

#### Configuración por Defecto:
```typescript
{
  type: 'ranking',
  title: '',
  required: true,
  showConditionally: false,
  deviceFrame: false,
  choices: [
    { id: '1', text: '', isQualify: false, isDisqualify: false },
    { id: '2', text: '', isQualify: false, isDisqualify: false },
    { id: '3', text: '', isQualify: false, isDisqualify: false }
  ]
}
```

#### Estructura de Datos:
```typescript
{
  id: string;
  type: 'ranking';
  title: string;
  description?: string;
  required: boolean;
  showConditionally: boolean;
  deviceFrame: boolean;
  choices: Array<{
    id: string;
    text: string;
    isQualify?: boolean;
    isDisqualify?: boolean;
  }>;
}
```

**Nota:** Usa el mismo componente `ChoiceQuestion` que Single Choice y Multiple Choice.

---

### 7. Navigation Flow (Flujo de Navegación)

**ID:** `cognitive_navigation_flow` / `navigation_flow`  
**Descripción:** Prueba de flujo de navegación

#### Componentes de Configuración:
- **FormField (text)**: Título de la pregunta (requerido)
- **FormField (textarea)**: Descripción (opcional)
- **FileUploader**: Subir archivos (imágenes)
  - Soporta: JPG, PNG, GIF (Máx. 5MB)
  - Mínimo: 1 archivo recomendado
- **LocalHitzoneEditor**: Editor de áreas clickeables (hit zones)
- **Switch**: Marco de dispositivo (deviceFrame)

#### Configuración por Defecto:
```typescript
{
  type: 'navigation_flow',
  title: '',
  required: true,
  showConditionally: false,
  deviceFrame: false,
  files: []
}
```

#### Estructura de Datos:
```typescript
{
  id: string;
  type: 'navigation_flow';
  title: string;
  description?: string;
  required: boolean;
  showConditionally: boolean;
  deviceFrame: boolean;
  files: Array<UploadedFile>;
  hitZones?: Array<HitZone>;
}
```

**Características Especiales:**
- Permite subir imágenes para pruebas de navegación
- Editor de hit zones (áreas clickeables) en las imágenes
- Opción de mostrar con marco de dispositivo

---

### 8. Preference Test (Prueba de Preferencia)

**ID:** `cognitive_preference_test` / `preference_test`  
**Descripción:** Prueba A/B de preferencia

#### Componentes de Configuración:
- **FormField (text)**: Título de la pregunta (requerido)
- **FormField (textarea)**: Descripción (opcional)
- **FileUploader**: Subir archivos (imágenes)
  - Soporta: JPG, PNG, GIF (Máx. 5MB)
  - Mínimo: 2 archivos recomendados para test A/B
- **LocalHitzoneEditor**: Editor de áreas clickeables (hit zones)
- **Switch**: Marco de dispositivo (deviceFrame)

#### Configuración por Defecto:
```typescript
{
  type: 'preference_test',
  title: '',
  required: true,
  showConditionally: false,
  deviceFrame: false,
  files: []
}
```

#### Estructura de Datos:
```typescript
{
  id: string;
  type: 'preference_test';
  title: string;
  description?: string;
  required: boolean;
  showConditionally: boolean;
  deviceFrame: boolean;
  files: Array<UploadedFile>;
  hitZones?: Array<HitZone>;
}
```

**Características Especiales:**
- Permite subir múltiples imágenes para comparación A/B
- Editor de hit zones en las imágenes
- Opción de mostrar con marco de dispositivo

---

## Componentes UI Base

### FormField
**Ubicación:** `frontend/src/components/common/atomic/FormField.tsx`

**Props:**
- `type: 'text' | 'textarea' | 'number' | 'email' | 'toggle'` - Tipo de campo
- `label: string` - Etiqueta del campo
- `value: any` - Valor actual
- `onChange: (value: any) => void` - Handler de cambio
- `placeholder?: string` - Texto placeholder
- `disabled?: boolean` - Estado deshabilitado
- `error?: boolean` - Estado de error
- `errorMessage?: string` - Mensaje de error
- `config?: { min?: number; max?: number; step?: number; rows?: number }` - Configuración específica
- `className?: string` - Clases CSS adicionales

**Tipos Soportados:**
- `text` / `email`: Input de texto
- `textarea`: Textarea con rows configurables
- `number`: Input numérico con min/max/step
- `toggle`: Switch component

**Uso:** Componente atómico reutilizable para todos los campos de formulario.

---

### FormCard
**Ubicación:** `frontend/src/components/common/atomic/FormCard.tsx`

**Props:**
- `children: React.ReactNode` - Contenido
- `className?: string` - Clases CSS adicionales

**Uso:** Contenedor de tarjeta para agrupar campos relacionados.

---

### FormSection
**Ubicación:** `frontend/src/components/common/atomic/FormSection.tsx`

**Props:**
- `title: string` - Título de la sección
- `description?: string` - Descripción de la sección
- `children: React.ReactNode` - Contenido

**Uso:** Sección de formulario con título y descripción.

---

### FormRow
**Ubicación:** `frontend/src/components/common/atomic/FormRow.tsx`

**Props:**
- `children: React.ReactNode` - Contenido
- `justified?: boolean` - Justificar contenido

**Uso:** Fila horizontal para agrupar campos lado a lado.

---

### Button
**Ubicación:** `frontend/src/components/ui/Button.tsx`

**Variantes:**
- `outline` - Botón con borde
- `ghost` - Botón sin fondo
- `size: 'sm' | 'icon'` - Tamaños

**Uso:** Botones para acciones (añadir opción, eliminar, etc.).

---

### FileUploader
**Ubicación:** `frontend/src/components/research/CognitiveTask/components/FileUploader.tsx`

**Características:**
- Drag & drop de archivos
- Soporte para múltiples archivos
- Validación de tipos (JPG, PNG, GIF)
- Límite de tamaño (5MB)
- Preview de imágenes
- Integración con S3

**Uso:** Para subir archivos en Navigation Flow y Preference Test.

---

### LocalHitzoneEditor
**Ubicación:** `frontend/src/components/research/CognitiveTask/components/questions/LocalHitzoneEditor.tsx`

**Características:**
- Editor visual de áreas clickeables (hit zones)
- Dibujo de rectángulos sobre imágenes
- Edición y eliminación de hit zones
- Guardado de coordenadas (x, y, width, height)

**Uso:** Para definir áreas interactivas en imágenes de Navigation Flow y Preference Test.

---

## Componentes Específicos de Preguntas

### TextQuestion
**Ubicación:** `frontend/src/components/research/CognitiveTask/components/questions/TextQuestion.tsx`

**Renderiza:**
- FormField para título
- FormField para descripción
- FormField para placeholder
- Vista previa del input/textarea

**Usado por:** `short_text`, `long_text`

---

### ChoiceQuestion
**Ubicación:** `frontend/src/components/research/CognitiveTask/components/questions/ChoiceQuestion.tsx`

**Renderiza:**
- FormField para título
- FormField para descripción
- Lista dinámica de opciones (FormField + Button eliminar)
- Button para añadir opción
- Vista previa con radio/checkbox

**Usado por:** `single_choice`, `multiple_choice`, `ranking`

---

### ScaleQuestion
**Ubicación:** `frontend/src/components/research/CognitiveTask/components/questions/ScaleQuestion.tsx`

**Renderiza:**
- FormField para título
- FormField para descripción
- FormField (number) para valor inicial
- FormField (number) para valor final
- FormField para etiqueta inicial
- FormField para etiqueta final
- Vista previa de la escala

**Usado por:** `linear_scale`

---

### FileUploadQuestion
**Ubicación:** `frontend/src/components/research/CognitiveTask/components/questions/FileUploadQuestionOriginal.tsx`

**Renderiza:**
- FormField para título
- FormField para descripción
- FileUploader para subir archivos
- Preview de archivos subidos
- LocalHitzoneEditor para hit zones
- Switch para deviceFrame

**Usado por:** `navigation_flow`, `preference_test`

---

## Flujo de Datos

### 1. Configuración
Los tipos de preguntas se definen en:
- `frontend/src/components/research/CognitiveTask/constants.ts` - Templates y constantes
- `frontend/src/components/research/CognitiveTask/types.ts` - Tipos TypeScript

### 2. Renderizado
`QuestionCard` renderiza el componente apropiado según el tipo:
- Normaliza el tipo (elimina prefijo `cognitive_`)
- Mapea tipos a componentes:
  - `short_text` / `long_text` → `TextQuestion`
  - `single_choice` / `multiple_choice` / `ranking` → `ChoiceQuestion`
  - `linear_scale` → `ScaleQuestion`
  - `navigation_flow` / `preference_test` → `FileUploadQuestion`

### 3. Manejo de Cambios
Cada componente de pregunta maneja sus propios cambios:
- `onQuestionChange`: Actualiza campos de la pregunta
- `onAddChoice` / `onRemoveChoice`: Gestiona opciones dinámicas
- `onFileUpload` / `onFileDelete`: Gestiona archivos

### 4. Validación
Validación en `useCognitiveTaskForm`:
- Título requerido
- Al menos una opción para choice questions
- Valores de escala válidos
- Archivos requeridos para file upload questions

### 5. Vista Previa
Cada componente incluye una vista previa no interactiva que muestra cómo verán la pregunta los participantes.

---

## Archivos Clave

### Configuración
- `frontend/src/components/research/CognitiveTask/constants.ts` - Templates y constantes
- `frontend/src/components/research/CognitiveTask/types.ts` - Tipos TypeScript
- `frontend/src/components/research/CognitiveTask/components/AddQuestionModal.tsx` - Modal para agregar preguntas

### Componentes
- `frontend/src/components/research/CognitiveTask/components/QuestionCard.tsx` - Router de componentes
- `frontend/src/components/research/CognitiveTask/components/CognitiveTaskFields.tsx` - Lista de preguntas
- `frontend/src/components/research/CognitiveTask/components/questions/` - Componentes específicos

### Hooks
- `frontend/src/components/research/CognitiveTask/hooks/useCognitiveTaskForm.ts` - Lógica principal

### Componentes Atómicos
- `frontend/src/components/common/atomic/FormField.tsx`
- `frontend/src/components/common/atomic/FormCard.tsx`
- `frontend/src/components/common/atomic/FormSection.tsx`
- `frontend/src/components/common/atomic/FormRow.tsx`

### Componentes UI
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Input.tsx`
- `frontend/src/components/ui/Textarea.tsx`
- `frontend/src/components/ui/Switch.tsx`

---

## Estructura de Datos

### Question (Base)
```typescript
interface Question {
  id: string;
  type: string; // Tipo de pregunta
  title: string;
  description?: string;
  required: boolean;
  showConditionally: boolean;
  deviceFrame: boolean;
  answerPlaceholder?: string; // Para text questions
  choices?: Choice[]; // Para choice/ranking questions
  scaleConfig?: ScaleConfig; // Para scale questions
  files?: UploadedFile[]; // Para file upload questions
  hitZones?: HitZone[]; // Para navigation/preference questions
  questionKey?: string;
}
```

### Choice
```typescript
interface Choice {
  id: string;
  text: string;
  isQualify?: boolean;
  isDisqualify?: boolean;
}
```

### ScaleConfig
```typescript
interface ScaleConfig {
  startValue: number;
  endValue: number;
  startLabel?: string;
  endLabel?: string;
}
```

### UploadedFile
```typescript
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  s3Key?: string;
  isLoading?: boolean;
  progress?: number;
  error?: boolean;
  status?: 'uploading' | 'uploaded' | 'pending-delete' | 'error';
  questionId?: string;
  hitZones?: HitZone[];
}
```

### HitZone
```typescript
interface HitZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### CognitiveTaskFormData
```typescript
interface CognitiveTaskFormData {
  researchId: string;
  questions: Question[];
  randomizeQuestions: boolean;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    version?: string;
  };
}
```

---

## Configuración Global

### CognitiveTaskSettings
**Ubicación:** `frontend/src/components/research/CognitiveTask/components/CognitiveTaskSettings.tsx`

**Opciones:**
- **Switch**: Aleatorizar preguntas
  - Descripción: "Las preguntas se mostrarán en orden aleatorio para cada participante"

---

## Notas Importantes

1. **Normalización de Tipos**: Los tipos pueden venir con prefijo `cognitive_` o sin él. El sistema normaliza automáticamente.

2. **Opciones Dinámicas**: Las preguntas de tipo choice permiten añadir/eliminar opciones dinámicamente. Mínimo 1 opción requerida.

3. **Archivos**: Navigation Flow y Preference Test requieren subir archivos (imágenes). El sistema valida tipos y tamaños.

4. **Hit Zones**: Solo disponibles para Navigation Flow y Preference Test. Se editan visualmente sobre las imágenes.

5. **Device Frame**: Opción disponible para preguntas con archivos para mostrar con marco de dispositivo.

6. **Validación**: Cada tipo de pregunta tiene validaciones específicas que se ejecutan antes de guardar.

7. **Vista Previa**: Todos los componentes incluyen una vista previa no interactiva que muestra cómo verán la pregunta los participantes.

8. **Componentes Atómicos**: Se usa un sistema de componentes atómicos (`FormField`, `FormCard`, etc.) para evitar duplicación de código.

---

## Ejemplo de Uso

```typescript
// Crear una pregunta de texto corto
const shortTextQuestion: Question = {
  id: '3.1',
  type: 'short_text',
  title: '¿Cuál es tu nombre?',
  description: 'Por favor ingresa tu nombre completo',
  answerPlaceholder: 'Escribe tu nombre aquí...',
  required: true,
  showConditionally: false,
  deviceFrame: false
};

// Crear una pregunta de opción única
const singleChoiceQuestion: Question = {
  id: '3.3',
  type: 'single_choice',
  title: '¿Cuál es tu color favorito?',
  required: true,
  showConditionally: false,
  deviceFrame: false,
  choices: [
    { id: '1', text: 'Rojo', isQualify: false, isDisqualify: false },
    { id: '2', text: 'Azul', isQualify: false, isDisqualify: false },
    { id: '3', text: 'Verde', isQualify: false, isDisqualify: false }
  ]
};

// Crear una pregunta de escala
const scaleQuestion: Question = {
  id: '3.5',
  type: 'linear_scale',
  title: '¿Qué tan satisfecho estás?',
  required: true,
  showConditionally: false,
  deviceFrame: false,
  scaleConfig: {
    startValue: 1,
    endValue: 5,
    startLabel: 'Muy insatisfecho',
    endLabel: 'Muy satisfecho'
  }
};
```

---

## Estado Actual

✅ **Completado:**
- Configuración de 8 tipos de preguntas
- Componentes de edición para investigadores
- Vista previa de preguntas
- Manejo de archivos y hit zones
- Validación de formularios
- Componentes atómicos reutilizables

⚠️ **Pendiente de Verificar:**
- Renderizado interactivo para participantes
- Componentes de respuesta donde los participantes responden las preguntas
- Funcionalidad de ranking drag & drop
- Visualización de hit zones en modo participante

---

**Última actualización:** 2025-01-27

