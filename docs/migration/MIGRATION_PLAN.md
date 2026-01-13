# Plan de Migración EmotioX V3 a Nueva Cuenta AWS

**Fecha**: 2026-01-12  
**Cuenta AWS Actual**: 041238861016  
**Nueva Cuenta AWS (cefal)**: 058310292956

---

## Credenciales Disponibles

### AWS Access Keys
- **Access Key ID**: `YOUR_AWS_ACCESS_KEY_ID_HERE`
- **Secret Access Key**: `YOUR_AWS_SECRET_ACCESS_KEY_HERE`

### AWS Console
- **Username**: `cefal`
- **Password**: `fNI0xv%4`
- **URL**: https://058310292956.signin.aws.amazon.com/console

### Google OAuth
- **Client ID**: `YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com`
- **Client Secret**: `YOUR_GOOGLE_OAUTH_CLIENT_SECRET`
- **Project ID**: `trade-462111`

---

## Componentes del Ecosistema Actual

### 1. Backend (Lambda + API Gateway)
- **Stack Production**: `emotioxv3-backend-production`
- **Stack Dev**: `emotioxv3-backend-dev`
- **API Gateway REST**: Endpoints HTTP
- **API Gateway WebSocket**: Para funcionalidad monitor
- **Custom Domain**: `api.emotiox.org`
- **Certificate ARN**: `arn:aws:acm:us-east-1:041238861016:certificate/65f56f43-e4c5-480f-9002-a42f6f469b37`

### 2. Frontend Research
- **S3 Bucket**: `emotioxv3-research-frontend`
- **CloudFront ID**: `E3HBEQ4F8V5KO0`
- **Domain**: `research.emotiox.org`
- **URL**: https://research.emotiox.org

### 3. Frontend Participant
- **S3 Bucket**: `emotioxv3-participant-frontend`
- **CloudFront ID**: `EAPLN65ZHVPFI`
- **Domain**: `participant.emotiox.org`
- **URL**: https://participant.emotiox.org

### 4. Cognito
- **User Pool ID**: Almacenado en SSM `/emotioxv3/{stage}/COGNITO_USER_POOL_ID`
- **Client ID**: Almacenado en SSM `/emotioxv3/{stage}/COGNITO_CLIENT_ID`
- **Domain**: `emotioxv3-2126.auth.us-east-1.amazoncognito.com`
- **Google OAuth**: Configurado como identity provider

### 5. Base de Datos
- **Tipo**: PostgreSQL (Neon o RDS)
- **SSL**: Requerido para conexiones remotas
- **Configuración**: SSM Parameter Store

### 6. S3 Media Bucket
- **Bucket**: `emotioxv3-media-*`
- **Uso**: Almacenamiento de archivos multimedia

### 7. SSM Parameter Store
Parámetros bajo `/emotioxv3/{stage}/`:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD` (SecureString)
- `DB_SSL`
- `APP_AWS_REGION`
- `S3_BUCKET_NAME`
- `CORS_ORIGIN`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `COGNITO_CLIENT_SECRET` (SecureString)
- `COGNITO_DOMAIN`

### 8. GitHub Secrets
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL`
- `APP_AWS_REGION`
- `S3_BUCKET_NAME`
- `CORS_ORIGIN`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `RESEARCH_FRONTEND_S3_BUCKET`
- `PARTICIPANT_FRONTEND_S3_BUCKET`
- `RESEARCH_FRONTEND_CLOUDFRONT_ID`
- `PARTICIPANT_FRONTEND_CLOUDFRONT_ID`
- `VITE_PARTICIPANT_FRONTEND_URL`

---

## Plan de Migración Paso a Paso

### FASE 0: Preparación y Backup

#### 0.1 Backup de Datos
```bash
# Backup de base de datos
pg_dump -h <current_db_host> -U <db_user> -d <db_name> -F c -f emotioxv3_backup_$(date +%Y%m%d).dump

# Exportar configuración actual de Cognito
aws cognito-idp describe-user-pool --user-pool-id <current_pool_id> > cognito_user_pool_backup.json
aws cognito-idp describe-user-pool-client --user-pool-id <current_pool_id> --client-id <current_client_id> > cognito_client_backup.json

# Listar usuarios de Cognito (para migración)
aws cognito-idp list-users --user-pool-id <current_pool_id> > cognito_users_backup.json
```

#### 0.2 Documentar Configuración Actual
```bash
# Exportar parámetros de SSM
aws ssm get-parameters-by-path --path "/emotioxv3/production" --with-decryption --region us-east-1 > ssm_production_backup.json
aws ssm get-parameters-by-path --path "/emotioxv3/dev" --with-decryption --region us-east-1 > ssm_dev_backup.json

# Exportar configuración de CloudFront
aws cloudfront get-distribution --id E3HBEQ4F8V5KO0 > cloudfront_research_backup.json
aws cloudfront get-distribution --id EAPLN65ZHVPFI > cloudfront_participant_backup.json

# Exportar configuración de S3
aws s3api get-bucket-policy --bucket emotioxv3-research-frontend > s3_research_policy.json
aws s3api get-bucket-cors --bucket emotioxv3-research-frontend > s3_research_cors.json
aws s3api get-bucket-website --bucket emotioxv3-research-frontend > s3_research_website.json
# Repetir para participant-frontend y media buckets
```

