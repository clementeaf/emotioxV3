# Estrategia de Nombres para Migración EmotioX V3

## 🎯 Objetivo

Asegurar comunicación dinámica entre aplicaciones durante y después de la migración, sin URLs hardcodeadas.

---

## 🔄 Arquitectura de Comunicación Dinámica

### Flujo Actual (Correcto y Mantenido)

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions Workflow (Backend Deploy)                  │
│  ─────────────────────────────────────────────────────────  │
│  1. Deploy backend a Lambda                                 │
│  2. Detectar API URL:                                       │
│     - Custom domain: api.emotiox.org ✅                     │
│     - Fallback: API Gateway URL                             │
│  3. Detectar CloudFront domains desde GitHub Secrets        │
│  4. Generar runtime-config.json dinámicamente               │
│  5. Publicar a ambos frontends S3                           │
│  6. Invalidar cache de CloudFront                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  runtime-config.json (Generado Dinámicamente)               │
│  ─────────────────────────────────────────────────────────  │
│  {                                                          │
│    "apiBaseUrl": "<detectado_automaticamente>",            │
│    "researchBaseUrl": "<cloudfront_domain>",               │
│    "participantBaseUrl": "<cloudfront_domain>"             │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────┬──────────────────────────────────────┐
│  Research Frontend   │  Participant Frontend                │
│  ──────────────────  │  ───────────────────────────────     │
│  Carga al inicio:    │  Carga al inicio:                    │
│  fetch('/runtime-    │  fetch('/runtime-                    │
│    config.json')     │    config.json')                     │
│                      │                                      │
│  ✅ Sin URLs         │  ✅ Sin URLs                         │
│     hardcodeadas     │     hardcodeadas                     │
└──────────────────────┴──────────────────────────────────────┘
```

**Ventajas**:
- ✅ Totalmente dinámico
- ✅ Funciona en cualquier cuenta AWS
- ✅ Se adapta a cambios de infraestructura
- ✅ No requiere rebuild de frontends al cambiar backend
- ✅ Soporta custom domains y AWS URLs

---

## 📝 Estrategia de Nombres de Recursos

### Opción A: Nombres con Sufijo Temporal (Recomendado para Migración)

**Durante la migración** usar nombres distintos para permitir rollback:

```yaml
# Nueva Cuenta AWS
Buckets S3:
  - emotioxv3-research-frontend-new
  - emotioxv3-participant-frontend-new
  - emotioxv3-media-production

CloudFront:
  - (IDs generados automáticamente por AWS)
  
Lambda Stack:
  - emotioxv3-backend-production  # Mismo nombre, cuenta diferente
```

**Después de validar (2+ semanas)**, opciones:
1. **Mantener nombres nuevos**: Funciona perfecto, solo actualizar GitHub Secrets
2. **Renombrar buckets**: Crear buckets con nombres originales, copiar contenido, actualizar CloudFront origins

### Opción B: Usar Nombres Originales Directamente

**Ventaja**: No necesita cambios posteriores  
**Desventaja**: No hay rollback fácil si algo falla

```yaml
# Nueva Cuenta AWS (nombres idénticos)
Buckets S3:
  - emotioxv3-research-frontend
  - emotioxv3-participant-frontend
  - emotioxv3-media-production
```

---

## 🔑 GitHub Secrets - Puntos de Configuración

Los siguientes secrets **son los únicos puntos de configuración** que conectan todo:

### Secrets a Actualizar en GitHub

```yaml
# AWS Credentials (Nueva Cuenta)
AWS_ACCESS_KEY_ID: "YOUR_AWS_ACCESS_KEY_ID_HERE"
AWS_SECRET_ACCESS_KEY: "YOUR_AWS_SECRET_ACCESS_KEY_HERE"
AWS_REGION: "us-east-1"

# Frontend Buckets (Nombres en nueva cuenta)
RESEARCH_FRONTEND_S3_BUCKET: "emotioxv3-research-frontend-new"  # ← Ajustar según estrategia
PARTICIPANT_FRONTEND_S3_BUCKET: "emotioxv3-participant-frontend-new"  # ← Ajustar según estrategia

# CloudFront IDs (Nuevos IDs generados)
RESEARCH_FRONTEND_CLOUDFRONT_ID: "<nuevo_cf_id>"
PARTICIPANT_FRONTEND_CLOUDFRONT_ID: "<nuevo_cf_id>"

# Base de Datos (Puede mantenerse igual si usas Neon)
DB_HOST: "<db_host>"
DB_PORT: "5432"
DB_NAME: "emotioxv3"
DB_USER: "<db_user>"
DB_PASSWORD: "<db_password>"
DB_SSL: "true"

# Cognito (Nuevos IDs)
COGNITO_USER_POOL_ID: "<nuevo_pool_id>"
COGNITO_CLIENT_ID: "<nuevo_client_id>"

# Otros
S3_BUCKET_NAME: "emotioxv3-media-production"
CORS_ORIGIN: "https://research.emotiox.org"
VITE_PARTICIPANT_FRONTEND_URL: "https://participant.emotiox.org"
```

### 🎯 Lo Importante

**Una vez actualizados estos secrets**, el workflow de backend generará automáticamente el `runtime-config.json` correcto con:
- API URL de la nueva cuenta
- CloudFront domains de la nueva cuenta
- Todo enlazado dinámicamente

---

## 🔄 Proceso de Migración con Nombres

### Fase 1: Migración con Nombres Temporales

1. **Crear recursos con sufijo `-new`**:
   ```bash
   aws s3 mb s3://emotioxv3-research-frontend-new --profile cefal
   aws s3 mb s3://emotioxv3-participant-frontend-new --profile cefal
   ```

2. **Crear CloudFront distributions** apuntando a nuevos buckets

3. **Actualizar GitHub Secrets** con nuevos nombres e IDs

4. **Trigger workflow de backend**:
   ```bash
   gh workflow run "Deploy Backend to AWS Lambda"
   ```
   → Genera `runtime-config.json` con nueva infraestructura

5. **DNS mantiene dominios originales**:
   - `research.emotiox.org` → Nueva CloudFront distribution
   - `participant.emotiox.org` → Nueva CloudFront distribution
   - `api.emotiox.org` → Nueva API Gateway

6. **Usuarios ven las mismas URLs**, pero infraestructura es nueva

### Fase 2: Validación (1-2 semanas)

- Monitorear que todo funciona correctamente
- Verificar logs, métricas, costos
- Confirmar que no hay problemas

### Fase 3: Consolidación (Opcional)

Si quieres usar nombres originales:

1. **Crear buckets con nombres originales**:
   ```bash
   aws s3 mb s3://emotioxv3-research-frontend --profile cefal
   aws s3 mb s3://emotioxv3-participant-frontend --profile cefal
   ```

2. **Copiar contenido**:
   ```bash
   aws s3 sync s3://emotioxv3-research-frontend-new s3://emotioxv3-research-frontend --profile cefal
   aws s3 sync s3://emotioxv3-participant-frontend-new s3://emotioxv3-participant-frontend --profile cefal
   ```

3. **Actualizar CloudFront origins** para apuntar a nuevos buckets

4. **Actualizar GitHub Secrets** con nombres finales

5. **Eliminar buckets temporales** (`-new`)

**O simplemente mantener nombres nuevos** - funciona exactamente igual.

---

## 🚀 Reusabilidad para Futuras Migraciones

### ¿Este proceso sirve para migrar a OTRA cuenta nueva en el futuro?

**✅ SÍ, absolutamente**

### Componentes Portables (Sin cambios)

- ✅ **Código fuente**: Backend y frontends son idénticos
- ✅ **Workflows CI/CD**: Funcionan en cualquier cuenta
- ✅ **Arquitectura de comunicación dinámica**: runtime-config.json
- ✅ **Base de datos**: Puede ser externa (Neon) o migrada

### Componentes a Recrear (Por cuenta AWS)

- 🔄 **Certificados SSL**: Solicitar nuevamente en ACM
- 🔄 **Cognito User Pool**: Crear nuevo (o migrar usuarios)
- 🔄 **CloudFront**: Crear nuevas distributions
- 🔄 **Lambda/API Gateway**: Deploy con Serverless Framework
- 🔄 **SSM Parameters**: Recrear en nueva cuenta
- 🔄 **Buckets S3**: Crear y copiar contenido

### Componentes a Actualizar (Configuración)

- 📝 **GitHub Secrets**: Actualizar con IDs de nueva cuenta
- 📝 **DNS**: Apuntar a nueva infraestructura (si aplica)
- 📝 **Google OAuth**: Agregar nuevo Cognito domain a redirect URIs

### Tiempo Estimado para Migración Futura

Con esta experiencia y documentación:
- **Primera migración** (actual): 8-12 horas
- **Segunda migración** (futura): 4-6 horas
- **Tercera migración** (futura): 2-4 horas

**Razón**: Ya sabes el proceso, tienes scripts, documentación y experiencia.

---

## 📋 Checklist de Portabilidad

Para que el ecosistema sea fácilmente migrable a cualquier cuenta AWS:

### ✅ Ya Implementado

- [x] Comunicación dinámica via runtime-config.json
- [x] Workflows CI/CD parametrizados con GitHub Secrets
- [x] Custom domains estables (no cambian)
- [x] Serverless Framework para infraestructura como código
- [x] SSM Parameter Store para configuración
- [x] Scripts de migración documentados

### 🔄 Recomendaciones Adicionales

- [ ] **Terraform o CloudFormation templates** para recursos (opcional)
  - Actualmente usas Serverless Framework (suficiente)
  - Podrías agregar IaC para Cognito, CloudFront, S3

- [ ] **Backup automático de Cognito users**
  - Script para exportar usuarios regularmente
  - Facilita migración de usuarios entre cuentas

- [ ] **Documentar versiones de certificados SSL**
  - Mantener registro de ARNs de certificados
  - Facilita actualización en serverless.yml

- [ ] **Automatizar creación de CloudFront distributions**
  - Actualmente es manual
  - Podría ser script o Terraform

---

## 🎯 Respuesta a Tus Preguntas

### 1. ¿La migración considera generación dinámica de nombres?

**✅ SÍ**

- El workflow de backend **detecta automáticamente** todas las URLs
- No hay URLs hardcodeadas en el código
- `runtime-config.json` se genera **dinámicamente** después de cada deploy
- Los frontends cargan configuración **en tiempo de ejecución**

### 2. ¿Permitirá migrar todo el ecosistema a una cuenta nueva AWS?

**✅ SÍ, completamente**

Puedes migrar a cualquier cuenta AWS siguiendo el mismo proceso:
1. Crear recursos en nueva cuenta
2. Actualizar GitHub Secrets
3. Deploy workflows
4. Actualizar DNS (si aplica)

**El proceso es reproducible** porque:
- Toda la infraestructura está documentada
- Workflows CI/CD son parametrizados
- Comunicación entre apps es dinámica
- Scripts de migración son reusables

---

## 💡 Mejora Propuesta: Script de Migración Completa

Considera crear un script maestro para futuras migraciones:

```bash
#!/bin/bash
# scripts/migration/migrate-to-new-account.sh

# Este script coordina toda la migración
# Solo necesitas proporcionar:
# - AWS credentials de nueva cuenta
# - Nombres de recursos deseados
# - El script hace el resto

# Uso:
# ./migrate-to-new-account.sh --target-account=123456789012
```

---

## ✅ Conclusión

Tu ecosistema **ya está bien diseñado** para portabilidad:
- ✅ Comunicación dinámica funcionando
- ✅ Configuración centralizada en GitHub Secrets
- ✅ Infraestructura como código (Serverless Framework)
- ✅ Sin dependencias hardcodeadas

La migración a la cuenta "cefal" será **la primera de muchas posibles** migraciones futuras, todas siguiendo el mismo patrón probado.

---

**Documentado por**: Claude (Cursor AI)  
**Fecha**: 2026-01-12  
**Versión**: 1.0
