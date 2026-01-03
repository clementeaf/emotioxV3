# 🚀 EmotioX v3 - Quick Reference

Esta es una guía de referencia rápida para consultar información clave del sistema.

## 📁 Estructura de Archivos

```
emotioxV3/
│
├── .agent/                          # 🧠 MEMORIA DEL SISTEMA
│   ├── README.md                    # Índice maestro
│   ├── SYSTEM_ARCHITECTURE.md       # Arquitectura general
│   ├── DATA_FLOWS.md                # Flujos críticos paso a paso
│   ├── TECHNICAL_DECISIONS.md       # Por qué cada decisión
│   ├── API_REFERENCE.md             # Todos los endpoints
│   └── QUICK_REFERENCE.md           # Este archivo
│
├── backend/
│   ├── src/
│   │   ├── modules/                 # Lógica de negocio
│   │   │   ├── research/
│   │   │   ├── stages/
│   │   │   ├── modules/
│   │   │   ├── media/
│   │   │   └── analysis/
│   │   ├── config/                  # DB, S3, Cache
│   │   └── utils/                   # Auth, response helpers
│   ├── scripts/                     # Seeds y setup
│   └── serverless.yml               # Deploy config
│
├── research-frontend/
│   ├── src/
│   │   ├── pages/                   # Rutas principales
│   │   ├── components/              # UI components
│   │   ├── services/                # API clients
│   │   ├── stores/                  # Zustand (auth)
│   │   └── hooks/                   # Custom hooks
│   ├── DATA_FORMAT.md               # Estructura de módulos
│   └── ARCHITECTURE_AUTH.md         # Sistema de auth
│
├── participant-frontend/
│   └── src/
│       ├── pages/                   # Páginas públicas
│       └── components/              # UI para participantes
│
└── database/
    ├── migrations/                  # SQL migrations
    └── README.md                    # DB docs
```

## ⚡ Comandos Rápidos

### Backend

```bash
# Desarrollo local
cd backend
npm run dev              # Puerto 3000

# Deploy a Lambda
npm run deploy

# Migraciones
npm run migrate

# Testing
./test-all-endpoints.sh
```

### Research Frontend

```bash
cd research-frontend
npm run dev              # Puerto 12600
npm run build
npm run preview
```

### Participant Frontend

```bash
cd participant-frontend
npm run dev              # Puerto 5173
npm run build
```

## 🔑 Variables de Entorno Críticas

### Backend (.env)
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=emotioxv3
DB_USER=postgres
DB_PASSWORD=password
AWS_REGION=us-east-1
S3_BUCKET_NAME=emotioxv3-media
```

### Research Frontend (.env)
```bash
VITE_API_URL=http://localhost:3000
VITE_PARTICIPANT_FRONTEND_URL=http://localhost:5173
```

### Participant Frontend (.env)
```bash
VITE_API_URL=http://localhost:3000
```

## 🗺️ Rutas Principales

### Research Frontend
```
/                           → Dashboard
/research                   → Lista de research
/research/:id               → Research builder
/research/:id/settings      → Settings
/research/:id/module/:id    → Editor de módulo
/login                      → Login
/register                   → Registro
```

### Participant Frontend
```
/research/:id              → Participar en research
```

## 📊 Estructura de Datos Crítica

### ComponentConfig (Módulos)

```typescript
interface ComponentConfig {
  id: string;                    // "question-title"
  type: ComponentType;           // "input" | "textarea" | "select" | ...
  label: string;                 // "Título de la pregunta"
  value?: string;                // Valor actual
  
  // Type-specific
  placeholder?: PlaceholderConfig;
  selectRange?: SelectRangeConfig;
  fileUpload?: FileUploadConfig;
  
