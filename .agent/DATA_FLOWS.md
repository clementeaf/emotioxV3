# EmotioX v3 - Flujos de Datos Críticos

Este documento detalla los flujos de datos más importantes del sistema, paso a paso.

## 📋 Índice de Flujos

1. [Creación de Research](#1-creación-de-research)
2. [Configuración de Módulos en STAGES](#2-configuración-de-módulos-en-stages)
3. [Guardado de Módulos](#3-guardado-de-módulos)
4. [Subida de Imágenes a S3](#4-subida-de-imágenes-a-s3)
5. [Generación de QR Code](#5-generación-de-qr-code)
6. [Participación de Usuario](#6-participación-de-usuario)
7. [Análisis de Resultados](#7-análisis-de-resultados)
8. [Autenticación y Refresh Token](#8-autenticación-y-refresh-token)

---

## 1. Creación de Research

### Frontend Flow

```typescript
// research-frontend/src/pages/research/CreateResearchPage.tsx

// 1. Usuario llena formulario
const [formData, setFormData] = useState({
  name: '',
  description: '',
  research_type_id: ''
});

// 2. Submit del formulario
const handleSubmit = async () => {
  const response = await researchService.create(formData);
  navigate(`/research/${response.id}`);
};
```

### Backend Flow

```typescript
// backend/src/modules/research/research.service.ts

export const create = async (data, createdBy) => {
  // 1. Validar datos
  if (!data.name) throw new Error('Name required');
  
  // 2. Iniciar transacción
  await client.query('BEGIN');
  
  // 3. Crear research
  const research = await client.query(`
    INSERT INTO research (name, description, created_by)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [data.name, data.description, createdBy]);
  
  // 4. Crear Research Configuration stage (SIEMPRE)
  const configStage = await client.query(`
    INSERT INTO stages (research_id, name, type, order_index)
    VALUES ($1, 'Research Configuration', 'single_module', 0)
    RETURNING *
  `, [research.id]);
  
  // 5. Crear Research Configuration module
  await client.query(`
    INSERT INTO modules (stage_id, name, config)
    VALUES ($1, 'Research Configuration', '{}')
  `, [configStage.id]);
  
  // 6. Commit transacción
  await client.query('COMMIT');
  
  return research;
};
```

### Resultado

```
research
  ├─ id: "uuid-xxx"
  ├─ name: "Mi Estudio"
  └─ stages
       └─ Research Configuration (SIEMPRE presente por defecto)
            └─ Research Configuration module
```

---

## 2. Configuración de Módulos en STAGES

### Carga Inicial de Sidebar

```typescript
// research-frontend/src/components/layout/Sidebar.tsx

// 1. Cargar research con stages y modules
const { data: research } = useResearch(id);

// 2. Renderizar sidebar
{research.stages.map(stage => (
  <div key={stage.id}>
    <h3>{stage.name}</h3>
    {stage.modules.map(module => (
      <Link to={`/research/${id}/module/${module.id}`}>
        {module.name}
      </Link>
    ))}
  </div>
))}
```

### Cuando se agrega nuevo Stage

```typescript
// 1. Usuario click "+ Add Stage"
// 2. Modal muestra stage templates disponibles
const { data: stageTemplates } = useStageTemplates();

// 3. Usuario selecciona template (ej: "Smart VOC")
const handleSelectStage = async (templateId) => {
  // 4. Backend crea stage a partir de template
  await stagesService.create({
    research_id: researchId,
    stage_template_id: templateId
  });
  
  // 5. React Query invalida cache
  queryClient.invalidateQueries(['research', researchId]);
  
  // 6. Sidebar se re-renderiza con nuevo stage
};
```

### Backend: Creación de Stage desde Template

```typescript
// backend/src/modules/stages/stages.service.ts

export const createFromTemplate = async (researchId, templateId) => {
  // 1. Obtener stage template
  const template = await getStageTemplate(templateId);
  
  // 2. Crear stage
  const stage = await pool.query(`
    INSERT INTO stages (research_id, name, type)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [researchId, template.name, template.type]);
  
  // 3. Si es Smart VOC, crear 5 módulos automáticamente
  if (template.name === 'Smart VOC') {
    const smartVocModules = ['CES', 'CSAT', 'NPS', 'NEV', 'CV'];
    
    for (const moduleName of smartVocModules) {
      const moduleTemplate = await getModuleTemplate(moduleName);
      
      await pool.query(`
        INSERT INTO modules (stage_id, name, config)
        VALUES ($1, $2, $3)
      `, [stage.id, moduleName, moduleTemplate.structure]);
    }
  }
  
  // 4. Si es Cognitive Tasks, usuario selecciona módulos
  // (no se crean automáticamente)
  
  return stage;
};
```

---

## 3. Guardado de Módulos

### CRÍTICO: Preservar Estructura de Componentes

```typescript
// research-frontend/src/pages/research/ResearchBuilderPage.tsx

const handleSaveModule = async () => {
  // ❌ INCORRECTO (perdería estructura):
  // await modulesService.update(moduleId, {
  //   config: { components: componentValues }
  // });
  
  // ✅ CORRECTO (preserva estructura):
  const updatedComponents = components.map(comp => ({
    ...comp,  // Preservar toda la estructura
    value: componentValues[comp.id] || comp.value  // Solo actualizar valor
  }));
  
  await modulesService.update(moduleId, {
    config: {
      structure: {
        components: updatedComponents
      }
    }
  });
};
```

### Estructura que se guarda en DB

```json
{
  "structure": {
    "components": [
      {
        "id": "question-title",
        "type": "input",
        "label": "Título de la pregunta",
        "value": "¿Cómo fue tu experiencia?",
        "placeholder": {
          "enabled": true,
          "text": "Escribe aquí..."
        },
        "required": true
      },
      {
        "id": "scale-range",
        "type": "select",
        "label": "Escala",
        "selectRange": {
          "type": "predefined",
          "predefined": "1-10",
          "variant": "slider"
        },
        "settings": {
          "readonly": true,
          "defaultValue": "1-10"
        }
      }
    ]
  }
}
```

### Backend: Update Module

```typescript
// backend/src/modules/modules/modules.service.ts

export const update = async (moduleId, data) => {
  const { config } = data;
  
  const result = await pool.query(`
    UPDATE modules
    SET config = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `, [
    JSON.stringify(config),  // PostgreSQL JSONB
    moduleId
  ]);
  
  return result.rows[0];
};
```

---

## 4. Subida de Imágenes a S3

### Upload Inmediato (NO en Save Changes)

```typescript
// research-frontend/src/components/ui/FileUploadAdvanced.tsx

const uploadFileToS3 = async (file, fileId) => {
  // 1. Solicitar presigned URL
  const { upload_url, s3_key } = await mediaService.generateUploadUrl({
    research_id: researchId,
    file_name: file.name,
    content_type: file.type
  });
  
  // 2. Upload directo a S3
  await fetch(upload_url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });
  
  // 3. Guardar metadata en DB
  const { media } = await mediaService.saveMetadata({
    research_id: researchId,
    s3_key,
    metadata: {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    }
  });
  
  // 4. Retornar información del archivo
  return {
    id: fileId,
    name: file.name,
    s3Key: s3_key,
    mediaId: media.id,
    status: 'uploaded'
  };
};
```

### Backend: Generate Presigned URL

```typescript
// backend/src/modules/media/media.service.ts

export const generateUploadUrl = async (researchId, fileName, contentType) => {
  const key = `research/${researchId}/${Date.now()}-${fileName}`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType
  });
  
  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600  // 1 hora
  });
  
  return {
    uploadUrl,
    key,
    bucket: process.env.S3_BUCKET_NAME
  };
};
```

### Guardar Metadata en DB

```typescript
export const saveMetadata = async (researchId, s3Key, metadata) => {
  const result = await pool.query(`
    INSERT INTO media (research_id, s3_key, file_name, file_type, file_size)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
    researchId,
    s3Key,
    metadata.fileName,
    metadata.fileType,
    metadata.fileSize
  ]);
  
  return result.rows[0];
};
```

### Cuando se hace Save Changes

```typescript
// El componente ya tiene s3Key guardado
const componentValues = {
  'image-upload': JSON.stringify([
    {
      id: 'file-123',
      name: 'logo.png',
      s3Key: 'research/uuid/1234-logo.png',  // ✅ Ya está en S3
      mediaId: 'media-uuid',
      hitZones: [...]
    }
  ])
};

// Save Changes solo guarda la referencia
await modulesService.update(moduleId, {
  config: { structure: { components: updatedComponents } }
});
```

---

## 5. Generación de QR Code

### Frontend: Generar QR

```typescript
// research-frontend/src/components/research/GenerateQRModal.tsx

const generateQR = () => {
  // 1. Obtener URL de participant-frontend (environment-aware)
  const participantUrl = import.meta.env.VITE_PARTICIPANT_FRONTEND_URL;
  
  // 2. Construir URL completa
  const fullUrl = `${participantUrl}/research/${researchId}`;
  
  // 3. Generar QR code usando biblioteca
  QRCode.toDataURL(fullUrl, (err, url) => {
    setQrCodeUrl(url);
  });
};
```

### Environment URLs

```bash
# Local
VITE_PARTICIPANT_FRONTEND_URL=http://localhost:5173

# Production
VITE_PARTICIPANT_FRONTEND_URL=https://d1234abcd.cloudfront.net
```

### Flujo Completo

```
1. Investigador click "Generate QR"
2. Frontend genera QR con URL del participant-frontend
3. Participante escanea QR
4. Se abre: https://participant.emotioxv3.com/research/uuid-xxx
5. Participant-frontend carga research público
```

---

## 6. Participación de Usuario

### Carga de Research Público

```typescript
// participant-frontend/src/pages/ResearchPage.tsx

// 1. Obtener ID del research desde URL
const { id } = useParams();

// 2. Cargar research público (sin auth)
const { data: research } = useQuery({
  queryKey: ['public-research', id],
  queryFn: () => fetch(`/public/research/${id}`).then(r => r.json())
});

// 3. Renderizar stages y modules
{research.stages.map(stage => (
  stage.modules.map(module => (
    <ModuleRenderer module={module} />
  ))
))}
```

### Backend: Endpoint Público

```typescript
// backend/src/modules/research/research.controller.ts

// GET /public/research/:id (SIN AUTENTICACIÓN)
if (path.match(/^\/public\/research\/([^/]+)$/) && httpMethod === 'GET') {
  const id = path.match(/([^/]+)$/)[0];
  
  // 1. Obtener research con stages y modules
  const research = await pool.query(`
    SELECT r.*, 
           json_agg(
             json_build_object(
               'id', s.id,
               'name', s.name,
               'modules', (
                 SELECT json_agg(
                   json_build_object(
                     'id', m.id,
                     'name', m.name,
                     'config', m.config
                   )
                 )
                 FROM modules m
                 WHERE m.stage_id = s.id
               )
             )
           ) as stages
    FROM research r
    LEFT JOIN stages s ON s.research_id = r.id
    WHERE r.id = $1
    GROUP BY r.id
  `, [id]);
  
  return success(research.rows[0]);
}
```

### Submit de Respuestas

```typescript
// participant-frontend/src/pages/ResearchPage.tsx

const handleSubmit = async () => {
  const response = await fetch(`/public/research/${id}/responses`, {
    method: 'POST',
    body: JSON.stringify({
      participant_id: generateParticipantId(),
      answers: answers  // { questionId: value }
    })
  });
};
```

### Backend: Guardar Respuestas

```typescript
// backend/src/modules/research/research.controller.ts

// POST /public/research/:id/responses
export const submitResponse = async (researchId, data) => {
  const { participant_id, answers } = data;
  
  // 1. Crear response
  const response = await pool.query(`
    INSERT INTO responses (research_id, participant_id)
    VALUES ($1, $2)
    RETURNING *
  `, [researchId, participant_id]);
  
  // 2. Guardar cada answer
  for (const [questionId, value] of Object.entries(answers)) {
    await pool.query(`
      INSERT INTO answers (response_id, question_id, value)
      VALUES ($1, $2, $3)
    `, [response.id, questionId, value]);
  }
  
  return response;
};
```

---

## 7. Análisis de Resultados

### Carga de Análisis

```typescript
// research-frontend/src/pages/research/ResultsPage.tsx

const { data: analysis } = useQuery({
  queryKey: ['analysis', researchId],
  queryFn: () => analysisService.getResearchAnalysis(researchId)
});

// Renderizar métricas
<MetricCard
  title="NPS Score"
  value={analysis.nps.score}
  responses={analysis.nps.totalResponses}
/>
```

### Backend: Calcular Métricas

```typescript
// backend/src/modules/analysis/analysis.service.ts

export const calculateNPS = async (researchId) => {
  // 1. Obtener respuestas NPS (0-10)
  const responses = await pool.query(`
    SELECT a.value::integer as score
    FROM answers a
    JOIN questions q ON q.id = a.question_id
    WHERE q.module_id IN (
      SELECT id FROM modules WHERE name = 'Net Promoter Score'
    )
  `);
  
  // 2. Clasificar respuestas
  const promoters = responses.filter(r => r.score >= 9).length;
  const passives = responses.filter(r => r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  
  // 3. Calcular NPS
  const total = responses.length;
  const nps = ((promoters - detractors) / total) * 100;
  
  return {
    score: Math.round(nps),
    totalResponses: total,
    breakdown: { promoters, passives, detractors }
  };
};
```

---

## 8. Autenticación y Refresh Token

### Login Flow

```typescript
// research-frontend/src/stores/auth.store.ts

export const login = async (email, password) => {
  // 1. Llamar a Cognito
  const result = await cognitoAuth.signIn(email, password);
  
  // 2. Extraer tokens
  const accessToken = result.getAccessToken().getJwtToken();
  const refreshToken = result.getRefreshToken().getToken();
  
  // 3. Guardar en Zustand (persisted en localStorage)
  set({
    token: accessToken,
    refreshToken: refreshToken,
    user: userData
  });
};
```

### Auto-Refresh de Token

```typescript
// research-frontend/src/services/api/client.ts

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // 1. Token expiró, intentar refresh
      const refreshToken = useAuthStore.getState().refreshToken;
      
      if (refreshToken) {
        // 2. Renovar token
        const newToken = await cognitoAuth.refreshSession(refreshToken);
        
        // 3. Actualizar store
        useAuthStore.setState({ token: newToken });
        
        // 4. Reintentar request original
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(error.config);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Interceptor para Agregar Token

```typescript
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});
```

---

## 🎯 Puntos Críticos de Datos

### ⚠️ NUNCA hacer:

1. **Perder estructura de componentes** al guardar módulos
2. **Subir archivo en Save Changes** (debe ser inmediato)
3. **Guardar blob URLs** en vez de s3Keys
4. **Olvidar invalidar React Query cache** después de mutations
5. **Exponer endpoints privados** sin autenticación

### ✅ SIEMPRE hacer:

1. **Preservar componentes completos** con todos sus campos
2. **Upload a S3 inmediatamente** al seleccionar archivo
3. **Guardar s3Key y mediaId** en config del módulo
4. **Invalidar cache apropiadamente** para re-fetch
5. **Validar autenticación** en backend para endpoints protegidos
