# EmotioxV3 - Guía de Setup AWS (Sin Problemas)

## 🎯 Objetivo
Configurar correctamente AWS para evitar los problemas más comunes:
- ❌ CORS errors
- ❌ Cognito authentication issues
- ❌ RDS connection problems
- ❌ Lambda timeout errors
- ❌ S3 presigned URL failures

---

## 📋 Checklist de Configuración

### ✅ Prerequisitos
- [ ] Cuenta de AWS activa
- [ ] AWS CLI instalado y configurado
- [ ] Credenciales IAM con permisos adecuados
- [ ] Node.js 20+ instalado
- [ ] Serverless Framework instalado globalmente

---

## 🔐 1. IAM User y Permisos

### Crear IAM User para Deployment

```bash
# Crear usuario
aws iam create-user --user-name emotioxv3-deployer

# Crear access key
aws iam create-access-key --user-name emotioxv3-deployer
```

### Políticas Necesarias

Crear política personalizada `emotioxv3-deploy-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "lambda:*",
        "apigateway:*",
        "iam:GetRole",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:PassRole",
        "logs:*",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSubnets",
        "ec2:DescribeVpcs",
        "rds:*",
        "cognito-idp:*"
      ],
      "Resource": "*"
    }
  ]
}
```

Aplicar política:
```bash
aws iam put-user-policy \
  --user-name emotioxv3-deployer \
  --policy-name EmotioxV3DeployPolicy \
  --policy-document file://emotioxv3-deploy-policy.json
```

### Configurar AWS CLI

```bash
aws configure --profile emotioxv3
# AWS Access Key ID: [tu access key]
# AWS Secret Access Key: [tu secret key]
# Default region name: us-east-1
# Default output format: json
```

---

## 🗄️ 2. RDS PostgreSQL - Configuración Correcta

### Opción A: RDS en VPC (Producción)

**⚠️ Problema Común**: Lambda no puede conectarse a RDS porque están en diferentes VPCs o subnets.

**✅ Solución**: Lambda y RDS en la misma VPC.

#### Paso 1: Crear VPC y Subnets

```bash
# Crear VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=emotioxv3-vpc}]'

# Anotar VPC ID
VPC_ID="vpc-xxxxx"

# Crear subnet privada 1 (us-east-1a)
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=emotioxv3-private-1a}]'

# Crear subnet privada 2 (us-east-1b) - RDS requiere 2 AZs
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=emotioxv3-private-1b}]'

# Anotar Subnet IDs
SUBNET_1="subnet-xxxxx"
SUBNET_2="subnet-yyyyy"
```

#### Paso 2: Crear Security Group

```bash
# Security Group para RDS
aws ec2 create-security-group \
  --group-name emotioxv3-rds-sg \
  --description "Security group for EmotioxV3 RDS" \
  --vpc-id $VPC_ID

# Anotar Security Group ID
RDS_SG_ID="sg-xxxxx"

# Permitir tráfico PostgreSQL desde Lambda
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $RDS_SG_ID
```

#### Paso 3: Crear DB Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name emotioxv3-db-subnet-group \
  --db-subnet-group-description "Subnet group for EmotioxV3 RDS" \
  --subnet-ids $SUBNET_1 $SUBNET_2
```

#### Paso 4: Crear RDS Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier emotioxv3-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password "TU_PASSWORD_SEGURO_AQUI" \
  --allocated-storage 20 \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name emotioxv3-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --publicly-accessible false \
  --storage-encrypted \
  --enable-cloudwatch-logs-exports '["postgresql"]' \
  --tags Key=Project,Value=EmotioxV3
```

**Esperar ~10 minutos** hasta que el estado sea `available`:
```bash
aws rds describe-db-instances \
  --db-instance-identifier emotioxv3-db \
  --query 'DBInstances[0].DBInstanceStatus'
```

#### Paso 5: Obtener Endpoint

