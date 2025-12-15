# 🔧 Guía de Solución: Problemas de Conectividad Frontend-Backend AWS

**Fecha:** 2025-12-15  
**Estado:** CRÍTICO - Requiere acción inmediata

---

## 🎯 ACCIONES INMEDIATAS (Ejecutar en orden)

### 1️⃣ ARREGLAR DEPLOYMENT DEL BACKEND

**Problema:** Serverless Framework no puede leer las variables de entorno del archivo `.env`

**Solución A - Exportar variables antes del deploy (RECOMENDADO):**

```bash
cd backend

# Exportar todas las variables necesarias
export DB_HOST="tu-db-host-aqui"
export DB_PORT="5432"
export DB_NAME="emotioxv3"
export DB_USER="tu-usuario-aqui"
export DB_PASSWORD="tu-password-aqui"
export APP_AWS_REGION="us-east-1"
export S3_BUCKET_NAME="emotioxv3-media-041238861016"
export AWS_ACCESS_KEY_ID="AKIAQTGQHCTMDXK77ESZ"
export AWS_SECRET_ACCESS_KEY="tu-secret-key-aqui"
export COGNITO_USER_POOL_ID=""  # Opcional
export COGNITO_CLIENT_ID=""     # Opcional
export API_STAGE="dev"

# Verificar que se exportaron
echo $DB_HOST

# Ahora sí desplegar
npm run build
npm run deploy
```

**Solución B - Usar archivo .env.production:**

```bash
cd backend

# Crear archivo .env.production (copia tu .env actual y renómbralo)
cp .env .env.production

# Modificar serverless.yml para usar dotenv plugin
# (Esto requiere editar código - ver más abajo)
```

**⚠️ IMPORTANTE:** Guarda la URL que te devuelve el deploy, será algo como:
```
endpoints:
  ANY - https://XXXXXXXX.execute-api.us-east-1.amazonaws.com/dev/{proxy+}
```

---

### 2️⃣ ACTUALIZAR CORS EN BACKEND

**Archivo a modificar:** `backend/src/utils/response.ts`

**Cambio necesario (líneas 8-14):**

```typescript
const allowedOrigins = [
    // Development
    'http://localhost:12500',    // research-frontend dev
    'http://localhost:12600',    // participant-frontend dev
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    
    // Production - COMPLETAR CON TUS URLs REALES
    'https://research.useremotion.com',           // CloudFront research-frontend
    'https://participant.useremotion.com',        // CloudFront participant-frontend
    'https://d1234567890abc.cloudfront.net',     // CloudFront IDs (si aplica)
    'https://d0987654321xyz.cloudfront.net',
    
    // Staging (si aplica)
    'https://dev-research.useremotion.com',
    'https://dev-participant.useremotion.com',
];
```

**Cómo obtener las URLs correctas:**

```bash
# Ver distribuciones de CloudFront
aws cloudfront list-distributions --query 'DistributionList.Items[*].[Id,DomainName,Comment]' --output table

# O revisar GitHub Secrets
# Settings > Secrets and variables > Actions
# Buscar: RESEARCH_FRONTEND_CLOUDFRONT_ID, PARTICIPANT_FRONTEND_CLOUDFRONT_ID
```

**Después del cambio:**

```bash
cd backend
npm run build
npm run deploy  # Re-desplegar con CORS actualizado
```

---

### 3️⃣ CORREGIR CONFIGURACIÓN DE PARTICIPANT-FRONTEND

**Archivos a modificar:**

**`participant-frontend/.env`:**
```bash
# API Configuration
VITE_API_URL=https://vkgnkrk8gc.execute-api.us-east-1.amazonaws.com/dev
```

**`participant-frontend/.env.local`:**
```bash
# 🏠 LOCAL DEVELOPMENT CONFIGURATION
# Este archivo es para desarrollo local únicamente
# NO COMMITEAR ESTE ARCHIVO

# API Configuration
VITE_API_URL=https://vkgnkrk8gc.execute-api.us-east-1.amazonaws.com/dev
```

**⚠️ NOTA:** Si quieres usar backend local en desarrollo, crea un segundo archivo:

**`participant-frontend/.env.development`:**
```bash
VITE_API_URL=http://localhost:3000
```

Y modifica `package.json`:
```json
{
  "scripts": {
    "dev": "vite --mode development",
    "dev:prod": "vite --mode production",
  }
}
```

