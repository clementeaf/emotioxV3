# EmotioxV3 - Ejemplos de Flujo Dinámico

## 🎯 Filosofía: Backend como Orquestador

El backend **NO impone estructura rígida**. Todo es dinámico y basado en JSON schemas almacenados en JSONB.

---

## 📋 Ejemplo Completo: Flujo de Creación de Investigación

### Paso 1: Admin crea un Research Type

**Request:**
```http
POST /research-types
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "interest",
  "description": "Investigación de intereses y preferencias",
  "default_modules": [
    {
      "name": "Datos Demográficos",
      "description": "Información básica del participante",
      "order": 1,
      "is_default": true,
      "questions": [
        {
          "type": "range",
          "text": "¿Cuál es tu edad?",
          "config": {
            "min": 18,
            "max": 100,
            "step": 1,
            "labels": {
              "min": "18 años",
              "max": "100 años"
            }
          },
          "required": true
        },
        {
          "type": "text",
          "text": "¿Cuál es tu género?",
          "config": {
            "placeholder": "Ej: Masculino, Femenino, Otro",
            "maxLength": 50
          },
          "required": true
        }
      ]
    },
    {
      "name": "Intereses Generales",
      "description": "Preguntas sobre hobbies y preferencias",
      "order": 2,
      "is_default": true,
      "questions": [
        {
          "type": "textarea",
          "text": "Describe tus hobbies principales",
          "config": {
            "placeholder": "Escribe aquí tus hobbies...",
            "rows": 5,
            "maxLength": 500
          },
          "required": false
        }
      ]
    },
    {
      "name": "Preferencias Visuales",
      "description": "Selección de imágenes favoritas",
      "order": 3,
      "is_default": false,
      "questions": [
        {
          "type": "image_preference",
          "text": "Selecciona tus 3 imágenes favoritas",
          "config": {
            "images": [],
            "selectionType": "multiple",
            "minSelections": 1,
            "maxSelections": 3
          },
          "required": true
        }
      ]
    }
  ],
  "settings": {
    "allowCustomModules": true,
    "requireAllDefaults": false
  }
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "interest",
  "description": "Investigación de intereses y preferencias",
  "default_modules": [...],
  "settings": {...},
  "created_at": "2025-11-20T21:00:00Z"
}
```

---

### Paso 2: Investigador crea una investigación basada en el tipo "interest"

**Request:**
```http
POST /research
Authorization: Bearer {researcher_token}
Content-Type: application/json

{
  "name": "Estudio de Preferencias Musicales 2025",
  "research_type_id": "550e8400-e29b-41d4-a716-446655440000",
  "description": "Investigación sobre gustos musicales en jóvenes",
  "use_default_modules": [
    "Datos Demográficos",
    "Intereses Generales"
  ],
  "settings": {
    "maxResponses": 1000,
    "allowMultipleResponses": false
  }
}
```

**Backend automáticamente:**
1. Crea la investigación
2. Clona los módulos seleccionados del template
3. Crea las preguntas de cada módulo clonado

**Response:**
```json
{
  "id": "abc-123-def-456",
  "name": "Estudio de Preferencias Musicales 2025",
  "research_type_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "draft",
  "modules": [
    {
      "id": "mod-1",
      "name": "Datos Demográficos",
      "is_from_template": true,
      "order_index": 1,
      "questions": [
        {
          "id": "q-1",
          "type": "range",
          "text": "¿Cuál es tu edad?",
          "config": { "min": 18, "max": 100, ... }
        },
        {
          "id": "q-2",
          "type": "text",
          "text": "¿Cuál es tu género?",
          "config": { ... }
        }
      ]
    },
    {
      "id": "mod-2",
      "name": "Intereses Generales",
      "is_from_template": true,
      "order_index": 2,
      "questions": [...]
    }
  ]
}
```

---

### Paso 3: Investigador agrega módulo personalizado

**Request:**
```http
POST /research/abc-123-def-456/modules
Authorization: Bearer {researcher_token}
Content-Type: application/json

{
  "name": "Preferencias Musicales Específicas",
  "description": "Preguntas sobre géneros musicales",
  "order_index": 3
}
```

