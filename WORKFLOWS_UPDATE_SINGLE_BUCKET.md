# Actualización de Workflows para Bucket Único

## 🎯 Cambios Necesarios en GitHub Actions

Para usar el bucket único con prefixes, solo necesitas **1 cambio pequeño** en cada workflow de frontend.

---

## 📝 Research Frontend Workflow

### Archivo: `.github/workflows/deploy-research-frontend.yml`

**Cambio en línea ~118**:

```diff
- s3_path = f"s3://{bucket}/{rel_path}"
+ s3_path = f"s3://{bucket}/research-frontend/{rel_path}"
```

### Snippet Completo Actualizado:

```python
# Deploy with optimal Content-Type and Cache-Control headers
python3 << 'PY'
import subprocess
import os

bucket = "${{ secrets.RESEARCH_FRONTEND_S3_BUCKET }}"  # emotioxv3-production
prefix = "research-frontend"  # ← NUEVO: Prefix para research frontend
dist_dir = "dist"

# ... (file_configs sin cambios) ...

# Walk through dist directory and upload with appropriate headers
for root, dirs, files in os.walk(dist_dir):
    for file in files:
        # Skip runtime-config.json as it's handled separately
        if file == 'runtime-config.json':
            continue

        file_path = os.path.join(root, file)
        rel_path = os.path.relpath(file_path, dist_dir)
        config = get_file_config(file_path).copy()

        # Special handling for sw.js - should never be cached
        if file == 'sw.js':
            config['cache_control'] = 'no-cache, no-store, must-revalidate'

        # ← CAMBIO AQUÍ: Agregar prefix
        s3_path = f"s3://{bucket}/{prefix}/{rel_path}"
        
        cmd = [
            'aws', 's3', 'cp', file_path, s3_path,
            '--content-type', config['content_type'],
            '--cache-control', config['cache_control'],
            '--metadata-directive', 'REPLACE'
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error uploading {rel_path}: {result.stderr}")
        else:
            print(f"✓ {prefix}/{rel_path} ({config['cache_control']})")

print(f"✓ All files deployed to {prefix}/ with optimized cache headers")
PY
```

---

## 📝 Participant Frontend Workflow

### Archivo: `.github/workflows/deploy-participant-frontend.yml`

**Cambios idénticos pero con prefix diferente**:

```diff
- s3_path = f"s3://{bucket}/{rel_path}"
+ s3_path = f"s3://{bucket}/participant-frontend/{rel_path}"
```

### Snippet Completo Actualizado:

```python
# Deploy with optimal Content-Type and Cache-Control headers
python3 << 'PY'
import subprocess
import os

bucket = "${{ secrets.PARTICIPANT_FRONTEND_S3_BUCKET }}"  # emotioxv3-production
prefix = "participant-frontend"  # ← NUEVO: Prefix para participant frontend
dist_dir = "dist"

# ... (file_configs sin cambios) ...

# Walk through dist directory and upload with appropriate headers
for root, dirs, files in os.walk(dist_dir):
    for file in files:
        file_path = os.path.join(root, file)
        rel_path = os.path.relpath(file_path, dist_dir)
        config = get_file_config(file_path).copy()

        # Special handling for sw.js - should never be cached
        if file == 'sw.js':
            config['cache_control'] = 'no-cache, no-store, must-revalidate'
        
        # Special handling for runtime-config.json - should never be cached
        if file == 'runtime-config.json':
            config['cache_control'] = 'no-cache, no-store, must-revalidate'
            config['content_type'] = 'application/json'

        # ← CAMBIO AQUÍ: Agregar prefix
        s3_path = f"s3://{bucket}/{prefix}/{rel_path}"
        
        cmd = [
            'aws', 's3', 'cp', file_path, s3_path,
            '--content-type', config['content_type'],
            '--cache-control', config['cache_control'],
            '--metadata-directive', 'REPLACE'
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error uploading {rel_path}: {result.stderr}")
        else:
            print(f"✓ {prefix}/{rel_path} ({config['cache_control']})")

print(f"✓ All files deployed to {prefix}/ with optimized cache headers")
PY
```

---

## 📝 Backend Workflow (runtime-config.json)

### Archivo: `.github/workflows/deploy-backend.yml`

**Actualizar sección de publicación de runtime-config.json** (línea ~277-285):

```diff
  echo "Uploading runtime-config.json to frontend buckets..."
- aws s3 cp runtime-config.json "s3://${RESEARCH_FRONTEND_S3_BUCKET}/runtime-config.json" \
+ aws s3 cp runtime-config.json "s3://${RESEARCH_FRONTEND_S3_BUCKET}/research-frontend/runtime-config.json" \
    --content-type "application/json" \
    --cache-control "no-store, max-age=0" \
    --metadata-directive REPLACE
    
- aws s3 cp runtime-config.json "s3://${PARTICIPANT_FRONTEND_S3_BUCKET}/runtime-config.json" \
+ aws s3 cp runtime-config.json "s3://${PARTICIPANT_FRONTEND_S3_BUCKET}/participant-frontend/runtime-config.json" \
    --content-type "application/json" \
    --cache-control "no-store, max-age=0" \
    --metadata-directive REPLACE
```

**Actualizar invalidaciones de CloudFront** (línea ~287-292):

