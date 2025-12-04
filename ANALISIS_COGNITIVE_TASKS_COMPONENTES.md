# Análisis de Similitudes en Componentes de Cognitive Tasks

## Resumen Ejecutivo

Análisis de los 8 módulos de Cognitive Tasks definidos en `backend/scripts/seed_cognitive_tasks_modules_from_md.ts` para identificar patrones comunes, componentes compartidos y estructuras similares.

---

## Componentes Comunes a TODOS los Módulos

### 1. `question-title` (Componente Base)
**Presente en:** 8/8 módulos (100%)

**Características:**
- `id`: `'question-title'`
- `name`: `'Question Title'`
- `type`: `'input'`
- `label`: `'Título de la pregunta'`
- `defaultValue`: `''` (vacío)
- `placeholder.enabled`: `true`
- `placeholder.text`: `'Escribe la pregunta aquí...'`
- `required`: `true`
- `order`: `1` (siempre primero)
- `settings`: `{}` (vacío)

**Conclusión:** Componente universal presente en todos los módulos.

---

### 2. `question-description` (Componente Base)
**Presente en:** 8/8 módulos (100%)

**Características:**
- `id`: `'question-description'`
- `name`: `'Question Description'`
- `type`: `'textarea'`
- `label`: `'Descripción'`
- `defaultValue`: `''` (vacío)
- `placeholder.enabled`: `true`
- `placeholder.text`: `'Escribe una descripción opcional...'`
- `required`: `false` (siempre opcional)
- `order`: `2` (siempre segundo)
- `settings`: `{}` (vacío) o `{ maxLength: 1000, autosize: true }` (solo en Long Text)

**Variación única:**
- **Long Text**: Tiene `settings: { maxLength: 1000, autosize: true }`
- **Resto**: `settings: {}`

**Conclusión:** Componente universal presente en todos los módulos, con una variación menor en Long Text.

---

## Grupos de Módulos por Similitud

### Grupo 1: Text Input Modules (2 módulos)
**Módulos:** Short Text, Long Text

**Estructura idéntica:**
1. `question-title` (order: 1)
2. `question-description` (order: 2)
3. `answer-placeholder` (order: 3)

**Componente específico:**
- `id`: `'answer-placeholder'`
- `name`: `'Answer Placeholder'`
- `type`: `'input'`
- `label`: `'Placeholder de respuesta'`
- `defaultValue`: `'Short text answer'` o `'Long text answer'`
- `placeholder.enabled`: `true`
- `placeholder.text`: `'Ej: Short text answer'` o `'Ej: Long text answer'`
- `required`: `false`
- `order`: `3`
- `settings`: `{}`

**Diferencia única:**
- Solo el `defaultValue` y `placeholder.text` cambian entre Short Text y Long Text

**Similitud:** 100% idénticos excepto por el texto del placeholder

---

### Grupo 2: Choice Modules (2 módulos)
**Módulos:** Single Choice, Multiple Choice

**Estructura idéntica:**
1. `question-title` (order: 1)
2. `question-description` (order: 2)
3. `choice-1` (order: 3)
4. `choice-2` (order: 4)
5. `choice-3` (order: 5)

**Componentes específicos (choice-1, choice-2, choice-3):**
- `id`: `'choice-1'`, `'choice-2'`, `'choice-3'`
- `name`: `'Choice 1'`, `'Choice 2'`, `'Choice 3'`
- `type`: `'input'`
- `label`: `''` (vacío)
- `defaultValue`: `''` (vacío)
- `placeholder.enabled`: `true`
- `placeholder.text`: `'Escribe la opción 1...'`, `'Escribe la opción 2...'`, `'Escribe la opción 3...'`
- `required`: `false`
- `order`: `3`, `4`, `5`
- `settings`: `{ groupLabel: 'CHOICES', isChoice: true }`

**Similitud:** 100% idénticos entre Single Choice y Multiple Choice

**Nota:** La diferencia entre Single Choice y Multiple Choice NO está en la estructura de componentes, sino probablemente en el renderizado o en la lógica de selección.

---

### Grupo 3: Scale Module (1 módulo)
**Módulo:** Linear Scale

**Estructura:**
1. `question-title` (order: 1)
2. `question-description` (order: 2)
3. `scale-start-value` (order: 3)
4. `scale-end-value` (order: 4)
5. `scale-start-label` (order: 5)
6. `scale-end-label` (order: 6)