  settings?: {
    readonly?: boolean;
    defaultValue?: string;
    groupLabel?: string;
  };
}
```

### Module.config (JSONB en DB)

```json
{
  "structure": {
    "components": [
      {
        "id": "question-title",
        "type": "input",
        "label": "Título",
        "value": "¿Cómo fue tu experiencia?"
      }
    ]
  }
}
```

### UploadedFile (S3)

```typescript
interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  s3Key: string;              // "research/uuid/123-image.png"
  mediaId: string;            // UUID from media table
  hitZones?: HitZone[];
  status: 'uploaded' | 'uploading' | 'error';
}
```

## 🎯 Flujos Clave (Simplificado)

### 1. Crear Research
```
Frontend POST /research
  → Backend crea research
  → Backend crea stage "Research Configuration"
  → Backend crea module "Research Configuration"
  → Retorna research con ID
```

### 2. Agregar Stage
```
Frontend POST /stages { stage_template_id }
  → Backend obtiene template
  → Si es Smart VOC: crea 5 módulos automáticamente
  → Si es Cognitive Tasks: crea stage vacío
  → Retorna stage con modules
```

### 3. Guardar Módulo
```
Frontend PUT /modules/:id { config }
  → ⚠️ CRÍTICO: Enviar estructura COMPLETA
  → Backend guarda JSONB en modules.config
  → Retorna module actualizado
```

### 4. Upload a S3
```
1. POST /media/upload → presignedURL
2. PUT presignedURL (directo a S3)
3. POST /media { s3_key, metadata }
4. Guardar s3Key en componentValues
5. Save Changes → guardar referencia en config
```

### 5. Participar
```
1. Scan QR → /research/:id
2. GET /public/research/:id
3. Renderizar stages y modules
4. POST /public/research/:id/responses { answers }
5. Backend guarda en responses + answers
```

### 6. Ver Resultados
```
Frontend GET /analysis/research/:id
  → Backend calcula métricas (NPS, CSAT, etc.)
  → Retorna datos agregados
  → Frontend renderiza gráficos
```

## ⚠️ Anti-Patrones (NUNCA hacer)

```typescript
// ❌ NUNCA: Perder estructura de componentes
await modulesService.update(id, {
  config: { components: componentValues }  // Solo valores
});

// ✅ SIEMPRE: Preservar estructura completa
const updatedComponents = components.map(comp => ({
  ...comp,
  value: componentValues[comp.id]
}));
await modulesService.update(id, {
  config: { structure: { components: updatedComponents } }
});

// ❌ NUNCA: Guardar blob URLs
config: {
  files: [{ url: 'blob:http://...' }]  // No funciona en participant
}

// ✅ SIEMPRE: Guardar s3Keys
config: {
  files: [{ s3Key: 'research/uuid/image.png', mediaId: 'xxx' }]
}

// ❌ NUNCA: Subir en Save Changes
const handleSave = async () => {
  await uploadToS3(files);  // Demora mucho
  await saveModule();
};

// ✅ SIEMPRE: Upload inmediato
const handleFileSelect = async (files) => {
  await uploadToS3(files);  // Al seleccionar
  setFiles(uploadedFiles);
};
```

## 🔍 Debugging Tips

### Research no carga
```typescript
// 1. Verificar autenticación
const token = useAuthStore.getState().token;
console.log('Token:', token);

// 2. Verificar React Query cache
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
console.log(queryClient.getQueryData(['research', id]));

// 3. Verificar backend logs
// CloudWatch → /aws/lambda/emotioxv3-backend-production-api
```

### Módulo no guarda correctamente
```typescript
// 1. Verificar estructura antes de enviar
console.log('Config to save:', JSON.stringify(config, null, 2));

// 2. Verificar que tiene structure.components
if (!config.structure?.components) {
  console.error('Missing components structure!');
}

// 3. Verificar response del backend
const response = await modulesService.update(id, { config });
console.log('Saved module:', response);
```

### S3 upload falla
```typescript
// 1. Verificar presigned URL
console.log('Presigned URL:', uploadUrl);

