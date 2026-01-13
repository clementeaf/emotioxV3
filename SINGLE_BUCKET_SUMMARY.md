# ✅ Resumen: Migración con Bucket S3 Único

## 🎯 Decisión: 1 Solo Bucket

Hemos simplificado la arquitectura para usar **1 solo bucket S3** con prefixes (folders) en lugar de 3 buckets separados.

---

## 📦 Antes vs Después

### ❌ Antes (3 Buckets)

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

### ✅ Después (1 Bucket)

```
emotioxv3-production/
  ├── research-frontend/
  │   ├── index.html
  │   ├── assets/
  │   └── runtime-config.json
  ├── participant-frontend/
  │   ├── index.html
  │   ├── assets/
  │   └── runtime-config.json
  └── media/
      ├── videos/
      └── images/
```

---

## ✅ Ventajas

- **-66% complejidad**: 3 → 1 bucket
- **Gestión centralizada**: Una sola configuración
- **Migración más simple**: Un comando para backup/restore
- **Costos más claros**: Todo en un solo lugar
- **Debugging más fácil**: Un solo lugar donde buscar

---

## 📝 Documentación Actualizada

### Nuevos Documentos

1. **[SINGLE_BUCKET_ARCHITECTURE.md](./SINGLE_BUCKET_ARCHITECTURE.md)**
   - Arquitectura completa del bucket único
   - Configuración de CloudFront con Origin Path
   - Políticas de acceso por prefix
   - Comparación antes/después

2. **[WORKFLOWS_UPDATE_SINGLE_BUCKET.md](./WORKFLOWS_UPDATE_SINGLE_BUCKET.md)**
   - Cambios exactos en GitHub Actions workflows
   - Snippets de código actualizados
   - Checklist de implementación

### Scripts Actualizados

- ✅ **`scripts/migration/04-create-s3-buckets.sh`**
  - Ahora crea 1 solo bucket
  - Configura estructura de prefixes
  - Bucket policy con acceso por prefix

---

## 🔧 Cambios Necesarios

### 1. Script de Creación (Ya actualizado)

```bash
./scripts/migration/04-create-s3-buckets.sh
```

Crea: `emotioxv3-production/` con estructura de folders

### 2. GitHub Secrets (Actualizar valores)

```yaml
# Los 3 secrets apuntan al mismo bucket
RESEARCH_FRONTEND_S3_BUCKET: "emotioxv3-production"
PARTICIPANT_FRONTEND_S3_BUCKET: "emotioxv3-production"
S3_BUCKET_NAME: "emotioxv3-production"
```

### 3. Workflows CI/CD (Agregar prefixes)

**Research Frontend** - Agregar 1 línea:
```python
# Cambiar:
s3_path = f"s3://{bucket}/{rel_path}"

# Por:
s3_path = f"s3://{bucket}/research-frontend/{rel_path}"
```

**Participant Frontend** - Agregar 1 línea:
```python
# Cambiar:
s3_path = f"s3://{bucket}/{rel_path}"

# Por:
s3_path = f"s3://{bucket}/participant-frontend/{rel_path}"
```

**Backend Workflow** - Actualizar 2 rutas:
```bash
# runtime-config.json paths con prefixes
aws s3 cp runtime-config.json "s3://${BUCKET}/research-frontend/runtime-config.json"
aws s3 cp runtime-config.json "s3://${BUCKET}/participant-frontend/runtime-config.json"
```

Ver detalles completos en: [WORKFLOWS_UPDATE_SINGLE_BUCKET.md](./WORKFLOWS_UPDATE_SINGLE_BUCKET.md)

### 4. CloudFront Distributions

**Research Frontend**:
```yaml
Origin:
  Domain: emotioxv3-production.s3.us-east-1.amazonaws.com
  Origin Path: /research-frontend  # ← Importante
```

**Participant Frontend**:
```yaml
Origin:
  Domain: emotioxv3-production.s3.us-east-1.amazonaws.com
  Origin Path: /participant-frontend  # ← Importante
```

---

## 🚀 Proceso de Migración Actualizado

### Fase 1: Crear Bucket Único

```bash
./scripts/migration/04-create-s3-buckets.sh
```

Resultado:
- ✅ `emotioxv3-production` creado
- ✅ Estructura de folders inicializada
- ✅ Bucket policy configurada
- ✅ CORS configurado

### Fase 2: Copiar Contenido (si migras desde buckets existentes)

```bash
# Research
aws s3 sync s3://emotioxv3-research-frontend \
  s3://emotioxv3-production/research-frontend \
  --profile cefal

# Participant
aws s3 sync s3://emotioxv3-participant-frontend \
  s3://emotioxv3-production/participant-frontend \
  --profile cefal

# Media (si existe)
aws s3 sync s3://emotioxv3-media-production \
  s3://emotioxv3-production/media \
  --profile cefal
```

### Fase 3: Actualizar CloudFront

Crear distributions con **Origin Path** configurado:
- Research → `/research-frontend`
- Participant → `/participant-frontend`

### Fase 4: Actualizar GitHub Secrets

