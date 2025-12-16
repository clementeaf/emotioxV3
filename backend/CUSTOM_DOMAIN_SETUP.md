## Custom Domain (API Gateway) - Opcional (si el cliente provee dominio)

Objetivo: exponer el backend bajo un **dominio estable** (ej: `api.<cliente>.com`) para que los frontends no dependan de hostnames `*.execute-api...` que pueden cambiar.

Si **no hay dominio disponible**, el enfoque recomendado es publicar un `runtime-config.json` (ver workflow `deploy-backend.yml`) con el `apiBaseUrl` real y que los frontends lo lean en runtime.

### Requisitos
- **AWS ACM certificate** (en `us-east-1`) para `api.<cliente>.com`
- **DNS** del dominio (idealmente Route53, pero puede ser cualquier proveedor)
- Credenciales AWS configuradas localmente (`aws configure`)

### 1) Crear/validar el certificado (ACM)
- En AWS Console → **ACM (us-east-1)** → Request public certificate
- Domain: `api.<cliente>.com`
- Validación: DNS
- Esperar estado: **Issued**

### 2) Crear el Custom Domain + Base Path Mapping (con Serverless)
Este repo usa `serverless-domain-manager` y está configurado en `backend/serverless.yml` bajo `custom.customDomain`.

Variables opcionales:
- `API_CUSTOM_DOMAIN_NAME` (default: `api.<cliente>.com`)
- `API_CUSTOM_DOMAIN_BASE_PATH` (default: `dev`, `production`, etc. según `provider.stage`)
- `API_CUSTOM_DOMAIN_CERT_NAME` (default: `api.<cliente>.com`)

Comandos:

```bash
cd backend

# Crear el dominio (API Gateway custom domain)
npm run domain:create

# Deploy backend al stage (dev por defecto; usa API_STAGE para cambiar)
npm run deploy
```

### 3) Configurar DNS (CNAME o Alias)
Una vez creado el dominio, API Gateway te mostrará un **Target domain name** (algo como `d-xxxxxx.execute-api...`).

En tu DNS:
- Crear un **CNAME** `api.<cliente>.com` → target domain name de API Gateway
- Si usas Route53, podés usar un **A/AAAA Alias** al target de API Gateway (más limpio).

### 4) Verificación
Cuando el DNS propague:

```bash
curl https://api.<cliente>.com/dev/health
curl https://api.<cliente>.com/dev/config
```

### 5) Frontends: apuntar siempre al dominio estable
Recomendado (GitHub Secrets / CI):
- `VITE_API_URL_PRODUCTION=https://api.<cliente>.com/production`

Alternativa (sin rebuild): publicar `/runtime-config.json` en cada frontend:
```json
{ "apiBaseUrl": "https://api.<cliente>.com/production" }
```

### 6) Eliminar el dominio (si necesitás limpiar)
```bash
cd backend
npm run domain:remove
```