### FASE 1: Configurar Nueva Cuenta AWS

#### 1.1 Configurar AWS CLI con Nueva Cuenta
```bash
# Configurar perfil de AWS CLI
aws configure --profile cefal
# AWS Access Key ID: YOUR_AWS_ACCESS_KEY_ID_HERE
# AWS Secret Access Key: YOUR_AWS_SECRET_ACCESS_KEY_HERE
# Default region: us-east-1
# Default output format: json

# Verificar configuración
aws sts get-caller-identity --profile cefal
# Debe mostrar Account: 058310292956
```

#### 1.2 Habilitar Servicios Necesarios
```bash
# Verificar que los servicios estén habilitados en la región us-east-1:
# - Lambda
# - API Gateway
# - S3
# - CloudFront
# - Cognito
# - RDS (si se usa)
# - ACM (Certificate Manager)
# - SSM Parameter Store
# - CloudFormation
```

#### 1.3 Configurar Límites de Servicio
```bash
# Verificar límites de cuenta (service quotas)
aws service-quotas list-service-quotas --service-code lambda --profile cefal | grep -E "(ConcurrentExecutions|FunctionCount)"
aws service-quotas list-service-quotas --service-code cloudfront --profile cefal | grep "DistributionLimit"

# Solicitar aumentos si es necesario
```

### FASE 2: Migrar Base de Datos

#### Opción A: Migrar a Nueva Instancia RDS en Nueva Cuenta

```bash
# 2.1 Crear nueva instancia RDS
aws rds create-db-instance \
  --db-instance-identifier emotioxv3-production \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username emotioxadmin \
  --master-user-password '<STRONG_PASSWORD>' \
  --allocated-storage 20 \
  --storage-type gp3 \
  --storage-encrypted \
  --backup-retention-period 7 \
  --publicly-accessible false \
  --vpc-security-group-ids <NEW_SECURITY_GROUP_ID> \
  --db-subnet-group-name <NEW_SUBNET_GROUP> \
  --region us-east-1 \
  --profile cefal

# 2.2 Esperar a que esté disponible
aws rds wait db-instance-available --db-instance-identifier emotioxv3-production --profile cefal

# 2.3 Obtener endpoint
NEW_DB_HOST=$(aws rds describe-db-instances \
  --db-instance-identifier emotioxv3-production \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --profile cefal)

echo "New DB Host: $NEW_DB_HOST"

# 2.4 Restaurar backup
pg_restore -h $NEW_DB_HOST -U emotioxadmin -d emotioxv3 -v emotioxv3_backup_$(date +%Y%m%d).dump

# 2.5 Verificar datos
psql -h $NEW_DB_HOST -U emotioxadmin -d emotioxv3 -c "SELECT COUNT(*) FROM researches;"
```

#### Opción B: Mantener Neon DB (Recomendado)
```bash
# Si estás usando Neon, solo necesitas:
# 1. Asegurarte que las credenciales de Neon estén actualizadas en SSM
# 2. Verificar que la nueva cuenta AWS puede conectarse a Neon
# 3. No hay necesidad de migrar la base de datos

# Verificar conexión desde nueva cuenta
psql -h <neon_host> -U <db_user> -d <db_name> -c "SELECT version();"
```

### FASE 3: Crear Certificados SSL

#### 3.1 Solicitar Certificados en ACM
```bash
# Certificado para api.emotiox.org
aws acm request-certificate \
  --domain-name api.emotiox.org \
  --validation-method DNS \
  --region us-east-1 \
  --profile cefal

# Certificado para research.emotiox.org
aws acm request-certificate \
  --domain-name research.emotiox.org \
  --validation-method DNS \
  --region us-east-1 \
  --profile cefal

# Certificado para participant.emotiox.org
aws acm request-certificate \
  --domain-name participant.emotiox.org \
  --validation-method DNS \
  --region us-east-1 \
  --profile cefal

# IMPORTANTE: Para CloudFront, los certificados deben estar en us-east-1
# Solicitar certificado wildcard para CloudFront
aws acm request-certificate \
  --domain-name "*.emotiox.org" \
  --subject-alternative-names "emotiox.org" \
  --validation-method DNS \
  --region us-east-1 \
  --profile cefal
```

#### 3.2 Validar Certificados
```bash
# Obtener registros de validación DNS
aws acm describe-certificate \
  --certificate-arn <CERTIFICATE_ARN> \
  --region us-east-1 \
  --profile cefal

# Agregar registros CNAME en Route53 o tu proveedor DNS
# Esperar validación (puede tardar hasta 30 minutos)

# Verificar estado
aws acm wait certificate-validated \
  --certificate-arn <CERTIFICATE_ARN> \
  --region us-east-1 \
  --profile cefal
```

### FASE 4: Configurar Cognito

#### 4.1 Crear User Pool
```bash
# Crear User Pool usando configuración existente como referencia
aws cognito-idp create-user-pool \
  --pool-name "emotioxv3-users" \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
  --auto-verified-attributes email \
  --username-attributes email \
  --mfa-configuration OFF \
  --email-configuration "SourceArn=<SES_IDENTITY_ARN>,EmailSendingAccount=COGNITO_DEFAULT" \
  --region us-east-1 \
  --profile cefal \
  > new_cognito_pool.json

NEW_USER_POOL_ID=$(cat new_cognito_pool.json | jq -r '.UserPool.Id')
echo "New User Pool ID: $NEW_USER_POOL_ID"
```

