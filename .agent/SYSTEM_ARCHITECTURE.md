# EmotioX v3 - Arquitectura del Sistema

## 🏗️ Visión General de Alto Nivel

EmotioX v3 es una plataforma de investigación UX/emocional que permite a investigadores crear, distribuir y analizar estudios con participantes. El sistema está compuesto por 3 aplicaciones principales que trabajan juntas.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SISTEMA EMOTIOX V3                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────────┐         ┌───────────────────────────────────┐     │
│  │  RESEARCH-FRONTEND   │         │    PARTICIPANT-FRONTEND           │     │
│  │  (Investigadores)    │         │    (Participantes)                │     │
│  ├──────────────────────┤         ├───────────────────────────────────┤     │
│  │ - Crear estudios     │         │ - Ver QR code                     │     │
│  │ - Configurar módulos │         │ - Participar en estudios          │     │
│  │ - Analizar resultados│         │ - Responder preguntas             │     │
│  │ - Gestionar usuarios │         │ - Interactuar con módulos         │     │
│  └──────────┬───────────┘         └──────────────┬────────────────────┘     │
│             │                                     │                          │
│             └─────────────┬───────────────────────┘                          │
│                           │                                                  │
│                    ┌──────▼──────┐                                           │
│                    │   BACKEND   │                                           │
│                    │  (AWS Lambda)│                                           │
│                    ├─────────────┤                                           │
│                    │ - API REST  │                                           │
│                    │ - Auth      │                                           │
│                    │ - Business  │                                           │
│                    │ - S3 Media  │                                           │
│                    └──────┬──────┘                                           │
│                           │                                                  │
│              ┌────────────┼────────────┐                                     │
│              │            │            │                                     │
│       ┌──────▼─────┐ ┌───▼────┐ ┌────▼────┐                                │
│       │ PostgreSQL │ │   S3   │ │ Cognito │                                │
│       │    (RDS)   │ │ Media  │ │  Auth   │                                │
│       └────────────┘ └────────┘ └─────────┘                                │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📁 Estructura de Monorepo

```
emotioxV3/
├── backend/                      # API serverless (Node.js + TypeScript)
│   ├── src/
│   │   ├── modules/             # Módulos de negocio
│   │   ├── config/              # Configuración (DB, S3, etc)
│   │   ├── utils/               # Utilidades compartidas
│   │   └── handler.ts           # Entry point Lambda
│   ├── scripts/                 # Scripts de seed/setup
│   └── serverless.yml           # Config de deploy
│
├── research-frontend/           # App para investigadores (Vite + React)
│   ├── src/
│   │   ├── pages/              # Páginas de la app
│   │   ├── components/         # Componentes reutilizables
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # API clients
│   │   ├── stores/             # Estado global (Zustand)
│   │   └── types/              # TypeScript types
│   └── vite.config.ts
│
├── participant-frontend/        # App para participantes (Vite + React)
│   ├── src/
│   │   ├── pages/              # Páginas públicas
│   │   ├── components/         # Componentes del participante
│   │   ├── hooks/              # Custom hooks
│   │   └── services/           # API clients
│   └── vite.config.ts
│
├── database/                    # Migraciones SQL
│   ├── migrations/             # Archivos .sql ordenados
│   └── README.md
│
├── .github/                     # CI/CD workflows
│   └── workflows/
│       ├── deploy-backend.yml
│       ├── deploy-research.yml
│       └── deploy-participant.yml
│
└── scripts/                     # Scripts de setup/deploy
    ├── setup-aws-infrastructure.sh
    └── setup-cognito.sh
```

## 🔄 Flujo de Datos Principal

### 1. Creación de Estudio (Research Flow)

```
INVESTIGADOR → Research Frontend → Backend → PostgreSQL
                                         ↓
                                    S3 (imágenes)
```

**Pasos:**
1. Investigador crea research en UI
2. Research-frontend envía `POST /research`
3. Backend crea registro en `research` table
4. Backend crea stages y modules asociados
5. Backend retorna research ID
6. Frontend muestra builder con STAGES

### 2. Participación (Participant Flow)

```
PARTICIPANTE → Scan QR → Participant Frontend → Backend → PostgreSQL
                                                       ↓
                                                 Guardar respuestas
```

**Pasos:**
1. Participante escanea QR code
2. Participant-frontend carga `GET /public/research/:id`
3. Backend retorna research con stages y modules
4. Participante completa módulos
5. Frontend envía `POST /public/research/:id/responses`
6. Backend guarda respuestas en `responses` table

### 3. Análisis de Resultados

