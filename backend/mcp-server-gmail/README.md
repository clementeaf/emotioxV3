# Gmail MCP Server

Servidor MCP (Model Context Protocol) para acceder y gestionar correos electrónicos de Gmail usando la API de Google.

## Características

- Listar correos electrónicos con filtros
- Obtener contenido completo de correos
- Buscar correos usando la sintaxis de búsqueda de Gmail
- Obtener hilos completos de conversación
- Listar etiquetas (labels) de Gmail

## Requisitos Previos

1. **Cuenta de Google** con Gmail habilitado
2. **Proyecto en Google Cloud Console** con Gmail API habilitada
3. **Credenciales OAuth 2.0** (Client ID y Client Secret)

## Instalación

```bash
cd backend/mcp-server-gmail
npm install
npm run build
```

## Configuración de Google Cloud Console

### Paso 1: Crear Proyecto y Habilitar Gmail API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services** → **Library**
4. Busca "Gmail API" y haz clic en **Enable**

### Paso 2: Crear Credenciales OAuth 2.0

1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **Create Credentials** → **OAuth client ID**
3. Si es la primera vez, configura la pantalla de consentimiento OAuth:
   - Tipo de aplicación: **External**
   - Nombre de la aplicación: "Emotiox Gmail MCP"
   - Agrega tu email como usuario de prueba
4. Selecciona **Application type**: **Desktop app** o **Web application**
5. Si eliges **Web application**, agrega estos redirect URIs:
   - `http://localhost:3000/oauth2callback`
   - `http://localhost:8080/oauth2callback`
6. Guarda el **Client ID** y **Client Secret**

### Paso 3: Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env` en la raíz del proyecto:

```bash
GMAIL_CLIENT_ID=tu-client-id-aqui
GMAIL_CLIENT_SECRET=tu-client-secret-aqui
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback
```

### Paso 4: Crear Archivo de Credenciales (Opcional)

Si prefieres usar un archivo JSON en lugar de variables de entorno, crea `backend/mcp-server-gmail/credentials.json`:

```json
{
  "installed": {
    "client_id": "tu-client-id",
    "client_secret": "tu-client-secret",
    "redirect_uris": ["http://localhost:3000/oauth2callback"]
  }
}
```

## Autenticación

Antes de usar el servidor MCP, debes autenticarte una vez:

```bash
cd backend/mcp-server-gmail
npm run build
npx tsx authenticate.ts
```

Este script:
1. Abrirá tu navegador para autorizar la aplicación
2. Te pedirá que inicies sesión con tu cuenta de Google
3. Te pedirá permisos para leer tu Gmail
4. Guardará el token en `token.json`

**Nota**: El token se guarda localmente y se refresca automáticamente cuando es necesario.

## Configuración en Cursor

Agrega la siguiente configuración a tu archivo de configuración MCP de Cursor (ubicado en `~/.cursor/mcp.json` o similar):

```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": [
        "/Users/clementefalcone/Desktop/personal/emotioxV3/backend/mcp-server-gmail/dist/index.js"
      ],
      "env": {
        "GMAIL_CLIENT_ID": "tu-client-id",
        "GMAIL_CLIENT_SECRET": "tu-client-secret",
        "GMAIL_REDIRECT_URI": "http://localhost:3000/oauth2callback"
      }
    }
  }
}
```

**Alternativa**: Si prefieres usar variables de entorno desde `.env`, crea un script wrapper:

```bash
#!/bin/bash
cd "$(dirname "$0")/../.."
source .env 2>/dev/null || true
export GMAIL_CLIENT_ID GMAIL_CLIENT_SECRET GMAIL_REDIRECT_URI
exec node backend/mcp-server-gmail/dist/index.js
```

Y en la configuración de Cursor:

```json
{
  "mcpServers": {
    "gmail": {
      "command": "/Users/clementefalcone/Desktop/personal/emotioxV3/backend/mcp-server-gmail/run.sh"
    }
  }
}
```

## Herramientas Disponibles

### 1. `list_emails`

Lista correos electrónicos con filtros opcionales.

**Parámetros:**
- `query` (string, opcional): Query de búsqueda de Gmail
  - Ejemplos: `"from:example@gmail.com"`, `"subject:test"`, `"is:unread"`
- `maxResults` (number, opcional): Número máximo de resultados (default: 10, max: 100)
- `pageToken` (string, opcional): Token de paginación

**Ejemplo:**
```json
{
  "query": "from:example@gmail.com is:unread",
  "maxResults": 20
}
```

### 2. `get_email`

Obtiene el contenido completo de un correo por ID.

**Parámetros:**
- `messageId` (string, requerido): ID del mensaje de Gmail
- `format` (string, opcional): Formato de respuesta (`full`, `metadata`, `minimal`, `raw`)

**Ejemplo:**
```json
{
  "messageId": "18c5f3a1b2c3d4e5",
  "format": "full"
}
```

### 3. `search_emails`

Busca correos usando la sintaxis de búsqueda de Gmail.

**Parámetros:**
- `query` (string, requerido): Query de búsqueda
- `maxResults` (number, opcional): Número máximo de resultados

**Ejemplo:**
```json
{
  "query": "subject:invoice after:2024/1/1",
  "maxResults": 50
}
```

### 4. `get_email_thread`

Obtiene un hilo completo de conversación.

**Parámetros:**
- `threadId` (string, requerido): ID del hilo

**Ejemplo:**
```json
{
  "threadId": "18c5f3a1b2c3d4e5"
}
```

### 5. `get_labels`

Lista todas las etiquetas de Gmail.

**Ejemplo:**
```json
{}
```

## Sintaxis de Búsqueda de Gmail

El servidor soporta toda la sintaxis de búsqueda de Gmail:

- `from:email@example.com` - Correos de un remitente
- `to:email@example.com` - Correos a un destinatario
- `subject:texto` - Buscar en asunto
- `has:attachment` - Correos con adjuntos
- `is:unread` - Correos no leídos
- `is:read` - Correos leídos
- `is:starred` - Correos marcados
- `after:2024/1/1` - Correos después de una fecha
- `before:2024/12/31` - Correos antes de una fecha
- `label:INBOX` - Correos en una etiqueta específica

Puedes combinar múltiples criterios: `from:example@gmail.com subject:test is:unread`

## Recursos Disponibles

### `gmail://labels`

Recurso que lista todas las etiquetas de Gmail disponibles.

## Seguridad

- Los tokens se guardan localmente en `token.json`
- Los tokens se refrescan automáticamente cuando expiran
- Solo se solicita el scope `gmail.readonly` (solo lectura)
- Las credenciales nunca se exponen en los logs

## Troubleshooting

### Error: "Gmail no está autenticado"

Ejecuta el script de autenticación:
```bash
npx tsx authenticate.ts
```

### Error: "Invalid credentials"

Verifica que `GMAIL_CLIENT_ID` y `GMAIL_CLIENT_SECRET` estén correctamente configurados en `.env`.

### Error: "Token expired"

El token se refresca automáticamente. Si persiste, ejecuta nuevamente `authenticate.ts`.

### Error: "Access denied"

Verifica que hayas habilitado la Gmail API en Google Cloud Console y que hayas autorizado la aplicación.

## Limitaciones

- Solo lectura: Este servidor solo permite leer correos, no enviar ni modificar
- Rate limits: Gmail API tiene límites de rate. El servidor maneja errores automáticamente
- Scope limitado: Solo se solicita acceso de lectura por seguridad