#### 4.2 Crear App Client
```bash
# Crear App Client
aws cognito-idp create-user-pool-client \
  --user-pool-id $NEW_USER_POOL_ID \
  --client-name "emotioxv3-web-client" \
  --generate-secret \
  --allowed-o-auth-flows "code" "implicit" \
  --allowed-o-auth-scopes "openid" "email" "profile" \
  --allowed-o-auth-flows-user-pool-client \
  --callback-urls "https://research.emotiox.org/callback" "https://participant.emotiox.org/callback" "http://localhost:5173/callback" "http://localhost:5174/callback" \
  --logout-urls "https://research.emotiox.org" "https://participant.emotiox.org" "http://localhost:5173" "http://localhost:5174" \
  --supported-identity-providers "Google" "COGNITO" \
  --region us-east-1 \
  --profile cefal \
  > new_cognito_client.json

NEW_CLIENT_ID=$(cat new_cognito_client.json | jq -r '.UserPoolClient.ClientId')
NEW_CLIENT_SECRET=$(cat new_cognito_client.json | jq -r '.UserPoolClient.ClientSecret')
echo "New Client ID: $NEW_CLIENT_ID"
```

#### 4.3 Configurar Dominio de Cognito
```bash
# Crear dominio de Cognito
aws cognito-idp create-user-pool-domain \
  --domain "emotioxv3-cefal" \
  --user-pool-id $NEW_USER_POOL_ID \
  --region us-east-1 \
  --profile cefal

NEW_COGNITO_DOMAIN="emotioxv3-cefal.auth.us-east-1.amazoncognito.com"
echo "New Cognito Domain: $NEW_COGNITO_DOMAIN"
```

#### 4.4 Configurar Google como Identity Provider
```bash
# Crear Google Identity Provider
aws cognito-idp create-identity-provider \
  --user-pool-id $NEW_USER_POOL_ID \
  --provider-name Google \
  --provider-type Google \
  --provider-details "client_id=YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com,client_secret=YOUR_GOOGLE_OAUTH_CLIENT_SECRET,authorize_scopes=profile email openid" \
  --attribute-mapping "email=email,name=name,username=sub" \
  --region us-east-1 \
  --profile cefal
```

#### 4.5 Actualizar Google OAuth Redirect URIs
```bash
# Ir a Google Cloud Console: https://console.cloud.google.com/apis/credentials
# Proyecto: trade-462111
# Client ID: YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com
# 
# Agregar a "Authorized redirect URIs":
# - https://emotioxv3-cefal.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
#
# Nota: Los redirect URIs ya existentes pueden mantenerse para compatibilidad durante la migración
```

#### 4.6 Migrar Usuarios (Opcional)
```bash
# Si necesitas migrar usuarios existentes, hay varias opciones:
# 
# Opción 1: Usar AWS SDK para crear usuarios manualmente
# Opción 2: Usar Lambda trigger para migración on-demand
# Opción 3: Pedir a usuarios que reseteen contraseña
#
# Ver: cognito_users_backup.json

# Ejemplo de creación de usuario:
# aws cognito-idp admin-create-user \
#   --user-pool-id $NEW_USER_POOL_ID \
#   --username "user@example.com" \
#   --user-attributes Name=email,Value="user@example.com" Name=email_verified,Value="true" \
#   --message-action SUPPRESS \
#   --region us-east-1 \
#   --profile cefal
```

### FASE 5: Crear Buckets S3

#### 5.1 Research Frontend Bucket
```bash
# Crear bucket
aws s3 mb s3://emotioxv3-research-frontend-new \
  --region us-east-1 \
  --profile cefal

# Configurar para static website hosting
aws s3 website s3://emotioxv3-research-frontend-new \
  --index-document index.html \
  --error-document index.html \
  --profile cefal

# Configurar política de bucket
cat > research_bucket_policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::emotioxv3-research-frontend-new/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket emotioxv3-research-frontend-new \
  --policy file://research_bucket_policy.json \
  --profile cefal

# Configurar CORS
cat > research_cors.json <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket emotioxv3-research-frontend-new \
  --cors-configuration file://research_cors.json \
  --profile cefal
```

#### 5.2 Participant Frontend Bucket
```bash
# Repetir proceso para participant frontend
aws s3 mb s3://emotioxv3-participant-frontend-new \
  --region us-east-1 \
  --profile cefal

aws s3 website s3://emotioxv3-participant-frontend-new \
  --index-document index.html \
  --error-document index.html \
  --profile cefal

cat > participant_bucket_policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::emotioxv3-participant-frontend-new/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket emotioxv3-participant-frontend-new \
  --policy file://participant_bucket_policy.json \
  --profile cefal

aws s3api put-bucket-cors \
  --bucket emotioxv3-participant-frontend-new \
  --cors-configuration file://research_cors.json \
  --profile cefal
```

