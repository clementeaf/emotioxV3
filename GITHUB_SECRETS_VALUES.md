# GitHub Secrets - Valores para Nueva Cuenta AWS

**Generado**: 2026-01-12  
**Cuenta AWS**: 058310292956 (cefal)

⚠️ **CONFIDENCIAL** - No commitear este archivo

---

## 🔑 AWS Credentials

```
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID_HERE
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY_HERE
AWS_REGION=us-east-1
```

---

## 🗄️ Base de Datos

⚠️ **IMPORTANTE**: Los siguientes valores son placeholders. Actualizar con credenciales reales de tu base de datos.

```
DB_HOST=placeholder-update-with-real-db-host
DB_PORT=5432
DB_NAME=emotioxv3
DB_USER=placeholder-update-with-real-db-user
DB_PASSWORD=placeholder-update-with-real-db-password
DB_SSL=true
```

**Para actualizar después con valores reales**:
```bash
# Ejemplo para base de datos Neon
aws ssm put-parameter --name "/emotioxv3/production/DB_HOST" --type "String" --value "<tu_neon_host>" --region us-east-1 --profile cefal --overwrite
aws ssm put-parameter --name "/emotioxv3/production/DB_USER" --type "String" --value "<tu_neon_user>" --region us-east-1 --profile cefal --overwrite
aws ssm put-parameter --name "/emotioxv3/production/DB_PASSWORD" --type "SecureString" --value "<tu_neon_password>" --region us-east-1 --profile cefal --overwrite
```

---

## ☁️ AWS y Configuración

```
APP_AWS_REGION=us-east-1
S3_BUCKET_NAME=emotioxv3-production
CORS_ORIGIN=https://research.emotiox.org
```

---

## 🔐 Cognito

```
COGNITO_USER_POOL_ID=us-east-1_D45HXFsRD
COGNITO_CLIENT_ID=dvj9eulenhamsj4vu45t1761g
```

---

## 🪣 S3 Buckets (Bucket Único)

```
RESEARCH_FRONTEND_S3_BUCKET=emotioxv3-production
PARTICIPANT_FRONTEND_S3_BUCKET=emotioxv3-production
```

---

## ☁️ CloudFront

```
RESEARCH_FRONTEND_CLOUDFRONT_ID=E66LOBLVM27WD
PARTICIPANT_FRONTEND_CLOUDFRONT_ID=E3GOM6XIXR36J4
```

---

## 🌐 URLs

```
VITE_PARTICIPANT_FRONTEND_URL=https://participant.emotiox.org
```

---

## 📋 Certificados SSL (ACM)

**Estado**: Pendientes de validación DNS

```
API Certificate ARN: arn:aws:acm:us-east-1:058310292956:certificate/8a3c4eda-4a7c-4334-ad68-e8ac4d3104f5
Research Certificate ARN: arn:aws:acm:us-east-1:058310292956:certificate/359cf658-890f-4740-b2e7-0451748fc635
Participant Certificate ARN: arn:aws:acm:us-east-1:058310292956:certificate/baa999cf-bd36-4a18-9587-30e363e2e6bb
```

**Validación DNS requerida** - Ver MIGRATION_DNS_VALIDATION.md

---

## 🚀 Backend URLs (Temporales - API Gateway)

```
REST API: https://3jczpvecma.execute-api.us-east-1.amazonaws.com/production
WebSocket: wss://qbsftyyqql.execute-api.us-east-1.amazonaws.com/production
```

**Nota**: Estas son las URLs temporales de API Gateway. Cuando los certificados SSL estén validados, configuraremos el custom domain `api.emotiox.org`.

---

## 📝 Cómo Actualizar GitHub Secrets

### Opción 1: Via GitHub CLI

```bash
# AWS Credentials
gh secret set AWS_ACCESS_KEY_ID -b"YOUR_AWS_ACCESS_KEY_ID_HERE"
gh secret set AWS_SECRET_ACCESS_KEY -b"YOUR_AWS_SECRET_ACCESS_KEY_HERE"
gh secret set AWS_REGION -b"us-east-1"

# Base de datos (actualizar con valores reales)
gh secret set DB_HOST -b"<tu_db_host>"
gh secret set DB_PORT -b"5432"
gh secret set DB_NAME -b"emotioxv3"
gh secret set DB_USER -b"<tu_db_user>"
gh secret set DB_PASSWORD -b"<tu_db_password>"
gh secret set DB_SSL -b"true"

# AWS y Configuración
gh secret set APP_AWS_REGION -b"us-east-1"
gh secret set S3_BUCKET_NAME -b"emotioxv3-production"
gh secret set CORS_ORIGIN -b"https://research.emotiox.org"

# Cognito
gh secret set COGNITO_USER_POOL_ID -b"us-east-1_D45HXFsRD"
gh secret set COGNITO_CLIENT_ID -b"dvj9eulenhamsj4vu45t1761g"

# S3 Buckets
gh secret set RESEARCH_FRONTEND_S3_BUCKET -b"emotioxv3-production"
gh secret set PARTICIPANT_FRONTEND_S3_BUCKET -b"emotioxv3-production"

# CloudFront
gh secret set RESEARCH_FRONTEND_CLOUDFRONT_ID -b"E66LOBLVM27WD"
gh secret set PARTICIPANT_FRONTEND_CLOUDFRONT_ID -b"E3GOM6XIXR36J4"

# URLs
gh secret set VITE_PARTICIPANT_FRONTEND_URL -b"https://participant.emotiox.org"
```

### Opción 2: Via GitHub Web UI

1. Ir a: https://github.com/<tu-usuario>/emotioxV3/settings/secrets/actions
2. Click "New repository secret" para cada uno
3. Copiar nombre y valor de arriba

---

## ✅ Checklist de Actualización

- [ ] AWS_ACCESS_KEY_ID
- [ ] AWS_SECRET_ACCESS_KEY
- [ ] AWS_REGION
- [ ] DB_HOST (actualizar con valor real)
- [ ] DB_PORT
- [ ] DB_NAME
- [ ] DB_USER (actualizar con valor real)
- [ ] DB_PASSWORD (actualizar con valor real)
- [ ] DB_SSL
- [ ] APP_AWS_REGION
- [ ] S3_BUCKET_NAME
- [ ] CORS_ORIGIN
- [ ] COGNITO_USER_POOL_ID
- [ ] COGNITO_CLIENT_ID
- [ ] RESEARCH_FRONTEND_S3_BUCKET
- [ ] PARTICIPANT_FRONTEND_S3_BUCKET
- [ ] RESEARCH_FRONTEND_CLOUDFRONT_ID
- [ ] PARTICIPANT_FRONTEND_CLOUDFRONT_ID
- [ ] VITE_PARTICIPANT_FRONTEND_URL

---

## 🔄 Próximos Pasos Después de Actualizar Secrets

1. **Actualizar workflows** con prefixes S3 (ver `WORKFLOWS_UPDATE_SINGLE_BUCKET.md`)
2. **Validar certificados SSL** agregando registros DNS (ver siguiente sección)
3. **Actualizar credenciales de base de datos** en SSM
4. **Trigger workflows** para deploy de frontends
5. **Configurar custom domain** para API después de validación SSL

---

**Generado automáticamente por migración CLI**
