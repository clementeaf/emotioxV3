# EmotioX V3 - Checklist de Migración

## Información de Migración

**Cuenta Actual**: 041238861016  
**Nueva Cuenta (cefal)**: 058310292956  
**Región**: us-east-1  
**Fecha Inicio**: _____________  
**Fecha Completado**: _____________

---

## ✅ Pre-Migración

- [ ] **Backup completo de base de datos**
  ```bash
  pg_dump -h <db_host> -U <db_user> -d emotioxv3 -F c -f backup_$(date +%Y%m%d).dump
  ```
  - Fecha: _____________
  - Tamaño: _____________
  - Verificado: ⬜

- [ ] **Exportar configuración actual**
  ```bash
  ./scripts/migration/02-backup-current-infrastructure.sh
  ```
  - Fecha: _____________
  - Directorio: _____________

- [ ] **Notificar a stakeholders**
  - Email enviado: ⬜
  - Fecha/hora de ventana de mantenimiento: _____________

- [ ] **Revisar documentación**
  - MIGRATION_PLAN.md leído: ⬜
  - Plan aprobado: ⬜

---

## 🔧 Configuración Nueva Cuenta

- [ ] **Configurar AWS CLI**
  ```bash
  ./scripts/migration/01-setup-aws-cli.sh
  ```
  - Perfil "cefal" configurado: ⬜
  - Verificación exitosa: ⬜
  - Account ID confirmado: 058310292956 ⬜

- [ ] **Verificar servicios habilitados**
  - Lambda: ⬜
  - API Gateway: ⬜
  - S3: ⬜
  - CloudFront: ⬜
  - Cognito: ⬜
  - ACM (Certificate Manager): ⬜
  - SSM Parameter Store: ⬜
  - CloudFormation: ⬜

- [ ] **Verificar límites de servicio**
  - Lambda concurrent executions: ⬜
  - CloudFront distributions: ⬜
  - Solicitar aumentos si es necesario: ⬜

---

## 🗄️ Base de Datos

- [ ] **Decisión de estrategia**
  - ⬜ Opción A: Migrar a nueva RDS en cuenta nueva
  - ⬜ Opción B: Mantener Neon DB actual (recomendado)

### Si Opción A (Nueva RDS):
- [ ] Crear instancia RDS
  - Instance ID: _____________
  - Endpoint: _____________
- [ ] Restaurar backup
  - Verificado: ⬜
- [ ] Verificar datos
  - Count researches: _____________
  - Count users: _____________

### Si Opción B (Mantener Neon):
- [ ] Verificar conexión desde nueva cuenta
  - Test exitoso: ⬜
- [ ] Actualizar credenciales en SSM
  - Completado: ⬜

---

## 🔒 Certificados SSL

- [ ] **Solicitar certificado para api.emotiox.org**
  - Certificate ARN: _____________
  - Estado: _____________

- [ ] **Solicitar certificado para research.emotiox.org**
  - Certificate ARN: _____________
  - Estado: _____________

- [ ] **Solicitar certificado para participant.emotiox.org**
  - Certificate ARN: _____________
  - Estado: _____________

- [ ] **Solicitar certificado wildcard *.emotiox.org**
  - Certificate ARN: _____________
  - Estado: _____________

- [ ] **Validar certificados vía DNS**
  - Registros CNAME agregados: ⬜
  - Validación completada: ⬜
  - Tiempo de espera: _____________ minutos

---

## 🔐 Cognito

- [ ] **Crear User Pool**
  - User Pool ID: _____________
  - Nombre: emotioxv3-users
  - Configurado correctamente: ⬜

- [ ] **Crear App Client**
  - Client ID: _____________
  - Client Secret: _____________
  - Generate secret: ✅

- [ ] **Configurar dominio de Cognito**
  - Dominio: emotioxv3-cefal.auth.us-east-1.amazoncognito.com
  - Activo: ⬜

- [ ] **Configurar Google OAuth**
  - Identity Provider creado: ⬜
  - Attribute mapping configurado: ⬜

- [ ] **Actualizar Google Cloud Console**
  - Redirect URI agregado: ⬜
  - https://emotioxv3-cefal.auth.us-east-1.amazoncognito.com/oauth2/idpresponse