#### 5.3 Media Bucket
```bash
# Crear bucket para media
aws s3 mb s3://emotioxv3-media-production \
  --region us-east-1 \
  --profile cefal

# Configurar CORS para uploads
cat > media_cors.json <<EOF
{
  "CORSRules": [
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
EOF

aws s3api put-bucket-cors \
  --bucket emotioxv3-media-production \
  --cors-configuration file://media_cors.json \
  --profile cefal

# Configurar lifecycle rules para optimización de costos (opcional)
```

#### 5.4 Copiar Contenido de Buckets Existentes
```bash
# Copiar contenido de research frontend
aws s3 sync s3://emotioxv3-research-frontend s3://emotioxv3-research-frontend-new \
  --source-region us-east-1 \
  --region us-east-1 \
  --profile cefal

# Copiar contenido de participant frontend
aws s3 sync s3://emotioxv3-participant-frontend s3://emotioxv3-participant-frontend-new \
  --source-region us-east-1 \
  --region us-east-1 \
  --profile cefal

# Copiar contenido de media bucket (si aplica)
# aws s3 sync s3://<old-media-bucket> s3://emotioxv3-media-production \
#   --source-region us-east-1 \
#   --region us-east-1 \
#   --profile cefal
```

### FASE 6: Crear Distribuciones CloudFront

#### 6.1 Research Frontend CloudFront
```bash
# Obtener ARN del certificado
CERT_ARN_RESEARCH=$(aws acm list-certificates \
  --region us-east-1 \
  --profile cefal \
  --query "CertificateSummaryList[?DomainName=='research.emotiox.org'].CertificateArn | [0]" \
  --output text)

# Crear distribución de CloudFront
cat > research_cloudfront.json <<EOF
{
  "CallerReference": "emotioxv3-research-$(date +%s)",
  "Aliases": {
    "Quantity": 1,
    "Items": ["research.emotiox.org"]
  },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-emotioxv3-research-frontend-new",
        "DomainName": "emotioxv3-research-frontend-new.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-emotioxv3-research-frontend-new",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "Comment": "EmotioX Research Frontend",
  "Enabled": true,
  "ViewerCertificate": {
    "ACMCertificateArn": "$CERT_ARN_RESEARCH",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2"
}
EOF

# Crear distribución
aws cloudfront create-distribution \
  --distribution-config file://research_cloudfront.json \
  --profile cefal \
  > new_research_cloudfront.json

NEW_RESEARCH_CF_ID=$(cat new_research_cloudfront.json | jq -r '.Distribution.Id')
NEW_RESEARCH_CF_DOMAIN=$(cat new_research_cloudfront.json | jq -r '.Distribution.DomainName')

echo "New Research CloudFront ID: $NEW_RESEARCH_CF_ID"
echo "New Research CloudFront Domain: $NEW_RESEARCH_CF_DOMAIN"
```

#### 6.2 Participant Frontend CloudFront
```bash
# Repetir proceso para participant frontend
CERT_ARN_PARTICIPANT=$(aws acm list-certificates \
  --region us-east-1 \
  --profile cefal \
  --query "CertificateSummaryList[?DomainName=='participant.emotiox.org'].CertificateArn | [0]" \
  --output text)

cat > participant_cloudfront.json <<EOF
{
  "CallerReference": "emotioxv3-participant-$(date +%s)",
  "Aliases": {
    "Quantity": 1,
    "Items": ["participant.emotiox.org"]
  },
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-emotioxv3-participant-frontend-new",
        "DomainName": "emotioxv3-participant-frontend-new.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-emotioxv3-participant-frontend-new",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "CustomErrorResponses": {
    "Quantity": 1,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "Comment": "EmotioX Participant Frontend",
  "Enabled": true,
  "ViewerCertificate": {
    "ACMCertificateArn": "$CERT_ARN_PARTICIPANT",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2"
}
EOF

aws cloudfront create-distribution \
  --distribution-config file://participant_cloudfront.json \
  --profile cefal \
  > new_participant_cloudfront.json

NEW_PARTICIPANT_CF_ID=$(cat new_participant_cloudfront.json | jq -r '.Distribution.Id')
NEW_PARTICIPANT_CF_DOMAIN=$(cat new_participant_cloudfront.json | jq -r '.Distribution.DomainName')

echo "New Participant CloudFront ID: $NEW_PARTICIPANT_CF_ID"
echo "New Participant CloudFront Domain: $NEW_PARTICIPANT_CF_DOMAIN"
```

### FASE 7: Configurar SSM Parameter Store