**Componentes específicos:**

**scale-start-value:**
- `id`: `'scale-start-value'`
- `name`: `'Scale Start Value'`
- `type`: `'input'`
- `label`: `'Valor inicial'`
- `defaultValue`: `'1'`
- `placeholder.enabled`: `true`
- `placeholder.text`: `'Ej: 1'`
- `required`: `true`
- `order`: `3`
- `settings`: `{ min: 0, max: 100, type: 'number' }`

**scale-end-value:**
- `id`: `'scale-end-value'`
- `name`: `'Scale End Value'`
- `type`: `'input'`
- `label`: `'Valor final'`
- `defaultValue`: `'5'`
- `placeholder.enabled`: `true`
- `placeholder.text`: `'Ej: 5'`
- `required`: `true`
- `order`: `4`
- `settings`: `{ min: 0, max: 100, type: 'number' }`

**scale-start-label:**
- `id`: `'scale-start-label'`
- `name`: `'Scale Start Label'`
- `type`: `'input'`
- `label`: `'Etiqueta valor inicial'`
- `defaultValue`: `''` (vacío)
- `placeholder.enabled`: `true`
- `placeholder.text`: `'Ej: Muy insatisfecho'`
- `required`: `false`
- `order`: `5`
- `settings`: `{}`

**scale-end-label:**
- `id`: `'scale-end-label'`
- `name`: `'Scale End Label'`
- `type`: `'input'`
- `label`: `'Etiqueta valor final'`
- `defaultValue`: `''` (vacío)
- `placeholder.enabled`: `true`
- `placeholder.text`: `'Ej: Muy satisfecho'`
- `required`: `false`
- `order`: `6`
- `settings`: `{}`

**Patrón:** Par de valores (start/end) y par de etiquetas (start/end)

---

### Grupo 4: Ranking Module (1 módulo)
**Módulo:** Ranking

**Estructura:**
1. `question-title` (order: 1)
2. `question-description` (order: 2)
3. `ranking-slider` (order: 3)

**Componente específico:**
- `id`: `'ranking-slider'`
- `name`: `'Ranking Slider'`
- `type`: `'select'`
- `label`: `''` (vacío)
- `defaultValue`: `''` (vacío)
- `required`: `true`
- `order`: `3`
- `settings`: `{}`
- `selectRange`: `{ type: 'predefined', predefined: '1-5', variant: 'slider' }`

**Nota:** Este módulo es único porque usa `selectRange` en lugar de componentes de choice individuales.

---

### Grupo 5: File Upload Modules (2 módulos)
**Módulos:** Navigation Flow, Preference Test

**Estructura idéntica:**
1. `question-title` (order: 1)
2. `question-description` (order: 2)
3. `image-upload` (order: 3)

**Componente específico:**
- `id`: `'image-upload'`
- `name`: `'Image Upload'`
- `type`: `'file-upload'`
- `label`: `'Subir archivos (imágenes)'`
- `required`: `false`
- `order`: `3`
- `settings`: `{}`
- `fileUpload`: Objeto con configuración

**fileUpload (Navigation Flow):**
```typescript
{
    maxSizeMB: 5,
    acceptedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
    recommendedResolution: '1000x1000px',
    allowHitZones: true,
    allowParticipantSelection: false
}
```

**fileUpload (Preference Test):**
```typescript
{
    maxSizeMB: 5,
    acceptedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
    recommendedResolution: '1000x1000px'
}
```

**Diferencia única:**
- Navigation Flow tiene `allowHitZones: true` y `allowParticipantSelection: false`
- Preference Test NO tiene estas propiedades

**Similitud:** 95% idénticos, diferencia solo en propiedades de `fileUpload`

---

## Matriz de Similitudes

| Módulo | question-title | question-description | Componente Específico | Total Componentes |
|--------|----------------|---------------------|----------------------|-------------------|
| Short Text | ✅ | ✅ | answer-placeholder | 3 |
| Long Text | ✅ | ✅ | answer-placeholder | 3 |
| Single Choice | ✅ | ✅ | choice-1, choice-2, choice-3 | 5 |
| Multiple Choice | ✅ | ✅ | choice-1, choice-2, choice-3 | 5 |
| Linear Scale | ✅ | ✅ | scale-start-value, scale-end-value, scale-start-label, scale-end-label | 6 |
| Ranking | ✅ | ✅ | ranking-slider | 3 |
| Navigation Flow | ✅ | ✅ | image-upload | 3 |
| Preference Test | ✅ | ✅ | image-upload | 3 |