- [ ] **Migrar usuarios (opcional)**
  - Estrategia decidida: _____________
  - Usuarios migrados: _____________ / _____________

---

## 🪣 Buckets S3

- [ ] **Crear buckets**
  ```bash
  ./scripts/migration/04-create-s3-buckets.sh
  ```
  - Research Frontend: emotioxv3-research-frontend-new ⬜
  - Participant Frontend: emotioxv3-participant-frontend-new ⬜
  - Media: emotioxv3-media-production ⬜

- [ ] **Configurar políticas y CORS**
  - Research bucket policy: ⬜
  - Research bucket CORS: ⬜
  - Participant bucket policy: ⬜
  - Participant bucket CORS: ⬜
  - Media bucket CORS: ⬜

- [ ] **Copiar contenido de buckets antiguos**
  - Research frontend copiado: ⬜
  - Participant frontend copiado: ⬜
  - Media copiado (si aplica): ⬜

---

## ☁️ CloudFront

- [ ] **Crear distribución Research Frontend**
  - Distribution ID: _____________
  - Domain Name: _____________
  - Estado: _____________
  - Certificado SSL configurado: ⬜

- [ ] **Crear distribución Participant Frontend**
  - Distribution ID: _____________
  - Domain Name: _____________
  - Estado: _____________
  - Certificado SSL configurado: ⬜

- [ ] **Verificar configuraciones**
  - Custom error responses (404 → /index.html): ⬜
  - Compression habilitada: ⬜
  - HTTPS redirect configurado: ⬜

---

## ⚙️ SSM Parameter Store

- [ ] **Crear parámetros de production**
  ```bash
  ./scripts/migration/03-create-ssm-parameters.sh production
  ```
  - DB_HOST: ⬜
  - DB_PORT: ⬜
  - DB_NAME: ⬜
  - DB_USER: ⬜
  - DB_PASSWORD (SecureString): ⬜
  - DB_SSL: ⬜
  - APP_AWS_REGION: ⬜
  - S3_BUCKET_NAME: ⬜
  - CORS_ORIGIN: ⬜
  - COGNITO_USER_POOL_ID: ⬜
  - COGNITO_CLIENT_ID: ⬜
  - COGNITO_CLIENT_SECRET (SecureString): ⬜
  - COGNITO_DOMAIN: ⬜

- [ ] **Crear parámetros de dev (opcional)**
  ```bash
  ./scripts/migration/03-create-ssm-parameters.sh dev
  ```
  - Parámetros creados: ⬜

- [ ] **Verificar parámetros**
  ```bash
  aws ssm get-parameters-by-path --path /emotioxv3/production --profile cefal
  ```
  - Verificación exitosa: ⬜

---

## 🚀 Backend

- [ ] **Actualizar serverless.yml**
  - Nuevo Certificate ARN en línea 138: ⬜
  - ARN: _____________

- [ ] **Build del backend**
  ```bash
  cd backend && npm ci --legacy-peer-deps && npm run build
  ```
  - Build exitoso: ⬜
  - Dist/ generado: ⬜

- [ ] **Deploy a production**
  ```bash
  npx serverless deploy --stage production --aws-profile cefal
  ```
  - Deploy exitoso: ⬜
  - Stack Name: emotioxv3-backend-production ⬜

- [ ] **Obtener API Gateway URLs**
  - REST API URL: _____________
  - WebSocket URL: _____________
  - Custom Domain: https://api.emotiox.org ⬜

---

## 🌐 Custom Domain para API

- [ ] **Crear custom domain mapping**
  - Domain: api.emotiox.org ⬜
  - API Gateway Domain Name: _____________

- [ ] **Actualizar DNS en Route53**
  - Registro A para api.emotiox.org: ⬜
  - Alias target: _____________
  - Propagación verificada: ⬜

- [ ] **Verificar dominio funciona**
  ```bash
  curl https://api.emotiox.org/health
  ```
  - Respuesta exitosa: ⬜

---

## 🌍 DNS para Frontends

- [ ] **Actualizar research.emotiox.org**
  - Registro A actualizado: ⬜
  - Alias target (CloudFront): _____________
  - Propagación verificada: ⬜
  ```bash
  dig research.emotiox.org
  ```

