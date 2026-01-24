# Configuración de Webhooks de Trello

## ¿Qué son los Webhooks?

Los webhooks permiten que Trello **notifique automáticamente** a tu servidor cuando ocurren eventos específicos (nueva tarjeta, cambio de estado, etc.). Esto es diferente al MCP, que permite que Cursor **consulte** Trello cuando lo necesites.

## Cuándo usar Webhooks

- ✅ Necesitas que tu backend reaccione automáticamente a cambios en Trello
- ✅ Quieres sincronizar datos entre Trello y tu base de datos
- ✅ Necesitas notificaciones en tiempo real de eventos de Trello
- ✅ Quieres automatizar procesos basados en acciones de Trello

## Cuándo NO necesitas Webhooks

- ❌ Solo quieres controlar Trello desde Cursor (usa MCP)
- ❌ Solo necesitas consultar información ocasionalmente (usa MCP)
- ❌ No tienes un servidor backend que pueda recibir webhooks

## Configuración de Webhooks en Trello

### Paso 1: Obtener Credenciales

Necesitas las mismas credenciales que para MCP:
- `TRELLO_API_KEY` - De https://trello.com/app-key
- `TRELLO_TOKEN` - Generado desde la misma página

### Paso 2: Obtener ID del Modelo

El `idModel` puede ser:
- **Board ID**: ID del tablero (en la URL: `https://trello.com/b/BOARD_ID/...`)
- **Card ID**: ID de una tarjeta específica
- **List ID**: ID de una lista específica
- **Member ID**: ID de un miembro

### Paso 3: Crear el Webhook

#### Opción A: Usando cURL

```bash
curl -X POST "https://api.trello.com/1/tokens/{TRELLO_TOKEN}/webhooks/" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "{TRELLO_API_KEY}",
    "callbackURL": "https://tu-servidor.com/api/trello-webhook",
    "idModel": "BOARD_ID_AQUI",
    "description": "Webhook para notificaciones de Trello"
  }'
```

#### Opción B: Usando Node.js/TypeScript

```typescript
import axios from 'axios';

async function createTrelloWebhook(
  apiKey: string,
  token: string,
  callbackURL: string,
  idModel: string,
  description: string
): Promise<void> {
  try {
    const response = await axios.post(
      `https://api.trello.com/1/tokens/${token}/webhooks/`,
      {
        key: apiKey,
        callbackURL: callbackURL,
        idModel: idModel,
        description: description,
      }
    );
    console.log('Webhook creado:', response.data);
  } catch (error) {
    console.error('Error creando webhook:', error);
    throw error;
  }
}
```

### Paso 4: Crear Endpoint en tu Backend

Necesitas crear un endpoint que reciba las notificaciones de Trello:

```typescript
import express from 'express';
import crypto from 'crypto';

const app = express();

// Middleware para parsear JSON
app.use(express.json());

/**
 * Endpoint para recibir webhooks de Trello
 * @param req - Request con el payload del webhook
 * @param res - Response para confirmar recepción
 */
app.post('/api/trello-webhook', (req, res) => {
  // Trello espera una respuesta 200 inmediatamente
  res.status(200).send('OK');

  // Procesar el webhook de forma asíncrona
  const webhookData = req.body;
  
  // El payload contiene:
  // - action: Detalles de la acción que disparó el webhook
  // - model: El objeto que está siendo monitoreado
  // - webhook: Metadatos del webhook
  
  console.log('Webhook recibido:', {
    action: webhookData.action?.type,
    model: webhookData.model?.name,
    timestamp: new Date().toISOString(),
  });

  // Procesar según el tipo de acción
  if (webhookData.action?.type === 'createCard') {
    handleCardCreated(webhookData);
  } else if (webhookData.action?.type === 'updateCard') {
    handleCardUpdated(webhookData);
  }
  // ... más handlers
});