```bash
if [ -n "${RESEARCH_FRONTEND_CLOUDFRONT_ID:-}" ]; then
  # CloudFront automáticamente usa Origin Path, invalidar rutas relativas
  aws cloudfront create-invalidation \
    --distribution-id "${RESEARCH_FRONTEND_CLOUDFRONT_ID}" \
    --paths "/runtime-config.json"  # ← No cambiar, CloudFront maneja el prefix
fi

if [ -n "${PARTICIPANT_FRONTEND_CLOUDFRONT_ID:-}" ]; then
  aws cloudfront create-invalidation \
    --distribution-id "${PARTICIPANT_FRONTEND_CLOUDFRONT_ID}" \
    --paths "/runtime-config.json"  # ← No cambiar, CloudFront maneja el prefix
fi
```

**Nota**: CloudFront invalidations usan rutas **relativas al Origin Path**, no necesitas agregar el prefix.

---

## 🔑 GitHub Secrets - Sin Cambios Reales

Los nombres de secrets se mantienen igual, solo sus valores:

```yaml
# ANTES (buckets diferentes)
RESEARCH_FRONTEND_S3_BUCKET: "emotioxv3-research-frontend-new"
PARTICIPANT_FRONTEND_S3_BUCKET: "emotioxv3-participant-frontend-new"
S3_BUCKET_NAME: "emotioxv3-media-production"

# DESPUÉS (bucket único)
RESEARCH_FRONTEND_S3_BUCKET: "emotioxv3-production"
PARTICIPANT_FRONTEND_S3_BUCKET: "emotioxv3-production"
S3_BUCKET_NAME: "emotioxv3-production"
```

**Ventaja**: Los workflows siguen funcionando, solo cambian las rutas internas.

---

## 📋 Checklist de Cambios

### Research Frontend Workflow
- [ ] Agregar variable `prefix = "research-frontend"`
- [ ] Cambiar `s3_path` para incluir prefix
- [ ] Actualizar mensaje de éxito con prefix
- [ ] Commit y push

### Participant Frontend Workflow
- [ ] Agregar variable `prefix = "participant-frontend"`
- [ ] Cambiar `s3_path` para incluir prefix
- [ ] Actualizar mensaje de éxito con prefix
- [ ] Commit y push

### Backend Workflow
- [ ] Actualizar ruta de upload de runtime-config.json (research)
- [ ] Actualizar ruta de upload de runtime-config.json (participant)
- [ ] Verificar invalidaciones de CloudFront (sin cambios)
- [ ] Commit y push

### GitHub Secrets
- [ ] Actualizar `RESEARCH_FRONTEND_S3_BUCKET`
- [ ] Actualizar `PARTICIPANT_FRONTEND_S3_BUCKET`
- [ ] Actualizar `S3_BUCKET_NAME`

### Testing
- [ ] Trigger workflow de research frontend manualmente
- [ ] Verificar archivos en `s3://emotioxv3-production/research-frontend/`
- [ ] Trigger workflow de participant frontend manualmente
- [ ] Verificar archivos en `s3://emotioxv3-production/participant-frontend/`
- [ ] Trigger workflow de backend
- [ ] Verificar runtime-config.json en ambos prefixes

---

## 🧪 Testing Post-Deploy

### Verificar estructura en S3

```bash
# Listar research frontend
aws s3 ls s3://emotioxv3-production/research-frontend/ --recursive | head -20

# Listar participant frontend
aws s3 ls s3://emotioxv3-production/participant-frontend/ --recursive | head -20

# Verificar runtime-config.json
aws s3 cp s3://emotioxv3-production/research-frontend/runtime-config.json - | jq
aws s3 cp s3://emotioxv3-production/participant-frontend/runtime-config.json - | jq
```

### Verificar en navegador

```bash
# Research frontend (después de CloudFront propagation)
curl https://research.emotiox.org/runtime-config.json

# Participant frontend
curl https://participant.emotiox.org/runtime-config.json
```

---

## 🔄 Rollback Plan

Si algo sale mal:

1. **Revertir cambios en workflows**:
   ```bash
   git revert <commit_hash>
   git push
   ```

2. **Cambiar GitHub Secrets a buckets antiguos**:
   ```
   RESEARCH_FRONTEND_S3_BUCKET: "emotioxv3-research-frontend"
   PARTICIPANT_FRONTEND_S3_BUCKET: "emotioxv3-participant-frontend"
   ```

3. **Trigger workflows** para re-deploy a buckets antiguos

---

## 💡 Mejoras Opcionales

### Opción 1: Variable de Entorno para Prefix

```yaml
env:
  S3_PREFIX: "research-frontend"  # En workflow settings
  
# Luego en Python
prefix = os.environ.get("S3_PREFIX", "")
```

### Opción 2: Reusable Workflow

Crear `.github/workflows/deploy-frontend-template.yml`:

```yaml
name: Deploy Frontend Template

on:
  workflow_call:
    inputs:
      frontend_name:
        required: true
        type: string
      s3_prefix:
        required: true
        type: string
      bucket_secret_name:
        required: true
        type: string
      cloudfront_id_secret_name:
        required: true
        type: string
```

Luego usar desde research y participant workflows.

---

## ✅ Resumen

**Cambios mínimos necesarios**:
1. ✏️ Agregar prefix en 2 líneas de código (research workflow)
2. ✏️ Agregar prefix en 2 líneas de código (participant workflow)
3. ✏️ Actualizar 2 rutas en backend workflow
4. 🔑 Actualizar 3 GitHub Secrets (mismo nombre, nuevo valor)

**Resultado**:
- ✅ Bucket único funcionando
- ✅ Misma funcionalidad
- ✅ Más simple de mantener

---

**Documentado por**: Claude (Cursor AI)  
**Fecha**: 2026-01-12  
**Versión**: 1.0