- [ ] **Actualizar participant.emotiox.org**
  - Registro A actualizado: ⬜
  - Alias target (CloudFront): _____________
  - Propagación verificada: ⬜
  ```bash
  dig participant.emotiox.org
  ```

---

## 📄 runtime-config.json

- [ ] **Generar archivo**
  ```json
  {
    "apiBaseUrl": "https://api.emotiox.org",
    "researchBaseUrl": "https://d2mgq2ppntnjct.cloudfront.net",
    "participantBaseUrl": "https://d2am10cly7c9kf.cloudfront.net"
  }
  ```
  - Generado: ⬜

- [ ] **Subir a S3**
  - Research bucket: ⬜
  - Participant bucket: ⬜
  - Cache-Control: no-store configurado ⬜

- [ ] **Invalidar CloudFront**
  - Research invalidation: ⬜
  - Participant invalidation: ⬜

---

## 🔑 GitHub Secrets

- [ ] **Actualizar credenciales AWS**
  - AWS_ACCESS_KEY_ID: ⬜
  - AWS_SECRET_ACCESS_KEY: ⬜
  - AWS_REGION: ⬜

- [ ] **Actualizar base de datos**
  - DB_HOST: ⬜
  - DB_PORT: ⬜
  - DB_NAME: ⬜
  - DB_USER: ⬜
  - DB_PASSWORD: ⬜
  - DB_SSL: ⬜

- [ ] **Actualizar Cognito**
  - COGNITO_USER_POOL_ID: ⬜
  - COGNITO_CLIENT_ID: ⬜

- [ ] **Actualizar frontend**
  - RESEARCH_FRONTEND_S3_BUCKET: ⬜
  - PARTICIPANT_FRONTEND_S3_BUCKET: ⬜
  - RESEARCH_FRONTEND_CLOUDFRONT_ID: ⬜
  - PARTICIPANT_FRONTEND_CLOUDFRONT_ID: ⬜
  - VITE_PARTICIPANT_FRONTEND_URL: ⬜

---

## 📦 Deploy Frontends

- [ ] **Trigger workflow de backend**
  ```bash
  gh workflow run "Deploy Backend to AWS Lambda"
  ```
  - Workflow exitoso: ⬜
  - Run ID: _____________

- [ ] **Trigger workflow de research frontend**
  ```bash
  gh workflow run "Deploy Research Frontend to S3/CloudFront"
  ```
  - Workflow exitoso: ⬜
  - Run ID: _____________

- [ ] **Trigger workflow de participant frontend**
  ```bash
  gh workflow run "Deploy Participant Frontend to S3/CloudFront"
  ```
  - Workflow exitoso: ⬜
  - Run ID: _____________

- [ ] **Monitorear deployments**
  ```bash
  gh run list --limit 5
  ```
  - Todos exitosos: ⬜

---

## ✅ Verificación y Testing

### Backend
- [ ] **Health check**
  ```bash
  curl https://api.emotiox.org/health
  ```
  - Responde OK: ⬜

- [ ] **Test de autenticación**
  - Login funciona: ⬜
  - Token válido: ⬜

- [ ] **Endpoints protegidos**
  - /api/researches responde: ⬜
  - /api/users responde: ⬜

### Frontends
- [ ] **Research Frontend**
  ```bash
  curl -I https://research.emotiox.org
  ```
  - Status 200: ⬜
  - Carga correctamente en navegador: ⬜
  - runtime-config.json carga: ⬜

- [ ] **Participant Frontend**
  ```bash
  curl -I https://participant.emotiox.org
  ```
  - Status 200: ⬜
  - Carga correctamente en navegador: ⬜
  - runtime-config.json carga: ⬜

### Cognito
- [ ] **Google OAuth**
  - Login con Google funciona: ⬜
  - Redirect exitoso: ⬜
  - Token generado: ⬜

### Testing Funcional Completo
- [ ] **Flow de Research**
  1. Login con Google: ⬜
  2. Crear research: ⬜
  3. Configurar stages y modules: ⬜
  4. Generar link de participante: ⬜

- [ ] **Flow de Participant**
  1. Abrir link generado: ⬜
  2. Completar módulos: ⬜
  3. Enviar respuestas: ⬜

- [ ] **Verificación de Datos**
  - Respuestas en research frontend: ⬜
  - Datos en base de datos: ⬜