/**
 * Maneja la creación de una nueva tarjeta
 * @param webhookData - Datos del webhook
 */
function handleCardCreated(webhookData: any): void {
  const card = webhookData.action?.data?.card;
  console.log('Nueva tarjeta creada:', card?.name);
  // Aquí puedes sincronizar con tu base de datos, enviar notificaciones, etc.
}

/**
 * Maneja la actualización de una tarjeta
 * @param webhookData - Datos del webhook
 */
function handleCardUpdated(webhookData: any): void {
  const card = webhookData.action?.data?.card;
  console.log('Tarjeta actualizada:', card?.name);
  // Aquí puedes actualizar tu base de datos, etc.
}
```

### Paso 5: Verificar Seguridad (Opcional pero Recomendado)

Trello puede enviar un header `X-Trello-Webhook` con una firma HMAC-SHA1. Puedes verificar esto:

```typescript
import crypto from 'crypto';

/**
 * Verifica la firma del webhook de Trello
 * @param body - Cuerpo de la petición (string)
 * @param signature - Firma recibida en el header
 * @param secret - Secreto del webhook (si lo configuraste)
 * @returns true si la firma es válida
 */
function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha1', secret)
    .update(body)
    .digest('hex');
  return hash === signature;
}

// En tu endpoint:
app.post('/api/trello-webhook', (req, res) => {
  const signature = req.headers['x-trello-webhook'] as string;
  const bodyString = JSON.stringify(req.body);
  
  // Verificar firma si tienes un secreto configurado
  // Nota: Trello no requiere secreto por defecto, pero puedes agregarlo
  
  res.status(200).send('OK');
  // ... procesar webhook
});
```

## Tipos de Eventos Disponibles

Trello puede notificar sobre:
- `createCard` - Nueva tarjeta creada
- `updateCard` - Tarjeta actualizada
- `deleteCard` - Tarjeta eliminada
- `addMemberToCard` - Miembro agregado a tarjeta
- `removeMemberFromCard` - Miembro removido de tarjeta
- `createList` - Nueva lista creada
- `updateList` - Lista actualizada
- `moveCardFromList` - Tarjeta movida entre listas
- Y muchos más...

## Gestión de Webhooks

### Listar Webhooks Existentes

```bash
curl "https://api.trello.com/1/tokens/{TRELLO_TOKEN}/webhooks/?key={TRELLO_API_KEY}"
```

### Eliminar un Webhook

```bash
curl -X DELETE "https://api.trello.com/1/webhooks/{WEBHOOK_ID}?key={TRELLO_API_KEY}&token={TRELLO_TOKEN}"
```

### Actualizar un Webhook

```bash
curl -X PUT "https://api.trello.com/1/webhooks/{WEBHOOK_ID}?key={TRELLO_API_KEY}&token={TRELLO_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Nueva descripción",
    "callbackURL": "https://nuevo-url.com/webhook"
  }'
```

## Requisitos del Endpoint

Tu endpoint debe:
- ✅ Ser accesible públicamente (no localhost)
- ✅ Retornar código 200 durante la creación del webhook
- ✅ Responder rápidamente (Trello espera respuesta en < 5 segundos)
- ✅ Manejar errores sin fallar (procesar de forma asíncrona si es necesario)

## Testing Local

Para probar webhooks localmente, puedes usar:
- **ngrok**: Expone tu localhost como URL pública
- **localtunnel**: Similar a ngrok
- **webhook.site**: Servicio temporal para recibir webhooks

Ejemplo con ngrok:
```bash
# Instalar ngrok
npm install -g ngrok

# Exponer tu servidor local
ngrok http 3000

# Usar la URL de ngrok como callbackURL
# Ejemplo: https://abc123.ngrok.io/api/trello-webhook
```

## Referencias

- [Documentación oficial de Trello Webhooks](https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks)
- [Guía completa de webhooks de Trello](https://inventivehq.com/blog/trello-webhooks-guide)