---

### 4️⃣ VERIFICAR GITHUB SECRETS

**Acciones:**

1. Ve a: `https://github.com/TU-USUARIO/emotioxV3/settings/secrets/actions`

2. Verifica que existan estos secrets:

```
✅ VITE_API_URL_PRODUCTION
   Valor esperado: https://vkgnkrk8gc.execute-api.us-east-1.amazonaws.com/dev

✅ VITE_PARTICIPANT_FRONTEND_URL
   Valor esperado: https://participant.useremotion.com (o tu URL real)

✅ AWS_ACCESS_KEY_ID
✅ AWS_SECRET_ACCESS_KEY
✅ AWS_REGION (us-east-1)

✅ RESEARCH_FRONTEND_S3_BUCKET
✅ PARTICIPANT_FRONTEND_S3_BUCKET
✅ RESEARCH_FRONTEND_CLOUDFRONT_ID
✅ PARTICIPANT_FRONTEND_CLOUDFRONT_ID
```

3. Si `VITE_API_URL_PRODUCTION` no existe o está mal:

```bash
# Crear/actualizar el secret
gh secret set VITE_API_URL_PRODUCTION --body "https://vkgnkrk8gc.execute-api.us-east-1.amazonaws.com/dev"

# O hacerlo manualmente en GitHub UI
```

---

### 5️⃣ RE-DESPLEGAR FRONTENDS

**Una vez que el backend esté funcionando y CORS actualizado:**

```bash
# Opción A: Trigger manual desde GitHub
# Ve a Actions > Deploy Research Frontend / Deploy Participant Frontend
# Click en "Run workflow"

# Opción B: Push a main
git add .
git commit -m "fix: update CORS and environment variables"
git push origin main
```

---

## 🧪 TESTING DE CONECTIVIDAD

### Test 1: Backend Health Check

```bash
# Debería retornar {"status":"healthy","timestamp":"..."}
curl https://vkgnkrk8gc.execute-api.us-east-1.amazonaws.com/dev/health
```

### Test 2: Backend Config Endpoint

```bash
# Debería retornar la configuración de API
curl https://vkgnkrk8gc.execute-api.us-east-1.amazonaws.com/dev/config
```

### Test 3: CORS Headers

```bash
# Verificar CORS desde research-frontend domain
curl -X OPTIONS \
  -H "Origin: https://research.useremotion.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  https://vkgnkrk8gc.execute-api.us-east-1.amazonaws.com/dev/health \
  -v
```

Deberías ver en la respuesta:
```
Access-Control-Allow-Origin: https://research.useremotion.com
Access-Control-Allow-Credentials: true
```

### Test 4: Frontend Local

```bash
# research-frontend
cd research-frontend
npm run dev
# Abrir http://localhost:12500
# Revisar Network tab en DevTools

# participant-frontend
cd participant-frontend
npm run dev
# Abrir http://localhost:12600
# Revisar Network tab en DevTools
```

**Errores esperados (antes de fix):**
- ❌ `CORS error`
- ❌ `Failed to fetch`
- ❌ `Network error`

**Resultado esperado (después de fix):**
- ✅ `200 OK` en `/config`
- ✅ Headers CORS correctos

---

## 🔍 DIAGNÓSTICO DE PROBLEMAS

### Si el backend no despliega:

```bash
cd backend

# Verificar que las variables estén exportadas
printenv | grep DB_HOST

# Si no aparece, exportarlas nuevamente
source .env  # Esto NO funciona con serverless, hay que exportar manualmente

# O usar este script helper:
cat > deploy-with-env.sh << 'EOF'
#!/bin/bash
set -a
source .env
set +a
npm run build
npm run deploy
EOF

chmod +x deploy-with-env.sh
./deploy-with-env.sh
```

### Si hay errores de CORS:

1. **Verificar que el origin esté en allowedOrigins**
   - Revisar `backend/src/utils/response.ts`
   - Agregar el origin exacto (incluir protocolo y puerto)

2. **Verificar que el backend esté re-desplegado**
   ```bash
   cd backend
   npm run build
   npm run deploy
   ```

3. **Limpiar caché de CloudFront**
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id E1234567890ABC \
     --paths "/*"
   ```

### Si participant-frontend no conecta:

```bash
# 1. Verificar .env
cat participant-frontend/.env
# Debería mostrar la URL del backend AWS