Todos los secrets de bucket apuntan a: `emotioxv3-production`

### Fase 5: Actualizar Workflows

Agregar prefixes en rutas S3 (ver [WORKFLOWS_UPDATE_SINGLE_BUCKET.md](./WORKFLOWS_UPDATE_SINGLE_BUCKET.md))

### Fase 6: Deploy y Testing

```bash
# Trigger workflows
gh workflow run "Deploy Backend to AWS Lambda"
gh workflow run "Deploy Research Frontend to S3/CloudFront"
gh workflow run "Deploy Participant Frontend to S3/CloudFront"

# Verificar
curl https://research.emotiox.org/runtime-config.json
curl https://participant.emotiox.org/runtime-config.json
```

---

## 📊 Impacto en Documentación

### Documentos Principales - Sin Cambios Necesarios

- ✅ **MIGRATION_PLAN.md**: Conceptualmente igual, solo nombres de buckets
- ✅ **MIGRATION_CHECKLIST.md**: Mismos pasos, menos items de buckets
- ✅ **MIGRATION_CREDENTIALS.md**: Sin cambios
- ✅ **MIGRATION_QUICKSTART.md**: Sin cambios

### Documentos Técnicos - Actualizados

- ✅ **scripts/migration/04-create-s3-buckets.sh**: Reescrito para bucket único
- ✅ **SINGLE_BUCKET_ARCHITECTURE.md**: Nuevo documento completo
- ✅ **WORKFLOWS_UPDATE_SINGLE_BUCKET.md**: Guía de actualización de workflows

---

## 🎯 Ventajas Específicas para Migración

### Durante la Migración

| Aspecto | Antes (3 buckets) | Después (1 bucket) |
|---------|-------------------|-------------------|
| **Crear buckets** | 3 comandos | 1 comando ✅ |
| **Configurar políticas** | 3 políticas | 1 política ✅ |
| **Configurar CORS** | 3 configs | 1 config ✅ |
| **Copiar contenido** | 3 syncs | 1 sync con prefixes ✅ |
| **Backup** | 3 comandos | 1 comando ✅ |

### Post-Migración

| Aspecto | Antes (3 buckets) | Después (1 bucket) |
|---------|-------------------|-------------------|
| **Monitoreo** | 3 lugares | 1 lugar ✅ |
| **Costos** | 3 line items | 1 line item ✅ |
| **Permisos IAM** | 3 resources | 1 resource ✅ |
| **Auditoría** | 3 logs | 1 log ✅ |

### Migraciones Futuras

| Aspecto | Antes (3 buckets) | Después (1 bucket) |
|---------|-------------------|-------------------|
| **Tiempo setup** | ~45 min | ~15 min ✅ |
| **Complejidad** | Alta | Baja ✅ |
| **Probabilidad error** | Media | Baja ✅ |

---

## 📋 Checklist Rápido

### Configuración Inicial
- [ ] Leer [SINGLE_BUCKET_ARCHITECTURE.md](./SINGLE_BUCKET_ARCHITECTURE.md)
- [ ] Ejecutar `./scripts/migration/04-create-s3-buckets.sh`
- [ ] Verificar bucket `emotioxv3-production` creado

### CloudFront
- [ ] Crear research distribution con Origin Path `/research-frontend`
- [ ] Crear participant distribution con Origin Path `/participant-frontend`
- [ ] Configurar aliases y certificados SSL

### GitHub
- [ ] Actualizar 3 secrets de bucket (mismo valor para los 3)
- [ ] Leer [WORKFLOWS_UPDATE_SINGLE_BUCKET.md](./WORKFLOWS_UPDATE_SINGLE_BUCKET.md)
- [ ] Actualizar research workflow (1 línea)
- [ ] Actualizar participant workflow (1 línea)
- [ ] Actualizar backend workflow (2 rutas)

### Testing
- [ ] Deploy workflows
- [ ] Verificar archivos en S3 con prefixes
- [ ] Verificar runtime-config.json accesible
- [ ] Testing funcional completo

---

## 💡 Recomendación

**Proceder con bucket único** para nueva cuenta:
- ✅ Más simple de implementar
- ✅ Más fácil de mantener
- ✅ Mismo costo que 3 buckets
- ✅ Arquitectura más limpia

**No migrar buckets existentes** (si ya funcionan):
- La cuenta actual puede quedarse con 3 buckets
- La nueva cuenta usará 1 bucket
- Ambos funcionan perfectamente

---

## 🚀 Próximos Pasos

1. **Revisar arquitectura**: Leer [SINGLE_BUCKET_ARCHITECTURE.md](./SINGLE_BUCKET_ARCHITECTURE.md)
2. **Comenzar migración**: Seguir [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)
3. **Crear bucket**: Ejecutar script actualizado
4. **Continuar con certificados SSL y Cognito**
5. **Actualizar workflows cuando llegues a esa fase**

---

**Actualizado por**: Claude (Cursor AI)  
**Fecha**: 2026-01-12  
**Versión**: 2.0 (Bucket Único)

**¡Arquitectura simplificada y lista para migración! 🎉**