```
INVESTIGADOR → Research Frontend → Backend → PostgreSQL
                                         ↓
                                  Análisis de datos
```

**Pasos:**
1. Investigador abre RESULTS en sidebar
2. Frontend carga `GET /analysis/research/:id`
3. Backend calcula métricas (NPS, CSAT, etc.)
4. Backend retorna datos agregados
5. Frontend renderiza gráficos y tablas

## 🔐 Sistema de Autenticación

### Cognito vs Session-based

El sistema usa **AWS Cognito** para autenticación:

```
┌──────────────┐      ┌──────────┐      ┌──────────┐
│   Frontend   │─────▶│  Cognito │─────▶│  Backend │
│  (Zustand)   │◀─────│   Pool   │◀─────│  (Verify)│
└──────────────┘      └──────────┘      └──────────┘
        │
        ▼
  localStorage
  (accessToken)
  (refreshToken)
```

**Flujo de Login:**
1. Usuario ingresa email/password
2. Frontend llama a Cognito SDK
3. Cognito retorna accessToken + refreshToken
4. Frontend guarda tokens en Zustand store (persisted)
5. Interceptor de Axios agrega `Authorization: Bearer {token}` a cada request
6. Backend valida token con Cognito en cada request protegido

**Refresh Token:**
- AccessToken expira en 1 hora
- RefreshToken expira en 30 días
- Frontend auto-renueva token antes de expirar

Ver detalles en: [`research-frontend/ARCHITECTURE_AUTH.md`](../research-frontend/ARCHITECTURE_AUTH.md)

## 📊 Modelo de Datos Core

### Jerarquía Principal

```
Enterprise (Cliente/Organización)
    │
    └─▶ User (Investigador/Admin)
          │
          └─▶ Research (Estudio)
                │
                ├─▶ Stage (Etapa del estudio)
                │     │
                │     └─▶ Module (Cuestionario/Tarea)
                │           │
                │           └─▶ Question (Pregunta individual)
                │
                └─▶ Response (Respuesta de participante)
                      │
                      └─▶ Answer (Respuesta a pregunta específica)
```

### Tablas Principales

| Tabla | Descripción | Claves Importantes |
|-------|-------------|-------------------|
| `enterprises` | Organizaciones clientes | `id`, `name` |
| `users` | Investigadores/admins | `id`, `email`, `enterprise_id` |
| `research` | Estudios de investigación | `id`, `name`, `created_by` |
| `stages` | Etapas de un research | `id`, `research_id`, `type` |
| `modules` | Módulos/cuestionarios | `id`, `stage_id`, `config` |
| `questions` | Preguntas (legacy) | `id`, `module_id`, `type` |
| `responses` | Respuesta de participante | `id`, `research_id`, `participant_id` |
| `answers` | Respuesta a pregunta | `id`, `response_id`, `question_id`, `value` |
| `media` | Archivos subidos a S3 | `id`, `s3_key`, `research_id` |
| `stage_templates` | Plantillas de stages | `id`, `name`, `type` |
| `module_templates` | Plantillas de módulos | `id`, `name`, `structure` |

Ver migraciones en: [`database/migrations/`](../database/migrations/)

## 🎨 Sistema de Módulos

### Módulo = Componente Configurable

Cada módulo está compuesto de **componentes** (ComponentConfig):

```typescript
interface ComponentConfig {
  id: string;
  type: 'input' | 'textarea' | 'select' | 'file-upload' | 'radio' | 'checkbox';
  label: string;
  value?: string;
  placeholder?: { enabled: boolean; text: string };
  fileUpload?: {
    maxSizeMB: number;
    acceptedFormats: string[];
    allowHitZones?: boolean;
  };
  // ... más configuraciones
}
```

### Tipos de Módulos

1. **SmartVOC** - 5 módulos de análisis emocional:
   - Customer Effort Score (CES)
   - Customer Satisfaction (CSAT)
   - Net Promoter Score (NPS)
   - Net Emotional Value (NEV)
   - Cognitive Value (CV)

2. **Cognitive Tasks** - 8 tareas cognitivas:
   - Short Text, Long Text, Single Choice
   - Multiple Choice, Linear Scale, Ranking
   - Navigation Flow, Preference Test

3. **Custom Modules** - Creados por usuarios

### Almacenamiento de Config

```json
{
  "structure": {
    "components": [
      {
        "id": "question-title",
        "type": "input",
        "label": "Título de la pregunta",
        "value": "¿Qué tan satisfecho estás?"
      },
      {
        "id": "scale-range",
        "type": "select",
        "label": "Escala",
        "selectRange": {
          "type": "predefined",
          "predefined": "1-10"
        }
      }
    ]
  }
}
```

