# Instrucciones para Deploy del Backend

## Variables de Entorno Requeridas

Para hacer el deploy del backend, necesitas configurar las siguientes variables de entorno:

### Base de Datos
- `DB_HOST` - Host de la base de datos PostgreSQL
- `DB_PORT` - Puerto de la base de datos (generalmente 5432)
- `DB_NAME` - Nombre de la base de datos
- `DB_USER` - Usuario de la base de datos
- `DB_PASSWORD` - Contraseña de la base de datos

### AWS
- `AWS_REGION` - Región de AWS (ej: us-east-1)
- `S3_BUCKET_NAME` - Nombre del bucket S3 (ya configurado)
- `AWS_ACCESS_KEY_ID` - Access Key de AWS (ya configurado)
- `AWS_SECRET_ACCESS_KEY` - Secret Key de AWS (ya configurado)

### Cognito (Opcional)
- `COGNITO_USER_POOL_ID` - ID del User Pool de Cognito
- `COGNITO_CLIENT_ID` - Client ID de Cognito

### Stage
- `API_STAGE` - Stage del API (default: dev)

## Cómo Configurar

### Opción 1: Agregar al archivo .env

Agrega las variables faltantes al archivo `backend/.env`:

```bash
# Base de Datos
DB_HOST=tu-db-host
DB_PORT=5432
DB_NAME=tu-db-name
DB_USER=tu-db-user
DB_PASSWORD=tu-db-password

# AWS
AWS_REGION=us-east-1
S3_BUCKET_NAME=emotioxv3-media-041238861016
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key

# Cognito (opcional)
COGNITO_USER_POOL_ID=tu-pool-id
COGNITO_CLIENT_ID=tu-client-id

# Stage
API_STAGE=dev
```

### Opción 2: Exportar variables antes del deploy

```bash
export DB_HOST=tu-db-host
export DB_PORT=5432
export DB_NAME=tu-db-name
export DB_USER=tu-db-user
export DB_PASSWORD=tu-db-password
export AWS_REGION=us-east-1
export S3_BUCKET_NAME=emotioxv3-media-041238861016
export API_STAGE=dev

cd backend
npm run build
npm run deploy
```

## Ejecutar Deploy

Una vez configuradas las variables:

```bash
cd backend
bash deploy.sh
```

O manualmente:

```bash
cd backend
npm run build
npm run deploy
```

## Cambios que se están desplegando

- ✅ `ResponseContentType` agregado a `GetObjectCommand` en `getMediaUrl()` y `getMediaUrlByS3Key()`
- ✅ Esto soluciona el error `ERR_BLOCKED_BY_ORB` al cargar imágenes