```bash
aws rds describe-db-instances \
  --db-instance-identifier emotioxv3-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

### Opción B: RDS con Acceso Público (Solo Desarrollo)

**⚠️ NO RECOMENDADO PARA PRODUCCIÓN**

```bash
aws rds create-db-instance \
  --db-instance-identifier emotioxv3-db-dev \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password "PASSWORD" \
  --allocated-storage 20 \
  --publicly-accessible true \
  --backup-retention-period 0
```

---

## 🪣 3. S3 Bucket - Configuración CORS Correcta

### Crear Bucket

```bash
aws s3api create-bucket \
  --bucket emotioxv3-media \
  --region us-east-1
```

### Configurar CORS

**⚠️ Problema Común**: CORS no configurado o mal configurado.

**✅ Solución**: Configuración CORS permisiva para desarrollo, restrictiva para producción.

Crear archivo `s3-cors-config.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://research.emotioxv3.com",
        "https://participant.emotioxv3.com"
      ],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "x-amz-request-id"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Aplicar configuración:
```bash
aws s3api put-bucket-cors \
  --bucket emotioxv3-media \
  --cors-configuration file://s3-cors-config.json
```

### Configurar Bucket Policy (Presigned URLs)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPresignedURLs",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::emotioxv3-media/*",
      "Condition": {
        "StringLike": {
          "aws:Referer": [
            "https://research.emotioxv3.com/*",
            "https://participant.emotioxv3.com/*",
            "http://localhost:*"
          ]
        }
      }
    }
  ]
}
```

```bash
aws s3api put-bucket-policy \
  --bucket emotioxv3-media \
  --policy file://s3-bucket-policy.json
```

### Bloquear Acceso Público (excepto presigned URLs)

```bash
aws s3api put-public-access-block \
  --bucket emotioxv3-media \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

---

## 🔐 4. Cognito - Configuración Sin Problemas

### Crear User Pool

```bash
aws cognito-idp create-user-pool \
  --pool-name emotioxv3-users \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }' \
  --auto-verified-attributes email \
  --username-attributes email \
  --mfa-configuration OFF \
  --email-configuration '{
    "EmailSendingAccount": "COGNITO_DEFAULT"
  }' \
  --schema '[
    {
      "Name": "email",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    },
    {
      "Name": "given_name",
      "AttributeDataType": "String",
      "Required": false,
      "Mutable": true
    },
    {
      "Name": "family_name",
      "AttributeDataType": "String",
      "Required": false,
      "Mutable": true
    }
  ]'
```

Anotar `UserPoolId`:
```bash
USER_POOL_ID="us-east-1_xxxxx"
```

### Crear App Client

**⚠️ Problema Común**: App client sin configuración CORS o callback URLs incorrectas.

**✅ Solución**: Configurar correctamente callback URLs y CORS.

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-name emotioxv3-web-client \
  --no-generate-secret \
  --explicit-auth-flows \
    ALLOW_USER_PASSWORD_AUTH \
    ALLOW_REFRESH_TOKEN_AUTH \
    ALLOW_USER_SRP_AUTH \
  --supported-identity-providers COGNITO \
  --callback-urls \
    "http://localhost:5173" \
    "http://localhost:5173/callback" \
    "https://research.emotioxv3.com" \
    "https://research.emotioxv3.com/callback" \
  --logout-urls \
    "http://localhost:5173" \
    "https://research.emotioxv3.com" \
  --allowed-o-auth-flows code implicit \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client \
  --read-attributes email given_name family_name \
  --write-attributes email given_name family_name
```

Anotar `ClientId`:
```bash
CLIENT_ID="xxxxxxxxxxxxx"
```

### Configurar Dominio de Cognito (Hosted UI)

```bash
aws cognito-idp create-user-pool-domain \
  --domain emotioxv3-auth \
  --user-pool-id $USER_POOL_ID
```

### Crear Usuario Admin Inicial

```bash
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@emotioxv3.com \
  --user-attributes \
    Name=email,Value=admin@emotioxv3.com \
    Name=email_verified,Value=true \
    Name=given_name,Value=Admin \
    Name=family_name,Value=User \
  --message-action SUPPRESS

