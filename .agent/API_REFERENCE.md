# EmotioX v3 - API Reference

Documentación completa de todos los endpoints del backend.

## 📋 Índice

1. [Autenticación](#autenticación)
2. [Research](#research)
3. [Stages](#stages)
4. [Modules](#modules)
5. [Responses](#responses)
6. [Analysis](#analysis)
7. [Media (S3)](#media-s3)
8. [Templates](#templates)
9. [Config](#config)
10. [Public Endpoints](#public-endpoints)

---

## Base URL

```
Development: http://localhost:3000
Production: https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/production
```

## Autenticación

Todos los endpoints (excepto `/public/*` y `/config`) requieren autenticación.

```
Authorization: Bearer <access_token>
```

---

## Research

### GET /research
Obtiene todos los research del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Mi Estudio",
    "description": "Descripción del estudio",
    "created_by": "user-uuid",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "stages": [
      {
        "id": "stage-uuid",
        "name": "Research Configuration",
        "type": "single_module",
        "order_index": 0,
        "modules": [...]
      }
    ]
  }
]
```

### POST /research
Crea un nuevo research.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Nombre del estudio",
  "description": "Descripción opcional",
  "research_type_id": "type-uuid"
}
```

**Response 201:**
```json
{
  "id": "research-uuid",
  "name": "Nombre del estudio",
  "description": "Descripción opcional",
  "created_by": "user-uuid",
  "created_at": "2024-01-01T00:00:00.000Z",
  "stages": [
    {
      "id": "stage-uuid",
      "name": "Research Configuration",
      "type": "single_module",
      "modules": [
        {
          "id": "module-uuid",
          "name": "Research Configuration",
          "config": {}
        }
      ]
    }
  ]
}
```

**Notas:**
- Siempre se crea un stage "Research Configuration" por defecto
- El módulo "Research Configuration" también se crea automáticamente

### GET /research/:id
Obtiene un research específico con todos sus stages y modules.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": "research-uuid",
  "name": "Mi Estudio",
  "stages": [
    {
      "id": "stage-uuid",
      "name": "Smart VOC",
      "type": "module_collection",
      "modules": [
        {
          "id": "module-1",
          "name": "Customer Effort Score",
          "config": {
            "structure": {
              "components": [...]
            }
          }
        }
      ]
    }
  ]
}
```

### PUT /research/:id
Actualiza un research.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Nombre actualizado",
  "description": "Nueva descripción"
}
```

**Response 200:**
```json
{
  "id": "research-uuid",
  "name": "Nombre actualizado",
  "description": "Nueva descripción",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### DELETE /research/:id
Elimina un research y todos sus datos relacionados.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "message": "Research deleted successfully"
}
```

**Notas:**
- Borra en cascada: stages, modules, responses, answers

---

## Stages

### POST /stages
Crea un nuevo stage en un research.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "research_id": "research-uuid",
  "stage_template_id": "template-uuid",
  "name": "Nombre del stage",
  "type": "module_collection",
  "order_index": 1
}
```

**Response 201:**
```json
{
  "id": "stage-uuid",
  "research_id": "research-uuid",
  "name": "Smart VOC",
  "type": "module_collection",
  "order_index": 1,
  "modules": [
    {
      "id": "module-1",
      "name": "CES",
      "config": {...}
    },
    {
      "id": "module-2",
      "name": "CSAT",
      "config": {...}
    }
  ]
}
```

**Notas:**
- Si el template es "Smart VOC", crea automáticamente 5 módulos
- Si el template es "Cognitive Tasks", NO crea módulos (usuario los selecciona)

### PUT /stages/:id
Actualiza un stage.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Nuevo nombre",
  "order_index": 2
}
```

**Response 200:**
```json
{
  "id": "stage-uuid",
  "name": "Nuevo nombre",
  "order_index": 2,
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### DELETE /stages/:id
Elimina un stage y todos sus módulos.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "message": "Stage deleted successfully"
}
```

---

## Modules

### POST /modules
Crea un nuevo módulo en un stage.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "stage_id": "stage-uuid",
  "module_template_id": "template-uuid",
  "name": "Short Text",
  "order_index": 0
}
```

**Response 201:**
```json
{
  "id": "module-uuid",
  "stage_id": "stage-uuid",
  "name": "Short Text",
  "config": {
    "structure": {
      "components": [
        {
          "id": "question-title",
          "type": "input",
          "label": "Título de la pregunta",
          "value": "",
          "placeholder": {
            "enabled": true,
            "text": "Escribe la pregunta aquí..."
          }
        }
      ]
    }
  },
  "order_index": 0
}
```

### PUT /modules/:id
Actualiza un módulo (CRÍTICO: debe preservar estructura completa).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "config": {
    "structure": {
      "components": [
        {
          "id": "question-title",
          "type": "input",
          "label": "Título de la pregunta",
          "value": "¿Cómo fue tu experiencia?",
          "placeholder": {
            "enabled": true,
            "text": "Escribe la pregunta aquí..."
          },
          "required": true
        }
      ]
    }
  },
  "order_index": 0
}
```

**Response 200:**
```json
{
  "id": "module-uuid",
  "config": {...},
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**⚠️ CRÍTICO:**
- SIEMPRE enviar la estructura completa de `components`
- NO enviar solo los valores (`componentValues`)
- Preservar todos los campos: `type`, `label`, `placeholder`, `settings`, etc.

### DELETE /modules/:id
Elimina un módulo.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "message": "Module deleted successfully"
}
```

---

## Responses

### GET /responses/research/:researchId
Obtiene todas las respuestas de un research.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": "response-uuid",
    "research_id": "research-uuid",
    "participant_id": "anon-123",
    "created_at": "2024-01-01T00:00:00.000Z",
    "answers": [
      {
        "question_id": "q-uuid",
        "value": "Mi respuesta"
      }
    ]
  }
]
```

---

## Analysis

### GET /analysis/research/:id
Obtiene análisis completo de un research.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "research_id": "research-uuid",
  "total_responses": 150,
  "metrics": {
    "nps": {
      "score": 42,
      "promoters": 60,
      "passives": 45,
      "detractors": 45,
      "totalResponses": 150
    },
    "csat": {
      "score": 4.2,
      "totalResponses": 150
    },
    "ces": {
      "score": 3.8,
      "totalResponses": 150
    }
  }
}
```

**Fórmulas de Cálculo:**

```typescript
// NPS: (Promoters - Detractors) / Total * 100
// Promoters: 9-10
// Passives: 7-8
// Detractors: 0-6

// CSAT: Average of all ratings (1-5)

// CES: Average of all ratings (1-7)
// Lower is better for CES
```

---

## Media (S3)

### POST /media/upload
Genera una presigned URL para subir archivo a S3.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "research_id": "research-uuid",
  "file_name": "logo.png",
  "content_type": "image/png"
}
```

**Response 200:**
```json
{
  "upload_url": "https://s3.amazonaws.com/bucket/research/uuid/1234-logo.png?X-Amz-...",
  "s3_key": "research/uuid/1234-logo.png",
  "bucket": "emotioxv3-media"
}
```

**Uso:**
```typescript
// 1. Obtener presigned URL
const { upload_url, s3_key } = await fetch('/media/upload', {
  method: 'POST',
  body: JSON.stringify({
    research_id: 'xxx',
    file_name: 'image.png',
    content_type: 'image/png'
  })
}).then(r => r.json());

// 2. Upload directo a S3 (sin autenticación)
await fetch(upload_url, {
  method: 'PUT',
  body: fileBlob,
  headers: { 'Content-Type': 'image/png' }
});

// 3. Guardar metadata
await fetch('/media', {
  method: 'POST',
  body: JSON.stringify({
    research_id: 'xxx',
    s3_key: s3_key,
    metadata: {
      fileName: 'image.png',
      fileType: 'image/png',
      fileSize: 1024000
    }
  })
});
```

### POST /media
Guarda metadata de un archivo ya subido a S3.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "research_id": "research-uuid",
  "s3_key": "research/uuid/1234-logo.png",
  "metadata": {
    "fileName": "logo.png",
    "fileType": "image/png",
    "fileSize": 1024000
  }
}
```

**Response 201:**
```json
{
  "media": {
    "id": "media-uuid",
    "research_id": "research-uuid",
    "s3_key": "research/uuid/1234-logo.png",
    "file_name": "logo.png",
    "file_type": "image/png",
    "file_size": 1024000,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /media/:id
Obtiene una presigned URL para descargar un archivo.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "url": "https://s3.amazonaws.com/bucket/research/uuid/1234-logo.png?X-Amz-...",
  "expires_in": 3600
}
```

### DELETE /media/:id
Elimina un archivo de S3 y su metadata.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "message": "Media deleted successfully"
}
```

---

## Templates

### GET /stage-templates
Obtiene todas las plantillas de stages disponibles.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": "template-uuid",
    "name": "Smart VOC",
    "description": "5 módulos de análisis emocional",
    "type": "module_collection"
  },
  {
    "id": "template-uuid-2",
    "name": "Cognitive Tasks",
    "description": "Tareas cognitivas personalizables",
    "type": "module_collection"
  }
]
```

### GET /module-templates
Obtiene todas las plantillas de módulos disponibles.

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": "template-uuid",
    "name": "Short Text",
    "description": "Pregunta de respuesta corta",
    "structure": {
      "components": [...]
    }
  },
  {
    "id": "template-uuid-2",
    "name": "Navigation Flow",
    "description": "Prueba de flujo de navegación con hitzones",
    "structure": {
      "components": [...]
    }
  }
]
```

---

## Config

### GET /config
Obtiene configuración del cliente (URLs, features, etc.).

**No requiere autenticación**

**Response 200:**
```json
{
  "apiVersion": "1.0.0",
  "endpoints": {
    "research": {
      "list": "/research",
      "create": "/research",
      "getById": "/research/:id"
    },
    "public": {
      "research": "/public/research/:id",
      "submitResponse": "/public/research/:id/responses"
    },
    "media": {
      "upload": "/media/upload",
      "getUrl": "/media/:key"
    }
  },
  "features": {
    "authentication": true,
    "fileUpload": true,
    "analytics": true
  },
  "limits": {
    "maxFileSize": 5242880,
    "maxResponseLength": 10000
  }
}
```

---

## Public Endpoints

### GET /public/research/:id
Obtiene un research público (sin autenticación) para participantes.

**No requiere autenticación**

**Response 200:**
```json
{
  "id": "research-uuid",
  "name": "Mi Estudio",
  "description": "Descripción",
  "stages": [
    {
      "id": "stage-uuid",
      "name": "Smart VOC",
      "modules": [
        {
          "id": "module-uuid",
          "name": "CES",
          "config": {
            "structure": {
              "components": [...]
            }
          }
        }
      ]
    }
  ]
}
```

**Notas:**
- NO incluye información sensible del creador
- Solo retorna stages y modules configurados
- Research Configuration NO se incluye

### POST /public/research/:id/responses
Envía respuestas de un participante (sin autenticación).

**No requiere autenticación**

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "participant_id": "anon-12345",
  "answers": {
    "question-uuid-1": "Mi respuesta",
    "question-uuid-2": "8",
    "question-uuid-3": "[{\"id\":\"file-1\",\"s3Key\":\"...\"}]"
  }
}
```