**Response:**
```json
{
  "id": "mod-3",
  "research_id": "abc-123-def-456",
  "name": "Preferencias Musicales Específicas",
  "is_from_template": false,
  "order_index": 3
}
```

---

### Paso 4: Investigador agrega preguntas al módulo custom

**Request 1: Pregunta tipo range**
```http
POST /modules/mod-3/questions
Authorization: Bearer {researcher_token}
Content-Type: application/json

{
  "question_type": "range",
  "question_text": "¿Qué tanto te gusta el rock?",
  "order_index": 1,
  "config": {
    "min": 1,
    "max": 10,
    "step": 1,
    "labels": {
      "min": "No me gusta",
      "max": "Me encanta"
    },
    "showValue": true
  },
  "required": true
}
```

**Request 2: Pregunta tipo image_preference**
```http
POST /modules/mod-3/questions
Authorization: Bearer {researcher_token}
Content-Type: application/json

{
  "question_type": "image_preference",
  "question_text": "Selecciona tus 3 álbumes favoritos",
  "order_index": 2,
  "config": {
    "images": [
      {
        "id": "img-1",
        "url": "https://s3.../album1.jpg",
        "label": "Abbey Road - The Beatles"
      },
      {
        "id": "img-2",
        "url": "https://s3.../album2.jpg",
        "label": "Dark Side of the Moon - Pink Floyd"
      },
      {
        "id": "img-3",
        "url": "https://s3.../album3.jpg",
        "label": "Thriller - Michael Jackson"
      }
    ],
    "selectionType": "multiple",
    "minSelections": 1,
    "maxSelections": 3
  },
  "required": true
}
```

**Request 3: Pregunta tipo custom (completamente nueva)**
```http
POST /modules/mod-3/questions
Authorization: Bearer {researcher_token}
Content-Type: application/json

{
  "question_type": "audio_player",
  "question_text": "Escucha estos fragmentos y califica cada uno",
  "order_index": 3,
  "config": {
    "audioFiles": [
      {
        "id": "audio-1",
        "url": "https://s3.../sample1.mp3",
        "duration": 30
      },
      {
        "id": "audio-2",
        "url": "https://s3.../sample2.mp3",
        "duration": 30
      }
    ],
    "ratingScale": {
      "min": 1,
      "max": 5,
      "labels": ["Muy malo", "Malo", "Regular", "Bueno", "Excelente"]
    }
  },
  "validation": {
    "mustPlayAll": true,
    "minPlayTime": 15
  },
  "required": true
}
```

> ⚠️ **Nota**: El tipo `audio_player` NO existe en el sistema predefinido, pero el backend lo acepta porque **no hay restricciones**. El frontend deberá implementar el componente correspondiente.

---

### Paso 5: Investigador activa la investigación

**Request:**
```http
PATCH /research/abc-123-def-456/status
Authorization: Bearer {researcher_token}
Content-Type: application/json

{
  "status": "active"
}
```

**Response:**
```json
{
  "id": "abc-123-def-456",
  "status": "active",
  "participant_url": "https://participant.emotioxv3.com/research/abc-123-def-456/participant/{participantId}"
}
```

---

### Paso 6: Participante accede y responde

**URL de acceso:**
```
https://participant.emotioxv3.com/research/abc-123-def-456/participant/EXT-12345
```

**Participant Frontend hace:**
```http
GET /public/research/abc-123-def-456
```

**Response (estructura completa):**
```json
{
  "id": "abc-123-def-456",
  "name": "Estudio de Preferencias Musicales 2025",
  "description": "Investigación sobre gustos musicales en jóvenes",
  "status": "active",
  "modules": [
    {
      "id": "mod-1",
      "name": "Datos Demográficos",
      "order": 1,
      "questions": [
        {
          "id": "q-1",
          "type": "range",
          "text": "¿Cuál es tu edad?",
          "config": { "min": 18, "max": 100, "step": 1, "labels": {...} },
          "required": true
        },
        {
          "id": "q-2",
          "type": "text",
          "text": "¿Cuál es tu género?",
          "config": { "placeholder": "...", "maxLength": 50 },
          "required": true
        }
      ]
    },
    {
      "id": "mod-2",
      "name": "Intereses Generales",
      "order": 2,
      "questions": [...]
    },
    {
      "id": "mod-3",
      "name": "Preferencias Musicales Específicas",
      "order": 3,
      "questions": [
        {
          "id": "q-5",
          "type": "range",
          "text": "¿Qué tanto te gusta el rock?",
          "config": {...}
        },
        {
          "id": "q-6",
          "type": "image_preference",
          "text": "Selecciona tus 3 álbumes favoritos",
          "config": {
            "images": [...],
            "selectionType": "multiple",
            "maxSelections": 3
          }
        },
        {
          "id": "q-7",
          "type": "audio_player",
          "text": "Escucha estos fragmentos y califica cada uno",
          "config": {
            "audioFiles": [...],
            "ratingScale": {...}
          }
        }
      ]
    }
  ]
}
```

