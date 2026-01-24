# Trello MCP Server

Servidor MCP (Model Context Protocol) para interactuar con la API de Trello, permitiendo gestionar tableros, listas, tarjetas y más.

## Requisitos Previos

1. **Cuenta de Trello**: Necesitas tener una cuenta activa en Trello
2. **API Key y Token**: Debes obtener tus credenciales de la API de Trello

## Configuración de Credenciales de Trello

### Paso 1: Obtener API Key

1. Ve a https://trello.com/app-key
2. Inicia sesión con tu cuenta de Trello
3. Copia tu **API Key** (aparece en la parte superior de la página)

### Paso 2: Generar Token

1. En la misma página (https://trello.com/app-key), desplázate hacia abajo
2. En la sección "Token", haz clic en el enlace para generar un token
3. Autoriza la aplicación cuando se te solicite
4. Copia el **Token** generado

### Paso 3: Obtener Board ID (Opcional pero recomendado)

1. Abre el tablero de Trello que quieres usar
2. Mira la URL del navegador, debería verse así:
   ```
   https://trello.com/b/XXXXXXXXX/nombre-del-tablero
   ```
3. El **Board ID** es la parte `XXXXXXXXX` después de `/b/`

## Instalación

El servidor MCP de Trello se instala automáticamente usando `pnpx` o `npx`. No requiere instalación local.

## Configuración en Cursor

### Opción 1: Configuración Global de Cursor

Edita el archivo de configuración de MCP de Cursor (ubicado en `~/.cursor/mcp.json` o similar):

```json
{
  "mcpServers": {
    "trello": {
      "command": "pnpx",
      "args": [
        "@delorenj/mcp-server-trello"
      ],
      "env": {
        "TRELLO_API_KEY": "tu-api-key-aqui",
        "TRELLO_TOKEN": "tu-token-aqui"
      }
    }
  }
}
```

### Opción 2: Usar Variables de Entorno desde .env

Si prefieres usar el archivo `.env` del proyecto:

1. Agrega las siguientes variables a tu archivo `.env`:
```bash
TRELLO_API_KEY=tu-api-key-aqui
TRELLO_TOKEN=tu-token-aqui
TRELLO_BOARD_ID=tu-board-id-aqui
```

2. Crea un script wrapper `backend/mcp-server-trello/run.sh`:
```bash
#!/bin/bash
cd /Users/clementefalcone/Desktop/personal/emotioxV3
source .env
export TRELLO_API_KEY TRELLO_TOKEN TRELLO_BOARD_ID
exec pnpx @delorenj/mcp-server-trello
```

3. Haz el script ejecutable:
```bash
chmod +x backend/mcp-server-trello/run.sh
```

4. En la configuración de Cursor:
```json
{
  "mcpServers": {
    "trello": {
      "command": "/Users/clementefalcone/Desktop/personal/emotioxV3/backend/mcp-server-trello/run.sh"
    }
  }
}
```

## Herramientas Disponibles

El servidor MCP de Trello expone las siguientes herramientas principales:

### Gestión de Tableros
- `list_boards` - Lista todos los tableros accesibles
- `set_active_board` - Establece el tablero activo para operaciones

### Gestión de Listas
- `get_lists` - Obtiene todas las listas del tablero activo
- `add_list_to_board` - Crea una nueva lista en el tablero
- `archive_list` - Archiva una lista

### Gestión de Tarjetas
- `get_cards_by_list_id` - Obtiene tarjetas de una lista específica
- `add_card_to_list` - Crea una nueva tarjeta
- `update_card_details` - Actualiza detalles de una tarjeta
- `archive_card` - Archiva una tarjeta
- `move_card_to_list` - Mueve una tarjeta entre listas
- `get_my_cards` - Obtiene tarjetas asignadas al usuario actual
- `attach_image_to_card` - Adjunta una imagen a una tarjeta desde una URL

### Gestión de Checklists
- `get_checklists` - Obtiene checklists de una tarjeta
- `add_checklist_to_card` - Crea un checklist en una tarjeta
- `add_item_to_checklist` - Agrega un ítem a un checklist
- `check_item` - Marca un ítem del checklist como completado
- `uncheck_item` - Desmarca un ítem del checklist

### Actividad
- `get_recent_activity` - Obtiene actividad reciente del tablero

## Límites de la API

Trello tiene límites de tasa:
- **300 solicitudes por 10 segundos** por API key
- **100 solicitudes por 10 segundos** por token

El servidor MCP maneja automáticamente estos límites.

## Seguridad

⚠️ **IMPORTANTE**: Nunca subas tus credenciales de Trello al repositorio. Usa variables de entorno o archivos `.env` que estén en `.gitignore`.

## Referencias

- [Repositorio del servidor MCP de Trello](https://github.com/delorenj/mcp-server-trello)
- [Documentación de la API de Trello](https://developer.atlassian.com/cloud/trello/rest/api-group-actions/)
- [Obtener credenciales de Trello](https://trello.com/app-key)