#### 7.1 Crear Parámetros de Production
```bash
# Base de datos (ajustar valores según tu configuración)
aws ssm put-parameter \
  --name "/emotioxv3/production/DB_HOST" \
  --type "String" \
  --value "<NEW_DB_HOST_OR_NEON_HOST>" \
  --region us-east-1 \
  --profile cefal

aws ssm put-parameter \
  --name "/emotioxv3/production/DB_PORT" \
  --type "String" \
  --value "5432" \
  --region us-east-1 \
  --profile cefal

aws ssm put-parameter \
  --name "/emotioxv3/production/DB_NAME" \
  --type "String" \
  --value "emotioxv3" \
  --region us-east-1 \
  --profile cefal

aws ssm put-parameter \
  --name "/emotioxv3/production/DB_USER" \
  --type "String" \
  --value "<DB_USER>" \
  --region us-east-1 \
  --profile cefal

aws ssm put-parameter \
  --name "/emotioxv3/production/DB_PASSWORD" \
  --type "SecureString" \
  --value "<DB_PASSWORD>" \
  --region us-east-1 \
  --profile cefal

aws ssm put-parameter \
  --name "/emotioxv3/production/DB_SSL" \
  --type "String" \
  --value "true" \
  --region us-east-1 \
  --profile cefal

# AWS y configuración
aws ssm put-parameter \
  --name "/emotioxv3/production/APP_AWS_REGION" \
  --type "String" \
  --value "us-east-1" \
  --region us-east-1 \
  --profile cefal

aws ssm put-parameter \
  --name "/emotioxv3/production/S3_BUCKET_NAME" \
  --type "String" \
  --value "emotioxv3-media-production" \
  --region us-east-1 \
  --profile cefal

aws ssm put-parameter \
  --name "/emotioxv3/production/CORS_ORIGIN" \
  --type "String" \
  --value "https://research.emotiox.org" \
  --region us-east-1 \
  --profile cefal

# Cognito
aws ssm put-parameter \
  --name "/emotioxv3/production/COGNITO_USER_POOL_ID" \
  --type "String" \
  --value "$NEW_USER_POOL_ID" \
  --region us-east-1 \
  --profile cefal

aws ssm put-parameter \
  --name "/emotioxv3/production/COGNITO_CLIENT_ID" \
  --type "String" \
  --value "$NEW_CLIENT_ID" \
  --region us-east-1 \
  --profile cefal

aws ssm put-parameter \
  --name "/emotioxv3/production/COGNITO_CLIENT_SECRET" \
  --type "SecureString" \
  --value "$NEW_CLIENT_SECRET" \
  --region us-east-1 \
  --profile cefal

aws ssm put-parameter \
  --name "/emotioxv3/production/COGNITO_DOMAIN" \
  --type "String" \
  --value "$NEW_COGNITO_DOMAIN" \
  --region us-east-1 \
  --profile cefal
```

#### 7.2 Crear Parámetros de Dev (Opcional)
```bash
# Repetir el proceso anterior reemplazando "production" por "dev"
# Puedes usar los mismos valores o configuraciones diferentes para desarrollo
```

### FASE 8: Actualizar serverless.yml

#### 8.1 Actualizar Certificate ARN
```bash
# Editar backend/serverless.yml
# Línea 138: Actualizar certificateArn con el nuevo ARN

# Obtener nuevo ARN del certificado para api.emotiox.org
NEW_API_CERT_ARN=$(aws acm list-certificates \
  --region us-east-1 \
  --profile cefal \
  --query "CertificateSummaryList[?DomainName=='api.emotiox.org'].CertificateArn | [0]" \
  --output text)

echo "Nuevo Certificate ARN para API: $NEW_API_CERT_ARN"
```

Actualizar manualmente en `backend/serverless.yml`:
```yaml
certificateArn: arn:aws:acm:us-east-1:058310292956:certificate/<NEW_CERT_ID>
```

### FASE 9: Actualizar GitHub Secrets

```bash
# Ir a: https://github.com/<tu-usuario>/emotioxV3/settings/secrets/actions

# Actualizar los siguientes secrets:
# AWS_ACCESS_KEY_ID = YOUR_AWS_ACCESS_KEY_ID_HERE
# AWS_SECRET_ACCESS_KEY = YOUR_AWS_SECRET_ACCESS_KEY_HERE
# AWS_REGION = us-east-1

# Base de datos (mantener valores existentes o actualizar si cambiaron)
# DB_HOST = <tu_db_host>
# DB_PORT = 5432
# DB_NAME = emotioxv3
# DB_USER = <tu_db_user>
# DB_PASSWORD = <tu_db_password>
# DB_SSL = true

# Otros
# APP_AWS_REGION = us-east-1
# S3_BUCKET_NAME = emotioxv3-media-production
# CORS_ORIGIN = https://research.emotiox.org

# Cognito
# COGNITO_USER_POOL_ID = <NEW_USER_POOL_ID>
# COGNITO_CLIENT_ID = <NEW_CLIENT_ID>

# Frontend buckets
# RESEARCH_FRONTEND_S3_BUCKET = emotioxv3-research-frontend-new
# PARTICIPANT_FRONTEND_S3_BUCKET = emotioxv3-participant-frontend-new
# RESEARCH_FRONTEND_CLOUDFRONT_ID = <NEW_RESEARCH_CF_ID>
# PARTICIPANT_FRONTEND_CLOUDFRONT_ID = <NEW_PARTICIPANT_CF_ID>

# URLs
# VITE_PARTICIPANT_FRONTEND_URL = https://participant.emotiox.org
```

### FASE 10: Desplegar Backend

#### 10.1 Configurar AWS CLI Local
```bash
# Configurar AWS CLI para usar nuevo perfil por defecto
export AWS_PROFILE=cefal
export AWS_REGION=us-east-1

# Verificar
aws sts get-caller-identity
```

