# Scripts de Migración EmotioX V3

Este directorio contiene scripts automatizados para facilitar la migración del ecosistema EmotioX V3 a la nueva cuenta AWS.

## Orden de Ejecución

### 1. Configurar AWS CLI
```bash
./01-setup-aws-cli.sh
```
Configura el perfil AWS "cefal" con las credenciales de la nueva cuenta.

### 2. Backup de Infraestructura Actual
```bash
./02-backup-current-infrastructure.sh
```
Crea backups de toda la configuración actual:
- Parámetros SSM
- Configuración de Cognito
- Configuración de CloudFront
- Configuración de S3
- Stacks de CloudFormation

**IMPORTANTE**: El backup de base de datos debe hacerse manualmente:
```bash
pg_dump -h <db_host> -U <db_user> -d emotioxv3 -F c -f migration-backups/database_$(date +%Y%m%d).dump
```

### 3. Crear Parámetros SSM
```bash
# Para production
./03-create-ssm-parameters.sh production

# Para dev (opcional)
./03-create-ssm-parameters.sh dev
```
Crea los parámetros necesarios en SSM Parameter Store de forma interactiva.

### 4. Crear Buckets S3
```bash
./04-create-s3-buckets.sh
```
Crea y configura los buckets S3 necesarios:
- Research Frontend
- Participant Frontend
- Media Storage

## Tareas Manuales Requeridas

Algunas tareas requieren configuración manual o interfaces web:

### 1. Certificados SSL (ACM)
Solicitar y validar certificados manualmente desde AWS Console o usando AWS CLI:
```bash
aws acm request-certificate \
  --domain-name api.emotiox.org \
  --validation-method DNS \
  --region us-east-1 \
  --profile cefal
```

### 2. Cognito User Pool
Crear User Pool y App Client usando AWS Console o AWS CLI (ver MIGRATION_PLAN.md sección "FASE 4").

### 3. CloudFront Distributions
Crear distribuciones de CloudFront usando AWS Console o AWS CLI (ver MIGRATION_PLAN.md sección "FASE 6").

### 4. DNS (Route53)
Actualizar registros DNS para apuntar a nuevos recursos (ver MIGRATION_PLAN.md sección "FASE 11" y "FASE 12").

### 5. Google OAuth
Actualizar Redirect URIs en Google Cloud Console:
- Proyecto: trade-462111
- Client ID: 420852401159-iv8trudae3p77cbgcgagc0pbllkbcag4.apps.googleusercontent.com
- Agregar: https://emotioxv3-cefal.auth.us-east-1.amazoncognito.com/oauth2/idpresponse

### 6. GitHub Secrets
Actualizar secretos en: https://github.com/<usuario>/emotioxV3/settings/secrets/actions
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- COGNITO_USER_POOL_ID
- COGNITO_CLIENT_ID
- RESEARCH_FRONTEND_S3_BUCKET
- PARTICIPANT_FRONTEND_S3_BUCKET
- RESEARCH_FRONTEND_CLOUDFRONT_ID
- PARTICIPANT_FRONTEND_CLOUDFRONT_ID

## Verificación Post-Migración

Después de completar la migración, verificar:

```bash
# Backend health check
curl https://api.emotiox.org/health

# Frontends
curl -I https://research.emotiox.org
curl -I https://participant.emotiox.org

# runtime-config.json
curl https://research.emotiox.org/runtime-config.json
curl https://participant.emotiox.org/runtime-config.json
```

## Troubleshooting

Si encuentras problemas, consulta la sección "Troubleshooting" en `MIGRATION_PLAN.md`.

## Soporte

- AWS Support: https://console.aws.amazon.com/support/
- Documentación completa: Ver `MIGRATION_PLAN.md`