# Establecer password permanente
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username admin@emotioxv3.com \
  --password "TuPasswordSeguro123!" \
  --permanent
```

---

## 🚀 5. Serverless Framework - Configuración

### Actualizar `serverless.yml`

```yaml
service: emotioxv3-backend

frameworkVersion: '3'

provider:
  name: aws
  runtime: nodejs20.x
  stage: ${opt:stage, 'dev'}
  region: ${opt:region, 'us-east-1'}
  
  # VPC Configuration (CRÍTICO para RDS)
  vpc:
    securityGroupIds:
      - ${env:RDS_SECURITY_GROUP_ID}
    subnetIds:
      - ${env:SUBNET_1_ID}
      - ${env:SUBNET_2_ID}
  
  # Variables de entorno
  environment:
    DB_HOST: ${env:DB_HOST}
    DB_PORT: ${env:DB_PORT, '5432'}
    DB_NAME: ${env:DB_NAME}
    DB_USER: ${env:DB_USER}
    DB_PASSWORD: ${env:DB_PASSWORD}
    S3_BUCKET: ${env:S3_BUCKET_NAME}
    COGNITO_USER_POOL_ID: ${env:COGNITO_USER_POOL_ID}
    COGNITO_CLIENT_ID: ${env:COGNITO_CLIENT_ID}
    NODE_ENV: ${self:provider.stage}
  
  # Permisos IAM
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:PutObject
            - s3:DeleteObject
          Resource: "arn:aws:s3:::${env:S3_BUCKET_NAME}/*"
        - Effect: Allow
          Action:
            - cognito-idp:AdminGetUser
            - cognito-idp:AdminCreateUser
            - cognito-idp:AdminUpdateUserAttributes
          Resource: "arn:aws:cognito-idp:${self:provider.region}:*:userpool/${env:COGNITO_USER_POOL_ID}"
        - Effect: Allow
          Action:
            - logs:CreateLogGroup
            - logs:CreateLogStream
            - logs:PutLogEvents
          Resource: "*"

functions:
  api:
    handler: src/handler.handler
    timeout: 30
    memorySize: 512
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors:
            origin: '*'  # En producción, especificar dominios exactos
            headers:
              - Content-Type
              - X-Amz-Date
              - Authorization
              - X-Api-Key
              - X-Amz-Security-Token
              - X-Amz-User-Agent
            allowCredentials: true

plugins:
  - serverless-offline

custom:
  serverless-offline:
    httpPort: 3000
```

### Crear archivo `.env`

```bash
# Database
DB_HOST=emotioxv3-db.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=emotioxv3
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_AQUI

# AWS
AWS_REGION=us-east-1
S3_BUCKET_NAME=emotioxv3-media

# Cognito
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxx

# VPC (para deployment)
RDS_SECURITY_GROUP_ID=sg-xxxxx
SUBNET_1_ID=subnet-xxxxx
SUBNET_2_ID=subnet-yyyyy
```

### Crear `.env.example` (para el repo)

```bash
cp .env .env.example
# Editar .env.example y reemplazar valores sensibles con placeholders
```

---

## 🔧 6. Solución a Problemas Comunes

### Problema 1: CORS Error en API Gateway

**Error:**
```
Access to fetch at 'https://api...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Solución:**

1. Verificar configuración CORS en `serverless.yml`:
```yaml
cors:
  origin: 
    - http://localhost:5173
    - http://localhost:5174
    - https://research.emotioxv3.com
    - https://participant.emotioxv3.com
  headers:
    - Content-Type
    - Authorization
  allowCredentials: true
```

2. Asegurar que el backend retorna headers CORS:
```typescript
// src/utils/response.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // O dominio específico
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS'
};

export const success = (data: any, statusCode = 200) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(data)
});
```

### Problema 2: Lambda no puede conectarse a RDS

