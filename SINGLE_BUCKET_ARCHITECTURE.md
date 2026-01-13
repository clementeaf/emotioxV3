# Arquitectura de Bucket S3 Único - EmotioX V3

## 🎯 Estrategia Simplificada

En lugar de usar 3 buckets separados, usamos **1 solo bucket** con prefixes (folders) para organizar el contenido.

---

## 📦 Estructura del Bucket Único

```
emotioxv3-production/
│
├── research-frontend/           # Frontend de investigadores
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   ├── index-[hash].css
│   │   └── ...
│   └── runtime-config.json
│
├── participant-frontend/        # Frontend de participantes
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   ├── index-[hash].css
│   │   └── ...
│   └── runtime-config.json
│
└── media/                       # Archivos de usuarios
    ├── videos/
    │   └── [research_id]/
    │       └── [video_files]
    ├── images/
    │   └── [research_id]/
    │       └── [image_files]
    └── audios/
        └── [research_id]/
            └── [audio_files]
```

---

## ✅ Ventajas del Bucket Único

| Aspecto | Beneficio |
|---------|-----------|
| **Gestión** | Un solo recurso que mantener |
| **Costos** | Más fácil de rastrear y optimizar |
| **Permisos** | Una sola política de bucket |
| **CORS** | Configuración centralizada |
| **Backup** | Un solo comando para todo |
| **Migración** | Copiar un solo bucket |

---

## 🔒 Política de Acceso

### Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadFrontends",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::emotioxv3-production/research-frontend/*",
        "arn:aws:s3:::emotioxv3-production/participant-frontend/*"
      ]
    }
  ]
}
```

**Resultado**:
- ✅ `/research-frontend/*` → Acceso público (via CloudFront)
- ✅ `/participant-frontend/*` → Acceso público (via CloudFront)
- ❌ `/media/*` → Privado (solo backend con IAM)

---

## 🌐 Configuración de CloudFront

### Research Frontend Distribution

```yaml
Origin:
  Domain Name: emotioxv3-production.s3.us-east-1.amazonaws.com
  Origin Path: /research-frontend
  
Origin Access:
  S3 Origin (sin OAI, bucket policy público)
  
Alias (CNAME):
  research.emotiox.org
```

**Resultado**: `https://research.emotiox.org` → `s3://emotioxv3-production/research-frontend/`

### Participant Frontend Distribution

```yaml
Origin:
  Domain Name: emotioxv3-production.s3.us-east-1.amazonaws.com
  Origin Path: /participant-frontend
  
Origin Access:
  S3 Origin (sin OAI, bucket policy público)
  
Alias (CNAME):
  participant.emotiox.org
```

**Resultado**: `https://participant.emotiox.org` → `s3://emotioxv3-production/participant-frontend/`

---

## 🔧 Configuración CORS

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    },
    {
      "AllowedOrigins": [
        "https://research.emotiox.org",
        "https://participant.emotiox.org",
        "http://localhost:5173",
        "http://localhost:5174"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "x-amz-request-id"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

**Primera regla**: GET/HEAD para todos (frontends públicos)  
**Segunda regla**: Todas las operaciones para dominios específicos (media uploads)

---

## 🔑 GitHub Secrets Actualizados

```yaml
# Bucket único para todo
RESEARCH_FRONTEND_S3_BUCKET: "emotioxv3-production"
PARTICIPANT_FRONTEND_S3_BUCKET: "emotioxv3-production"
S3_BUCKET_NAME: "emotioxv3-production"

# CloudFront IDs (generados al crear distributions)
RESEARCH_FRONTEND_CLOUDFRONT_ID: "<cf_distribution_id>"
PARTICIPANT_FRONTEND_CLOUDFRONT_ID: "<cf_distribution_id>"
```

**Nota**: Aunque es el mismo bucket, los workflows usan los mismos nombres de secrets para mantener compatibilidad.

---

## 📤 Deploy de Frontends

### Research Frontend Workflow

```yaml
- name: Deploy to S3
  run: |
    # Deploy con prefix automático via secret
    aws s3 sync dist/ s3://${{ secrets.RESEARCH_FRONTEND_S3_BUCKET }}/research-frontend/ \
      --delete \
      --cache-control "public, max-age=31536000, immutable"
    
    # runtime-config.json sin cache
    aws s3 cp dist/runtime-config.json \
      s3://${{ secrets.RESEARCH_FRONTEND_S3_BUCKET }}/research-frontend/runtime-config.json \
      --content-type "application/json" \
      --cache-control "no-store, max-age=0"
```

### Participant Frontend Workflow

```yaml
- name: Deploy to S3
  run: |
    # Deploy con prefix automático via secret
    aws s3 sync dist/ s3://${{ secrets.PARTICIPANT_FRONTEND_S3_BUCKET }}/participant-frontend/ \
      --delete \
      --cache-control "public, max-age=31536000, immutable"
    
    # runtime-config.json sin cache
    aws s3 cp dist/runtime-config.json \
      s3://${{ secrets.PARTICIPANT_FRONTEND_S3_BUCKET }}/participant-frontend/runtime-config.json \
      --content-type "application/json" \
      --cache-control "no-store, max-age=0"
```

---

## 🔧 Backend (Lambda) Configuración

### IAM Permissions

```yaml
# serverless.yml
provider:
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - s3:PutObject
            - s3:GetObject
            - s3:DeleteObject
          Resource:
            - "arn:aws:s3:::${ssm:/emotioxv3/${self:provider.stage}/S3_BUCKET_NAME}/media/*"
```

### Código Backend

```typescript
// backend/src/config/storage.ts
const BUCKET_NAME = process.env.S3_BUCKET_NAME; // emotioxv3-production
const MEDIA_PREFIX = 'media/'; // Prefix para archivos de usuarios

async function uploadMedia(file: File, researchId: string) {
  const key = `${MEDIA_PREFIX}videos/${researchId}/${file.name}`;
  
  await s3.putObject({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  });
  
  return key;
}
```

---

## 🔄 Migración desde Buckets Múltiples

### Paso 1: Crear Bucket Único

```bash
./scripts/migration/04-create-s3-buckets.sh
```

### Paso 2: Copiar Contenido

```bash
# Copiar research frontend
aws s3 sync s3://emotioxv3-research-frontend \
  s3://emotioxv3-production/research-frontend \
  --profile cefal

# Copiar participant frontend
aws s3 sync s3://emotioxv3-participant-frontend \
  s3://emotioxv3-production/participant-frontend \
  --profile cefal

# Copiar media (si existe)
aws s3 sync s3://emotioxv3-media-production \
  s3://emotioxv3-production/media \
  --profile cefal
```

### Paso 3: Actualizar CloudFront Origins

**Opción A: Crear nuevas distributions** (recomendado)

```bash
# Con Origin Path configurado
Origin Path: /research-frontend
Origin Path: /participant-frontend
```

**Opción B: Actualizar distributions existentes**

```bash
# Actualizar origin domain y path
aws cloudfront update-distribution ...
```

### Paso 4: Actualizar GitHub Secrets

```bash
# Todos apuntan al mismo bucket
RESEARCH_FRONTEND_S3_BUCKET=emotioxv3-production
PARTICIPANT_FRONTEND_S3_BUCKET=emotioxv3-production
S3_BUCKET_NAME=emotioxv3-production
```

### Paso 5: Actualizar Workflows CI/CD

**Los workflows necesitan agregar el prefix en los comandos de sync**:

```diff
- aws s3 sync dist/ s3://${{ secrets.RESEARCH_FRONTEND_S3_BUCKET }}/ --delete
+ aws s3 sync dist/ s3://${{ secrets.RESEARCH_FRONTEND_S3_BUCKET }}/research-frontend/ --delete
```

---

## 📊 Comparación: Antes vs Después

### Antes (3 Buckets)

```
emotioxv3-research-frontend/
  ├── index.html
  └── assets/

emotioxv3-participant-frontend/
  ├── index.html
  └── assets/

emotioxv3-media-production/
  ├── videos/
  └── images/
```

**Configuración**:
- 3 bucket policies
- 3 CORS configurations
- 3 entries en CloudFormation

### Después (1 Bucket)

```
emotioxv3-production/
  ├── research-frontend/
  ├── participant-frontend/
  └── media/
```

**Configuración**:
- 1 bucket policy
- 1 CORS configuration
- 1 entry en CloudFormation

---

## 🎯 Checklist de Migración a Bucket Único

### Preparación
- [ ] Backup de contenido de 3 buckets antiguos
- [ ] Crear bucket único: `emotioxv3-production`
- [ ] Configurar bucket policy con prefixes
- [ ] Configurar CORS

### Migración de Contenido
- [ ] Copiar research-frontend a `/research-frontend/`
- [ ] Copiar participant-frontend a `/participant-frontend/`
- [ ] Copiar media a `/media/`
- [ ] Verificar permisos de archivos

### CloudFront
- [ ] Crear nueva distribution para research con Origin Path
- [ ] Crear nueva distribution para participant con Origin Path
- [ ] Configurar aliases (research/participant.emotiox.org)
- [ ] Configurar certificados SSL
- [ ] Actualizar DNS

### GitHub y CI/CD
- [ ] Actualizar GitHub Secrets (3 secrets → mismo bucket)
- [ ] Actualizar workflow research-frontend (agregar prefix)
- [ ] Actualizar workflow participant-frontend (agregar prefix)
- [ ] Actualizar workflow backend (runtime-config.json con prefixes)

### Backend
- [ ] Actualizar SSM Parameter: `S3_BUCKET_NAME`
- [ ] Verificar código usa prefix `media/`
- [ ] Actualizar IAM permissions con prefix

### Testing
- [ ] Deploy de research frontend
- [ ] Deploy de participant frontend
- [ ] Upload de media desde backend
- [ ] Verificar runtime-config.json carga correctamente
- [ ] Testing completo de flujos

### Cleanup (después de validación)
- [ ] Eliminar buckets antiguos (después de 2+ semanas)

---

## 💡 Consideraciones Importantes

### Cache en CloudFront

Con Origin Path, CloudFront cachea correctamente:
```
https://research.emotiox.org/index.html
  ↓
CloudFront cache key: /index.html
  ↓
S3: emotioxv3-production/research-frontend/index.html
```

### Invalidaciones

```bash
# Invalidar research frontend
aws cloudfront create-invalidation \
  --distribution-id <research_cf_id> \
  --paths "/*"

# CloudFront automáticamente agrega el prefix internamente
# No necesitas invalidar /research-frontend/*
```

### Costos

**Antes** (3 buckets):
- 3 × $0.023/GB storage
- 3 × $0.0004/request

**Después** (1 bucket):
- 1 × $0.023/GB storage
- 1 × $0.0004/request

**Ahorro**: ~0% en storage, pero simplificación administrativa significativa.

---

## 🚀 Beneficios Finales

| Aspecto | Mejora |
|---------|--------|
| **Complejidad** | -66% (3 → 1 bucket) |
| **Gestión** | Centralizada |
| **Migración futura** | Más simple |
| **Debugging** | Más fácil |
| **Costos tracking** | Más claro |
| **Backup** | Un comando |
| **Restore** | Un comando |

---

**Documentado por**: Claude (Cursor AI)  
**Fecha**: 2026-01-12  
**Versión**: 1.0

**¡Arquitectura simplificada y más mantenible! 🎉**