// 2. Verificar Content-Type
const response = await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }  // ✅ Importante
});

// 3. Verificar s3Key guardado
console.log('S3 Key:', file.s3Key);
console.log('Media ID:', file.mediaId);
```

### Token expired
```typescript
// 1. Verificar refreshToken existe
const refreshToken = useAuthStore.getState().refreshToken;
if (!refreshToken) {
  console.error('No refresh token!');
}

// 2. Forzar refresh manual
const newToken = await cognitoAuth.refreshSession(refreshToken);
useAuthStore.setState({ token: newToken });
```

## 📚 Documentos por Situación

| Situación | Documento |
|-----------|-----------|
| No sé cómo funciona X | [SYSTEM_ARCHITECTURE.md](./.agent/SYSTEM_ARCHITECTURE.md) |
| Necesito implementar flujo Y | [DATA_FLOWS.md](./.agent/DATA_FLOWS.md) |
| ¿Por qué se usa Z? | [TECHNICAL_DECISIONS.md](./.agent/TECHNICAL_DECISIONS.md) |
| ¿Qué envío al endpoint? | [API_REFERENCE.md](./.agent/API_REFERENCE.md) |
| Problema con auth | [ARCHITECTURE_AUTH.md](./research-frontend/ARCHITECTURE_AUTH.md) |
| Problema con módulos | [DATA_FORMAT.md](./research-frontend/DATA_FORMAT.md) |
| Problema con DB | [database/README.md](./database/README.md) |
| Problema con deploy | [DEPLOYMENT.md](./DEPLOYMENT.md) |

## 🎓 Conceptos Clave

### Research
Estudio completo con stages y modules. Creado por investigador.

### Stage
Etapa de un research. Puede ser:
- `single_module`: 1 módulo fijo (Research Configuration)
- `module_collection`: Múltiples módulos (Smart VOC, Cognitive Tasks)

### Module
Cuestionario o tarea con componentes configurables.

### Component
Input, textarea, select, file-upload, etc. Parte de un módulo.

### Template
Plantilla predefinida de stage o module.

### JSONB
Formato de almacenamiento flexible en PostgreSQL para `module.config`.

### Presigned URL
URL temporal de S3 para upload/download sin credenciales.

### React Query
Manejo de server state con cache automático.

### Zustand
Manejo de client state (auth) con persistencia.

## 🚦 Estados de Componentes

### Module Status
```typescript
'draft' | 'published' | 'archived'
```

### Upload Status
```typescript
'uploading' | 'uploaded' | 'error'
```

### Research Status
```typescript
'draft' | 'active' | 'completed' | 'archived'
```

## 📞 URLs Importantes

### Desarrollo
```
Backend:              http://localhost:3000
Research Frontend:    http://localhost:12600
Participant Frontend: http://localhost:5173
```

### Producción
```
Backend:              https://xxx.execute-api.us-east-1.amazonaws.com/production
Research Frontend:    https://xxx.cloudfront.net
Participant Frontend: https://yyy.cloudfront.net
```

## 🔐 Autenticación

### Tokens
```typescript
accessToken   // 24 horas de vida, se renueva automáticamente
refreshToken  // 24 horas, se guarda SIEMPRE (incluso si rememberMe=false)
```

### Flow
```
Login → Cognito → Tokens → Zustand Store → localStorage
↓
Interceptor agrega Bearer token a cada request
↓
Backend valida token con Cognito
```

## 💾 Base de Datos

### Tablas Core
```
enterprises → users → research → stages → modules
                              ↓
                          responses → answers
                              ↓
                            media
```

### Convenciones
- IDs: UUID v4
- Timestamps: `created_at`, `updated_at` (timestamptz)
- Soft delete: `is_active` boolean
- JSONB: `config`, `metadata`

---

**💡 Tip**: Este archivo es tu punto de partida. Para más detalles, consulta los documentos específicos en `.agent/`.