### CloudFront
- [ ] **Distribuciones activas**
  - Research status "Deployed": ⬜
  - Participant status "Deployed": ⬜

### Base de Datos
- [ ] **Conexión y datos**
  ```sql
  SELECT COUNT(*) FROM researches;
  SELECT COUNT(*) FROM users;
  ```
  - Conexión exitosa: ⬜
  - Datos consistentes: ⬜

---

## 📊 Monitoreo Post-Migración

- [ ] **CloudWatch Alarms**
  - Lambda errors alarm: ⬜
  - API Gateway 5xx alarm: ⬜

- [ ] **Logs**
  - Lambda logs accesibles: ⬜
  - API Gateway logs habilitados: ⬜

- [ ] **Budget Alerts**
  - Budget configurado: ⬜
  - Límite mensual: $____________

- [ ] **Monitoreo activo (1 semana)**
  - Día 1: ⬜
  - Día 2: ⬜
  - Día 3: ⬜
  - Día 4: ⬜
  - Día 5: ⬜
  - Día 6: ⬜
  - Día 7: ⬜

---

## 🧹 Cleanup (Después de 2+ semanas)

⚠️ **SOLO ejecutar después de confirmar que nueva infraestructura es estable**

- [ ] **Backup final de recursos antiguos**
  - Database backup: ⬜
  - Cognito config export: ⬜
  - S3 files download: ⬜

- [ ] **Deshabilitar recursos antiguos**
  - CloudFront distributions deshabilitadas: ⬜
  - Lambda functions detenidas: ⬜
  - Cognito user pool desactivado: ⬜

- [ ] **Esperar 2 semanas adicionales**
  - Fecha inicio espera: _____________
  - Fecha fin espera: _____________

- [ ] **Eliminar recursos permanentemente**
  - CloudFront distributions eliminadas: ⬜
  - S3 buckets eliminados: ⬜
  - Cognito user pool eliminado: ⬜
  - CloudFormation stacks eliminados: ⬜
  - Lambda functions eliminadas: ⬜

---

## 🔐 Seguridad Post-Migración

- [ ] **Rotar Access Keys**
  - Nuevas keys generadas: ⬜
  - Keys viejas deshabilitadas: ⬜
  - Keys viejas eliminadas: ⬜

- [ ] **Habilitar MFA**
  - MFA en root account: ⬜
  - MFA en IAM users: ⬜

- [ ] **Configurar servicios de seguridad**
  - AWS CloudTrail: ⬜
  - AWS Config: ⬜
  - AWS GuardDuty: ⬜

- [ ] **Revisar permisos**
  - IAM policies revisadas: ⬜
  - Security groups revisados: ⬜
  - S3 bucket policies revisadas: ⬜

- [ ] **Encryption**
  - S3 encryption at rest: ⬜
  - RDS encryption (si aplica): ⬜
  - SSL/TLS en tránsito: ⬜

- [ ] **Eliminar archivos de credenciales locales**
  - cefal_accessKeys.csv eliminado: ⬜
  - cefal_credentials.csv eliminado: ⬜
  - client_secret_*.json respaldado en password manager: ⬜

---

## 📝 Documentación

- [ ] **Actualizar documentación**
  - README.md actualizado: ⬜
  - DEPLOYMENT_SUMMARY.md actualizado: ⬜
  - Diagramas de arquitectura actualizados: ⬜

- [ ] **Documentar problemas encontrados**
  - Issues documentados: ⬜
  - Soluciones documentadas: ⬜

- [ ] **Runbook actualizado**
  - Procedimientos operativos: ⬜
  - Troubleshooting guide: ⬜

---

## ✅ Finalización

- [ ] **Notificar a stakeholders**
  - Email de migración completada: ⬜
  - Fecha: _____________

- [ ] **Revisar costos**
  - Costos primera semana: $____________
  - Costos dentro de presupuesto: ⬜

- [ ] **Post-mortem (opcional)**
  - Reunión realizada: ⬜
  - Lecciones aprendidas documentadas: ⬜

- [ ] **Celebrar 🎉**
  - Migración exitosa: ⬜

---

## Notas Adicionales

```
[Espacio para notas, problemas encontrados, decisiones tomadas, etc.]














```

---

**Completado por**: _____________  
**Firma**: _____________  
**Fecha**: _____________