---

## Patrones Identificados

### Patrón 1: Estructura Base Universal
**Todos los módulos tienen:**
```
1. question-title (order: 1, required: true)
2. question-description (order: 2, required: false)
3. [Componente(s) específico(s)] (order: 3+)
```

### Patrón 2: Componentes de Texto
**Short Text y Long Text:**
- Comparten estructura idéntica
- Solo difieren en el texto del placeholder

### Patrón 3: Componentes de Elección
**Single Choice y Multiple Choice:**
- Estructura 100% idéntica
- Usan `settings.groupLabel: 'CHOICES'` y `settings.isChoice: true`
- La diferencia está en el comportamiento, no en la estructura

### Patrón 4: Componentes de Escala
**Linear Scale:**
- Usa pares de componentes (start/end, label/label)
- Valores numéricos con validación (min: 0, max: 100)

### Patrón 5: Componentes de Archivo
**Navigation Flow y Preference Test:**
- Estructura casi idéntica
- Difieren solo en propiedades de `fileUpload`

### Patrón 6: Componente Único
**Ranking:**
- Usa `selectRange` en lugar de componentes individuales
- Estructura más simple (solo 3 componentes)

---

## Implicaciones para el Frontend

### 1. Componentes Reutilizables
Se pueden crear componentes base:
- `QuestionTitleRenderer` - Para `question-title`
- `QuestionDescriptionRenderer` - Para `question-description`
- `AnswerPlaceholderRenderer` - Para `answer-placeholder` (Short/Long Text)
- `ChoiceRenderer` - Para `choice-*` (Single/Multiple Choice)
- `ScaleRenderer` - Para `scale-*` (Linear Scale)
- `RankingRenderer` - Para `ranking-slider` (Ranking)
- `FileUploadRenderer` - Para `image-upload` (Navigation Flow/Preference Test)

### 2. Detección de Tipo de Módulo
Se puede detectar el tipo de módulo Cognitive Task por:
- **Presencia de componentes específicos:**
  - `answer-placeholder` → Short Text o Long Text
  - `choice-1`, `choice-2`, `choice-3` → Single Choice o Multiple Choice
  - `scale-start-value` → Linear Scale
  - `ranking-slider` → Ranking
  - `image-upload` → Navigation Flow o Preference Test

- **Nombre del módulo:**
  - `name.includes('Short Text')` → Short Text
  - `name.includes('Long Text')` → Long Text
  - `name.includes('Single Choice')` → Single Choice
  - `name.includes('Multiple Choice')` → Multiple Choice
  - `name.includes('Linear Scale')` → Linear Scale
  - `name.includes('Ranking')` → Ranking
  - `name.includes('Navigation Flow')` → Navigation Flow
  - `name.includes('Preference Test')` → Preference Test

### 3. Renderizado Condicional
Similar a SmartVOC, se puede crear un `CognitiveTasksRenderer` que:
1. Detecta el tipo de módulo
2. Renderiza los componentes base (title, description)
3. Renderiza el componente específico según el tipo

---

## Comparación con SmartVOC

### Similitudes
- Ambos tienen componentes base comunes (title, description)
- Ambos tienen componentes específicos según el tipo
- Ambos usan la misma estructura `ModuleConfig`

### Diferencias
- **SmartVOC:** Componentes más variados (display-type, scale-range, instructions)
- **Cognitive Tasks:** Componentes más estandarizados (siempre title + description + específico)
- **SmartVOC:** Algunos módulos tienen componentes de solo lectura (instructions)
- **Cognitive Tasks:** Todos los componentes son editables

---

## Conclusión

Los módulos de Cognitive Tasks tienen una estructura muy consistente:
1. **100% de los módulos** comparten `question-title` y `question-description`
2. **Grupos claros** de módulos con estructuras idénticas o muy similares
3. **Componentes específicos** bien definidos para cada tipo
4. **Patrones claros** que facilitan la creación de renderers reutilizables

Esto sugiere que se puede crear un sistema de renderizado más modular y reutilizable que el de SmartVOC, aprovechando la alta similitud entre módulos.