**Participant Frontend renderiza dinámicamente:**
- Módulo 1 → Componente `<RangeQuestion />` y `<TextQuestion />`
- Módulo 2 → Componente `<TextareaQuestion />`
- Módulo 3 → Componentes `<RangeQuestion />`, `<ImagePreferenceQuestion />`, `<AudioPlayerQuestion />`

---

### Paso 7: Participante envía respuestas

**Request (por cada pregunta):**
```http
POST /public/responses
Content-Type: application/json

{
  "research_id": "abc-123-def-456",
  "participant_id": "EXT-12345",
  "module_id": "mod-1",
  "question_id": "q-1",
  "answer": {
    "value": 25
  },
  "metadata": {
    "timestamp": "2025-11-20T21:15:30Z",
    "device": "mobile",
    "browser": "Chrome"
  }
}
```

```http
POST /public/responses
Content-Type: application/json

{
  "research_id": "abc-123-def-456",
  "participant_id": "EXT-12345",
  "module_id": "mod-3",
  "question_id": "q-6",
  "answer": {
    "selected": ["img-1", "img-2", "img-3"],
    "timeSpent": 45
  },
  "metadata": {
    "timestamp": "2025-11-20T21:18:00Z"
  }
}
```

```http
POST /public/responses
Content-Type: application/json

{
  "research_id": "abc-123-def-456",
  "participant_id": "EXT-12345",
  "module_id": "mod-3",
  "question_id": "q-7",
  "answer": {
    "ratings": [
      { "audioId": "audio-1", "rating": 4, "playTime": 30 },
      { "audioId": "audio-2", "rating": 5, "playTime": 30 }
    ]
  },
  "metadata": {
    "timestamp": "2025-11-20T21:20:00Z"
  }
}
```

---

## 🎯 Ventajas del Enfoque Dinámico

### ✅ Flexibilidad Total
- Admin puede crear cualquier tipo de investigación
- Investigador puede personalizar completamente
- Nuevos tipos de preguntas sin cambiar backend

### ✅ Sin Rigidez
- No hay enums restrictivos
- JSONB acepta cualquier estructura
- Validación en frontend, no en backend

### ✅ Escalabilidad
- Agregar nuevos tipos de preguntas: solo frontend
- Nuevos campos en config: solo actualizar JSON
- Sin migraciones de base de datos

### ✅ Reutilización
- Templates predefinidos aceleran creación
- Investigadores pueden compartir módulos
- Consistencia cuando se necesita

---

## 🔄 Tipos de Preguntas Soportados (Ejemplos)

### Predefinidos
- `text` - Input de texto
- `textarea` - Texto largo
- `range` - Selector numérico
- `image_hitzone` - Click en imagen
- `image_preference` - Selección de imágenes

### Personalizados (Ejemplos)
- `audio_player` - Reproducir y calificar audio
- `video_response` - Grabar video respuesta
- `drawing_canvas` - Dibujar en canvas
- `matrix_grid` - Matriz de opciones
- `ranking` - Ordenar elementos
- `file_upload` - Subir archivo
- `signature` - Firma digital
- **Cualquier otro que se necesite**

---

## 💡 Conclusión

El backend es un **conductor puro**:
- Almacena JSON
- Valida estructura mínima
- Retorna datos
- No impone lógica de negocio

La **inteligencia está en los frontends**:
- Research Frontend: constructor visual
- Participant Frontend: renderizador dinámico