#### 10.2 Build y Deploy
```bash
cd backend

# Instalar dependencias
npm ci --legacy-peer-deps

# Build
npm run build

# Verificar que dist/ se creó correctamente
ls -la dist/

# Deploy a producción
npx serverless deploy --stage production --aws-profile cefal

# Guardar outputs
npx serverless info --stage production --aws-profile cefal > deployment_info.txt
cat deployment_info.txt
```

#### 10.3 Obtener API Gateway URLs
```bash
# REST API
NEW_API_URL=$(aws cloudformation describe-stacks \
  --stack-name emotioxv3-backend-production \
  --query "Stacks[0].Outputs[?OutputKey=='ServiceEndpoint'].OutputValue | [0]" \
  --output text \
  --profile cefal)

echo "Nueva API URL: $NEW_API_URL"

# WebSocket API
NEW_WS_URL=$(aws cloudformation describe-stacks \
  --stack-name emotioxv3-backend-production \
  --query "Stacks[0].Outputs[?contains(OutputKey,'WebSocket')].OutputValue | [0]" \
  --output text \
  --profile cefal)

echo "Nueva WebSocket URL: $NEW_WS_URL"

# Si usas custom domain
echo "Custom Domain: https://api.emotiox.org"
```

### FASE 11: Configurar Custom Domain para API

#### 11.1 Crear Custom Domain Mapping
```bash
# Crear custom domain en API Gateway
aws apigatewayv2 create-domain-name \
  --domain-name api.emotiox.org \
  --domain-name-configurations "CertificateArn=$NEW_API_CERT_ARN" \
  --region us-east-1 \
  --profile cefal \
  > api_custom_domain.json

# Obtener target domain name
API_TARGET_DOMAIN=$(cat api_custom_domain.json | jq -r '.DomainNameConfigurations[0].ApiGatewayDomainName')

# Crear mapping
REST_API_ID=$(aws cloudformation describe-stacks \
  --stack-name emotioxv3-backend-production \
  --query "Stacks[0].Outputs[?OutputKey=='RestApiIdForDomainMapping'].OutputValue | [0]" \
  --output text \
  --profile cefal)

aws apigatewayv2 create-api-mapping \
  --domain-name api.emotiox.org \
  --api-id $REST_API_ID \
  --stage production \
  --region us-east-1 \
  --profile cefal
```

#### 11.2 Actualizar DNS (Route53)
```bash
# Si usas Route53 para emotiox.org
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='emotiox.org.'].Id | [0]" \
  --output text \
  --profile cefal)

# Crear/actualizar registro A para api.emotiox.org
cat > api_dns_change.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.emotiox.org",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "$API_TARGET_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://api_dns_change.json \
  --profile cefal
```

### FASE 12: Actualizar DNS para Frontends

```bash
# Actualizar research.emotiox.org
cat > research_dns_change.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "research.emotiox.org",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "$NEW_RESEARCH_CF_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://research_dns_change.json \
  --profile cefal

# Actualizar participant.emotiox.org
cat > participant_dns_change.json <<EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "participant.emotiox.org",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "$NEW_PARTICIPANT_CF_DOMAIN",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch file://participant_dns_change.json \
  --profile cefal
```

### FASE 13: Generar runtime-config.json y Subir a S3

```bash
cd backend

# Generar runtime-config.json
cat > runtime-config.json <<EOF
{
  "apiBaseUrl": "https://api.emotiox.org",
  "researchBaseUrl": "https://$NEW_RESEARCH_CF_DOMAIN",
  "participantBaseUrl": "https://$NEW_PARTICIPANT_CF_DOMAIN"
}
EOF

# Subir a buckets de frontend
aws s3 cp runtime-config.json s3://emotioxv3-research-frontend-new/runtime-config.json \
  --content-type "application/json" \
  --cache-control "no-store, max-age=0" \
  --metadata-directive REPLACE \
  --profile cefal

aws s3 cp runtime-config.json s3://emotioxv3-participant-frontend-new/runtime-config.json \
  --content-type "application/json" \
  --cache-control "no-store, max-age=0" \
  --metadata-directive REPLACE \
  --profile cefal

# Invalidar cache de CloudFront
aws cloudfront create-invalidation \
  --distribution-id $NEW_RESEARCH_CF_ID \
  --paths "/runtime-config.json" \
  --profile cefal

aws cloudfront create-invalidation \
  --distribution-id $NEW_PARTICIPANT_CF_ID \
  --paths "/runtime-config.json" \
  --profile cefal
```

### FASE 14: Deploy Frontends desde GitHub Actions

#### 14.1 Trigger Workflows Manualmente
```bash
# Opción 1: Hacer un commit dummy para trigger workflows
git commit --allow-empty -m "chore: trigger deployment to new AWS account"
git push origin main

# Opción 2: Trigger manualmente desde GitHub UI
# - Ir a Actions tab
# - Seleccionar "Deploy Backend to AWS Lambda" → Run workflow
# - Seleccionar "Deploy Research Frontend to S3/CloudFront" → Run workflow
# - Seleccionar "Deploy Participant Frontend to S3/CloudFront" → Run workflow

# Opción 3: Usar GitHub CLI
gh workflow run "Deploy Backend to AWS Lambda"
gh workflow run "Deploy Research Frontend to S3/CloudFront"
gh workflow run "Deploy Participant Frontend to S3/CloudFront"
```

