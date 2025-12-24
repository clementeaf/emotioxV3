# Configuración de Google OAuth con AWS Cognito

Este documento explica cómo configurar Google OAuth para que funcione con el login de Google en la aplicación.

## Requisitos Previos

1. AWS Cognito User Pool creado
2. Acceso a AWS Console
3. Credenciales de Google OAuth (Client ID y Client Secret)

## Paso 1: Configurar Google como Identity Provider en Cognito

1. Ve a **AWS Console** → **Cognito** → Tu User Pool
2. En el menú lateral, ve a **Sign-in experience** → **Federated identity provider sign-in**
3. Haz clic en **Add identity provider**
4. Selecciona **Google**
5. Ingresa:
   - **App client ID**: Tu Google OAuth Client ID
   - **App client secret**: Tu Google OAuth Client Secret
   - **Authorized scopes**: `openid email profile`
6. Haz clic en **Add identity provider**

## Paso 2: Configurar Cognito Hosted UI Domain

1. En el User Pool, ve a **App integration** → **Domain**
2. Si no tienes un dominio, crea uno:
   - Haz clic en **Create Cognito domain**
   - Ingresa un nombre único (ej: `emotiox-auth`)
   - Guarda el dominio completo (ej: `emotiox-auth.auth.us-east-1.amazoncognito.com`)

## Paso 3: Configurar App Client Settings

1. En el User Pool, ve a **App integration** → **App client list**
2. Selecciona tu App Client
3. En **Hosted UI**, configura:
   - **Allowed callback URLs**: 
     - `https://{API_GATEWAY_URL}/dev/auth/google/callback` (producción)
     - `http://localhost:3000/auth/google/callback` (desarrollo local)
   - **Allowed sign-out URLs**:
     - `https://{FRONTEND_URL}/login` (producción)
     - `http://localhost:5173/login` (desarrollo local)
   - **Allowed OAuth flows**: Marca **Authorization code grant**
   - **Allowed OAuth scopes**: Marca **openid**, **email**, **profile**
   - **Identity providers**: Marca **Google**

## Paso 4: Configurar Variables de Entorno en SSM Parameter Store

Ejecuta estos comandos para configurar los parámetros necesarios:

```bash
# COGNITO_DOMAIN (el dominio del Hosted UI)
aws ssm put-parameter \
  --name "/emotioxv3/dev/COGNITO_DOMAIN" \
  --value "emotiox-auth.auth.us-east-1.amazoncognito.com" \
  --type "String" \
  --region us-east-1

# COGNITO_CLIENT_SECRET (solo si tu App Client requiere secret)
aws ssm put-parameter \
  --name "/emotioxv3/dev/COGNITO_CLIENT_SECRET" \
  --value "tu-client-secret-aqui" \
  --type "SecureString" \
  --region us-east-1

# RESEARCH_FRONTEND_URL (URL del frontend para redirigir después del login)
aws ssm put-parameter \
  --name "/emotioxv3/dev/RESEARCH_FRONTEND_URL" \
  --value "https://d2mgq2ppntnjct.cloudfront.net" \
  --type "String" \
  --region us-east-1
```

**Nota**: Para producción, reemplaza `dev` con el stage correspondiente (ej: `prod`).

## Paso 5: Verificar que API_BASE_URL se construya correctamente

El código construye automáticamente `API_BASE_URL` desde el `requestContext` de API Gateway. Si necesitas override, puedes agregarlo a SSM:

```bash
aws ssm put-parameter \
  --name "/emotioxv3/dev/API_BASE_URL" \
  --value "https://ro05auvmxc.execute-api.us-east-1.amazonaws.com/dev" \
  --type "String" \
  --region us-east-1
```

## Flujo de Autenticación

1. Usuario hace clic en "Continue with Google" en el frontend
2. Frontend redirige a `{API_BASE_URL}/auth/google`
3. Backend redirige a Cognito Hosted UI con Google como identity provider
4. Usuario se autentica con Google
5. Cognito redirige a `{API_BASE_URL}/auth/google/callback` con código de autorización
6. Backend intercambia código por tokens
7. Backend crea cookies httpOnly con tokens
8. Backend redirige a `{FRONTEND_URL}/dashboard`

## Troubleshooting

### Error: "Google OAuth not configured"
- Verifica que `COGNITO_DOMAIN` esté en SSM Parameter Store
- Verifica que `COGNITO_CLIENT_ID` esté configurado

### Error: "Invalid redirect_uri"
- Asegúrate de que el callback URL en Cognito App Client Settings coincida exactamente con `{API_BASE_URL}/auth/google/callback`
- Verifica que `API_BASE_URL` se construya correctamente desde `requestContext`

### Error: "Failed to exchange authorization code"
- Verifica que `COGNITO_CLIENT_SECRET` esté en SSM si tu App Client requiere secret
- Verifica que el código de autorización no haya expirado (debe usarse inmediatamente)

### Las cookies no se establecen
- Verifica que CORS esté configurado correctamente
- Verifica que `Access-Control-Allow-Credentials: true` esté presente
- Verifica que el frontend use `withCredentials: true` en las requests