**Error:**
```
Error: connect ETIMEDOUT
```

**Causas comunes:**
- Lambda no está en la misma VPC que RDS
- Security Group no permite tráfico desde Lambda
- Subnets incorrectas

**Solución:**

1. Verificar que Lambda está en VPC:
```bash
aws lambda get-function-configuration \
  --function-name emotioxv3-backend-dev-api \
  --query 'VpcConfig'
```

2. Verificar Security Group permite PostgreSQL (5432):
```bash
aws ec2 describe-security-groups \
  --group-ids $RDS_SG_ID \
  --query 'SecurityGroups[0].IpPermissions'
```

3. Agregar regla si falta:
```bash
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $RDS_SG_ID
```

### Problema 3: Cognito Token Inválido

**Error:**
```
Invalid token
```

**Solución:**

1. Verificar que el token no ha expirado
2. Usar refresh token para obtener nuevo access token
3. Verificar configuración de App Client:

```typescript
// Frontend: Configuración correcta de Amplify
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: {
        email: true
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true
        }
      }
    }
  }
});
```

### Problema 4: S3 Presigned URL no funciona

**Error:**
```
Access Denied
```

**Solución:**

1. Verificar CORS en S3 (ver sección 3)
2. Generar presigned URL correctamente:

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: 'us-east-1' });

export const generatePresignedUploadUrl = async (
  key: string,
  contentType: string
) => {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hora
  });

  return url;
};
```

3. En el frontend, usar la URL correctamente:
```typescript
const uploadToS3 = async (file: File, presignedUrl: string) => {
  await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
};
```

### Problema 5: Lambda Timeout

**Error:**
```
Task timed out after 30.00 seconds
```

**Solución:**

1. Aumentar timeout en `serverless.yml`:
```yaml
functions:
  api:
    timeout: 60  # Máximo 900 segundos (15 min)
```

2. Optimizar queries de base de datos
3. Usar connection pooling:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10, // Máximo de conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

---

## ✅ Checklist Final de Verificación

Antes de hacer deploy:

- [ ] RDS creado y accesible
- [ ] Security Groups configurados correctamente
- [ ] S3 bucket creado con CORS configurado
- [ ] Cognito User Pool y App Client creados
- [ ] Variables de entorno en `.env` configuradas
- [ ] `serverless.yml` con VPC config correcto
- [ ] IAM user con permisos adecuados
- [ ] AWS CLI configurado con perfil correcto

---

## 🚀 Deploy

```bash
# Cargar variables de entorno
export $(cat .env | xargs)

# Deploy a dev
serverless deploy --stage dev --verbose

# Deploy a producción
serverless deploy --stage prod --verbose
```

---

## 📊 Monitoreo

### CloudWatch Logs

```bash
# Ver logs en tiempo real
serverless logs -f api --tail --stage dev

# Ver logs de un período específico
serverless logs -f api --startTime 1h --stage dev
```

### Métricas importantes

- Lambda invocations
- Lambda errors
- Lambda duration
- API Gateway 4xx/5xx errors
- RDS connections
- RDS CPU utilization

---

## 💰 Estimación de Costos (Uso Moderado)

| Servicio | Configuración | Costo Mensual |
|----------|--------------|---------------|
| RDS PostgreSQL | db.t3.micro, 20GB | ~$15 |
| Lambda | 1M requests, 512MB | ~$5 |
| S3 | 50GB storage, 10k requests | ~$5 |
| API Gateway | 1M requests | ~$3.50 |
| Cognito | <50k MAU | Gratis |
| CloudWatch Logs | 5GB | ~$2.50 |
| **Total** | | **~$31/mes** |

---

## 🎯 Próximos Pasos

1. Ejecutar todos los comandos de esta guía
2. Verificar que todo funciona con el checklist
3. Crear migraciones de base de datos
4. Implementar backend básico
5. Hacer primer deploy de prueba

¿Listo para empezar con el setup? 🚀