Este JSON se guarda en `modules.config` (JSONB en PostgreSQL).

## 📤 Sistema de Subida de Archivos (S3)

### Flujo de Upload con Presigned URL

```
┌──────────┐     ┌─────────┐     ┌─────┐     ┌──────────┐
│ Frontend │────▶│ Backend │────▶│ S3  │────▶│PostgreSQL│
└──────────┘     └─────────┘     └─────┘     └──────────┘
     │               │              │              │
     │ 1. Request    │              │              │
     │  presignedURL │              │              │
     ├──────────────▶│              │              │
     │               │ 2. Generate  │              │
     │               │   presigned  │              │
     │               ├─────────────▶│              │
     │               │              │              │
     │               │◀─────────────┤              │
     │◀──────────────┤ 3. Return URL│              │
     │               │              │              │
     │ 4. Upload file directly     │              │
     ├─────────────────────────────▶│              │
     │               │              │              │
     │ 5. Save metadata            │              │
     ├──────────────▶│              │              │
     │               │ 6. Store s3_key            │
     │               ├───────────────────────────▶│
     │               │              │              │
```

**Endpoints:**
- `POST /media/upload` - Genera presigned URL
- `POST /media` - Guarda metadata (s3_key, research_id, etc.)

**Componentes que usan S3:**
- Navigation Flow (con hitzones)
- Preference Test

Ver detalles en: [`.agent/IMAGE_UPLOAD_FLOW.md`](./IMAGE_UPLOAD_FLOW.md)

## 🚀 Deployment

### Ambientes

| Ambiente | URL | Descripción |
|----------|-----|-------------|
| **Local** | `localhost:12600` | Desarrollo local |
| **Production** | CloudFront URLs | AWS Lambda + S3 + CloudFront |

### Stack de Producción

- **Backend**: AWS Lambda (Node.js 20) + API Gateway
- **Database**: RDS PostgreSQL
- **Frontend**: S3 + CloudFront
- **Media Storage**: S3 bucket
- **Auth**: AWS Cognito

Ver detalles completos en: [`DEPLOYMENT.md`](../DEPLOYMENT.md)

## 🔧 Tecnologías Clave

### Backend
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Express (serverless-http wrapper)
- **Database**: PostgreSQL (node-postgres)
- **Deployment**: Serverless Framework
- **Storage**: AWS S3 SDK

### Frontend (research-frontend)
- **Build Tool**: Vite
- **Framework**: React 18 + TypeScript
- **Routing**: React Router v6
- **State Management**: Zustand (auth) + React Query (server state)
- **Styling**: TailwindCSS
- **Charts**: Recharts

### Frontend (participant-frontend)
- **Build Tool**: Vite
- **Framework**: React 18 + TypeScript
- **Routing**: React Router v6
- **Styling**: TailwindCSS

## 📝 Convenciones de Código

### Naming Conventions

- **Variables/Functions**: camelCase (`getUserById`, `researchId`)
- **Components**: PascalCase (`ResearchCard`, `ModuleEditor`)
- **Files**: kebab-case (`research-card.tsx`, `module-editor.tsx`)
- **Types/Interfaces**: PascalCase (`Research`, `ModuleConfig`)
- **Constants**: UPPER_SNAKE_CASE (`API_URL`, `MAX_FILE_SIZE`)

### Imports Order

```typescript
// 1. External libraries
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internal utilities
import { cn } from '../../lib/utils';

// 3. Services
import { researchService } from '../../services/research.service';

// 4. Components
import { Button } from '../ui/Button';

// 5. Types
import type { Research } from '../../types';
```

### File Structure Pattern

```typescript
// 1. Imports
import ...

// 2. Types/Interfaces
interface Props { ... }

// 3. Constants
const MAX_ITEMS = 10;

// 4. Component
export const MyComponent = ({ ... }: Props) => {
  // 4a. Hooks
  const [state, setState] = useState();
  
  // 4b. Effects
  useEffect(() => { ... }, []);
  
  // 4c. Handlers
  const handleClick = () => { ... };
  
  // 4d. Render
  return (...)
};
```

## 🎯 Próximos Pasos Recomendados

1. **Testing**: Implementar tests unitarios y de integración
2. **Monitoring**: CloudWatch dashboards y alertas
3. **Analytics**: Tracking de eventos en frontend
4. **Performance**: Implementar CDN para assets estáticos
5. **Security**: Auditoría de seguridad y penetration testing