#### 14.2 Monitorear Deployments
```bash
# Monitorear workflows
gh run list --limit 5

# Ver detalles de un run específico
gh run view <run-id>

# Ver logs si hay errores
gh run view <run-id> --log-failed
```

### FASE 15: Verificación y Testing

#### 15.1 Verificar Backend
```bash
# Health check
curl https://api.emotiox.org/health

# Test de autenticación
curl -X POST https://api.emotiox.org/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}'

# Test de endpoints protegidos
curl https://api.emotiox.org/api/researches \
  -H "Authorization: Bearer <token>"
```

#### 15.2 Verificar Frontends
```bash
# Research Frontend
curl -I https://research.emotiox.org
curl https://research.emotiox.org/runtime-config.json

# Participant Frontend
curl -I https://participant.emotiox.org
curl https://participant.emotiox.org/runtime-config.json
```

#### 15.3 Verificar CloudFront
```bash
# Research CloudFront
aws cloudfront get-distribution --id $NEW_RESEARCH_CF_ID --profile cefal | jq '.Distribution.Status'

# Participant CloudFront
aws cloudfront get-distribution --id $NEW_PARTICIPANT_CF_ID --profile cefal | jq '.Distribution.Status'
```

#### 15.4 Verificar Cognito
```bash
# Test de login con Google
# Ir a: https://research.emotiox.org
# Intentar login con Google OAuth

# Verificar usuarios
aws cognito-idp list-users \
  --user-pool-id $NEW_USER_POOL_ID \
  --region us-east-1 \
  --profile cefal
```

#### 15.5 Verificar Base de Datos
```bash
# Conectar y verificar datos
psql -h <db_host> -U <db_user> -d emotioxv3 -c "SELECT COUNT(*) FROM researches;"
psql -h <db_host> -U <db_user> -d emotioxv3 -c "SELECT COUNT(*) FROM users;"
```

#### 15.6 Testing Funcional Completo
```bash
# 1. Login con Google OAuth
# 2. Crear un research
# 3. Configurar stages y modules
# 4. Generar link de participante
# 5. Abrir link en participant frontend
# 6. Completar módulos como participante
# 7. Verificar respuestas en research frontend
# 8. Verificar datos en base de datos
```

### FASE 16: Monitoreo Post-Migración

#### 16.1 Configurar CloudWatch Alarms
```bash
# Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name "emotioxv3-lambda-errors-production" \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=emotioxv3-backend-production-api \
  --profile cefal

# API Gateway 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name "emotioxv3-api-5xx-errors-production" \
  --alarm-description "Alert on API Gateway 5xx errors" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --profile cefal
```

#### 16.2 Verificar Logs
```bash
# Lambda logs
aws logs tail /aws/lambda/emotioxv3-backend-production-api --follow --profile cefal

# API Gateway logs
# Habilitar logging en API Gateway primero
aws apigateway update-stage \
  --rest-api-id $REST_API_ID \
  --stage-name production \
  --patch-operations op=replace,path=/logging/loglevel,value=INFO \
  --profile cefal
```

#### 16.3 Revisar Costos
```bash
# Obtener estimado de costos actual
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-01-31 \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --profile cefal

# Configurar budget alert
aws budgets create-budget \
  --account-id 058310292956 \
  --budget file://budget.json \
  --profile cefal
```

### FASE 17: Cleanup de Recursos Antiguos

⚠️ **IMPORTANTE**: Solo ejecutar después de confirmar que la nueva infraestructura funciona correctamente y después de al menos 1 semana de operación estable.

```bash
# Backup final antes de eliminar
# - Backup de base de datos antigua
# - Exportar configuración de Cognito antigua
# - Descargar todos los archivos de S3 antiguos

# Deshabilitar recursos antiguos (no eliminar aún)
# 1. Deshabilitar CloudFront distributions antiguas
# 2. Detener Lambda functions antiguas
# 3. Desactivar Cognito user pool antiguo

# Esperar 2 semanas más antes de eliminar permanentemente

# Eliminar recursos (solo después de confirmación)
# aws cloudfront delete-distribution --id <old_cf_id> --if-match <etag>
# aws s3 rb s3://<old_bucket> --force
# aws cognito-idp delete-user-pool --user-pool-id <old_pool_id>
# aws cloudformation delete-stack --stack-name <old_stack>
```

---

## Checklist de Migración

### Pre-Migración
- [ ] Backup completo de base de datos
- [ ] Exportar configuración de Cognito
- [ ] Documentar configuración actual
- [ ] Backup de archivos S3
- [ ] Notificar a stakeholders sobre migración

### Configuración Nueva Cuenta
- [ ] Configurar AWS CLI con nuevas credenciales
- [ ] Verificar servicios habilitados
- [ ] Verificar límites de servicio

### Base de Datos
- [ ] Crear nueva instancia RDS o configurar Neon
- [ ] Restaurar backup
- [ ] Verificar datos

### Certificados SSL
- [ ] Solicitar certificados en ACM
- [ ] Validar certificados vía DNS
- [ ] Confirmar validación exitosa