**Response 201:**
```json
{
  "id": "response-uuid",
  "research_id": "research-uuid",
  "participant_id": "anon-12345",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**Notas:**
- `participant_id` es generado por el frontend (anónimo)
- `answers` es un objeto con question_id como key
- Valores pueden ser strings, números, o JSON stringificado

---

## Error Responses

Todos los endpoints pueden retornar estos errores:

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "You don't have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

- **No implementado actualmente**
- Recomendado para producción: 100 requests/minuto por IP

---

## CORS

- **Desarrollo**: Permite `http://localhost:*`
- **Producción**: Solo permite dominios de CloudFront configurados

---

## Notas de Implementación

### Paginación
- No implementada actualmente
- Todos los endpoints retornan todos los resultados

### Filtros
- No implementados actualmente
- Considerar agregar para `/research` y `/responses`

### Ordenamiento
- Ordenamiento por `created_at DESC` por defecto
- No personalizable actualmente

### Cache
- Backend usa cache en memoria para templates
- TTL: 15 minutos
- Invalidación manual en updates

---

## Testing Endpoints

```bash
# Health check
curl https://api.emotioxv3.com/health

# Get config (no auth)
curl https://api.emotioxv3.com/config

# Get research list (with auth)
curl -H "Authorization: Bearer <token>" \
  https://api.emotioxv3.com/research

# Create research
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","description":"Test"}' \
  https://api.emotioxv3.com/research
```

Ver script completo de testing: [`backend/test-all-endpoints.sh`](../backend/test-all-endpoints.sh)