# 2. Rebuild
cd participant-frontend
npm run build

# 3. Test local con la nueva config
npm run dev
```

---

## 📊 CHECKLIST DE VALIDACIÓN

Marca cada item cuando esté completado:

- [ ] **Backend desplegado exitosamente**
  - [ ] Variables de entorno exportadas
  - [ ] `npm run deploy` sin errores
  - [ ] URL de API Gateway obtenida

- [ ] **CORS actualizado**
  - [ ] URLs de producción agregadas a `allowedOrigins`
  - [ ] Backend re-desplegado
  - [ ] Test de CORS pasando

- [ ] **participant-frontend configurado**
  - [ ] `.env` apuntando a backend AWS
  - [ ] `.env.local` apuntando a backend AWS
  - [ ] Build exitoso

- [ ] **GitHub Secrets verificados**
  - [ ] `VITE_API_URL_PRODUCTION` correcto
  - [ ] Todos los secrets de S3/CloudFront presentes

- [ ] **Frontends re-desplegados**
  - [ ] research-frontend deploy exitoso
  - [ ] participant-frontend deploy exitoso
  - [ ] CloudFront cache invalidado

- [ ] **Tests de conectividad pasando**
  - [ ] `/health` retorna 200
  - [ ] `/config` retorna configuración
  - [ ] CORS headers correctos
  - [ ] Frontend local conecta correctamente

---

## 🚨 PROBLEMAS CONOCIDOS Y SOLUCIONES

### Problema: "Cannot resolve variable at provider.environment.DB_HOST"

**Causa:** Serverless no lee archivos `.env` automáticamente.

**Solución:**
```bash
# Opción 1: Exportar manualmente
export DB_HOST="valor"
export DB_PORT="5432"
# ... etc

# Opción 2: Usar serverless-dotenv-plugin
npm install --save-dev serverless-dotenv-plugin

# Agregar a serverless.yml:
plugins:
  - serverless-offline
  - serverless-dotenv-plugin  # <-- AGREGAR

# Luego deploy normal
npm run deploy
```

### Problema: "Access-Control-Allow-Origin error"

**Causa:** El origin no está en la whitelist o hay mismatch.

**Solución:**
```typescript
// backend/src/utils/response.ts
const allowedOrigins = [
    'https://tu-dominio-exacto.com',  // SIN trailing slash
    // ...
];
```

**Verificar origin exacto:**
```javascript
// En browser console de tu frontend
console.log(window.location.origin);
// Copiar ese valor exacto a allowedOrigins
```

### Problema: "withCredentials CORS error"

**Causa:** No se puede usar `origin: '*'` con `credentials: true`.

**Solución:**
El backend actual ya maneja esto correctamente en Lambda.
Para desarrollo local (`server.ts`), cambiar:

```typescript
// backend/src/server.ts
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:12500',
            'http://localhost:12600',
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
```

---

## 📞 SOPORTE Y RECURSOS

**Comandos útiles:**

```bash
# Ver logs de Lambda
serverless logs -f api -t

# Ver info del stack
serverless info

# Ver distribuciones CloudFront
aws cloudfront list-distributions

# Ver buckets S3
aws s3 ls

# Test endpoint con curl
curl -v https://API_URL/health
```

**Archivos clave a revisar:**

- `backend/src/utils/response.ts` - CORS configuration
- `backend/serverless.yml` - Infrastructure config
- `research-frontend/.env` - API URL config
- `participant-frontend/.env` - API URL config
- `.github/workflows/*.yml` - CI/CD pipelines

---

## ✅ CONFIRMACIÓN FINAL

Una vez completados todos los pasos, deberías ver:

1. **Backend AWS:**
   - ✅ API Gateway respondiendo
   - ✅ CORS headers correctos
   - ✅ `/config` endpoint funcional

2. **research-frontend:**
   - ✅ Conecta al backend AWS
   - ✅ No hay errores CORS
   - ✅ Login funcional

3. **participant-frontend:**
   - ✅ Conecta al backend AWS
   - ✅ Puede cargar investigaciones públicas
   - ✅ Puede enviar respuestas

**Si todo funciona correctamente, este documento puede ser archivado.**

---

**Última actualización:** 2025-12-15  
**Responsable:** DevOps / Backend Team