### Cognito
- [ ] Crear User Pool
- [ ] Crear App Client
- [ ] Configurar dominio
- [ ] Configurar Google OAuth
- [ ] Actualizar Google OAuth redirect URIs
- [ ] Migrar usuarios (opcional)

### S3 Buckets
- [ ] Crear bucket research frontend
- [ ] Crear bucket participant frontend
- [ ] Crear bucket media
- [ ] Configurar políticas y CORS
- [ ] Copiar contenido de buckets antiguos

### CloudFront
- [ ] Crear distribución research frontend
- [ ] Crear distribución participant frontend
- [ ] Configurar certificados SSL
- [ ] Configurar custom domains

### SSM Parameter Store
- [ ] Crear parámetros de production
- [ ] Crear parámetros de dev (opcional)
- [ ] Verificar parámetros SecureString

### Backend
- [ ] Actualizar serverless.yml con nuevo certificate ARN
- [ ] Build del backend
- [ ] Deploy a production
- [ ] Verificar deployment exitoso
- [ ] Obtener API Gateway URLs

### Custom Domain API
- [ ] Crear custom domain mapping
- [ ] Actualizar DNS en Route53
- [ ] Verificar propagación DNS

### Frontends
- [ ] Actualizar DNS research.emotiox.org
- [ ] Actualizar DNS participant.emotiox.org
- [ ] Generar runtime-config.json
- [ ] Subir runtime-config.json a S3
- [ ] Invalidar cache de CloudFront
- [ ] Trigger deployments desde GitHub Actions

### GitHub
- [ ] Actualizar GitHub Secrets
- [ ] Actualizar AWS credentials
- [ ] Actualizar bucket names
- [ ] Actualizar CloudFront IDs
- [ ] Actualizar Cognito IDs

### Testing
- [ ] Backend health check
- [ ] Test de autenticación
- [ ] Test de endpoints protegidos
- [ ] Frontend research carga correctamente
- [ ] Frontend participant carga correctamente
- [ ] runtime-config.json se carga correctamente
- [ ] Google OAuth funciona
- [ ] Crear research
- [ ] Generar link de participante
- [ ] Completar módulos como participante
- [ ] Verificar respuestas en database

### Monitoreo
- [ ] Configurar CloudWatch alarms
- [ ] Verificar logs
- [ ] Configurar budget alerts
- [ ] Monitorear métricas por 1 semana

### Cleanup (después de 2+ semanas)
- [ ] Backup final de recursos antiguos
- [ ] Deshabilitar recursos antiguos
- [ ] Esperar confirmación
- [ ] Eliminar recursos antiguos

---

## Troubleshooting

### Error: Certificado no válido
```bash
# Verificar estado del certificado
aws acm describe-certificate --certificate-arn <cert_arn> --region us-east-1 --profile cefal

# Si no está validado, agregar registros CNAME en DNS
# Esperar hasta que Status sea "ISSUED"
```

### Error: CloudFront no accede a S3
```bash
# Verificar política de bucket
aws s3api get-bucket-policy --bucket <bucket_name> --profile cefal

# Verificar que la política permite GetObject
# Verificar CORS configuration
```

### Error: Lambda timeout
```bash
# Aumentar timeout en serverless.yml
# timeout: 60

# Verificar que Lambda tiene permisos para VPC (si aplica)
# Verificar security groups y network ACLs
```

### Error: Cognito no autentica
```bash
# Verificar callback URLs en App Client
# Verificar que Google OAuth está configurado correctamente
# Verificar que redirect URIs en Google Cloud Console incluyen nueva URL de Cognito
```

### Error: DNS no resuelve
```bash
# Verificar propagación DNS
dig research.emotiox.org
dig participant.emotiox.org
dig api.emotiox.org

# Esperar propagación (puede tardar hasta 48 horas)
# Verificar registros en Route53
```

---

## Recursos y Referencias

### Documentación AWS
- [Serverless Framework](https://www.serverless.com/framework/docs)
- [AWS Lambda](https://docs.aws.amazon.com/lambda/)
- [Amazon Cognito](https://docs.aws.amazon.com/cognito/)
- [Amazon S3](https://docs.aws.amazon.com/s3/)
- [Amazon CloudFront](https://docs.aws.amazon.com/cloudfront/)
- [AWS Certificate Manager](https://docs.aws.amazon.com/acm/)
- [Amazon Route53](https://docs.aws.amazon.com/route53/)

### Scripts de Migración
- Todos los comandos de este documento pueden ser automatizados en scripts
- Revisar carpeta `scripts/` para helpers existentes

### Contacto y Soporte
- AWS Support: https://console.aws.amazon.com/support/
- Google Cloud Support (OAuth): https://support.google.com/cloud/

---

## Notas Finales

1. **Prueba en Dev primero**: Considera hacer una migración de prueba del ambiente dev antes de production
2. **Ventana de mantenimiento**: Programa la migración en horario de bajo tráfico
3. **Rollback plan**: Ten un plan de rollback en caso de problemas críticos
4. **Comunicación**: Mantén informados a usuarios sobre posibles interrupciones
5. **Monitoreo continuo**: Monitorea intensivamente los primeros días post-migración
6. **Costos**: Mantén ambas cuentas activas por al menos 2 semanas antes del cleanup

**¡Buena suerte con la migración!**
