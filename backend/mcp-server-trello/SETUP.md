# Guía Rápida de Configuración - Trello MCP

## Pasos para Configurar Trello MCP

### 1. Crear Cuenta en Trello

Si aún no tienes cuenta:
1. Ve a https://trello.com/signup
2. Completa el registro con tu email
3. Verifica tu cuenta si es necesario

### 2. Obtener Credenciales de API

#### Paso 2.1: Obtener API Key
1. Ve a https://trello.com/app-key
2. Inicia sesión si es necesario
3. Copia tu **API Key** (aparece en la parte superior)

#### Paso 2.2: Generar Token
1. En la misma página (https://trello.com/app-key)
2. Desplázate a la sección "Token"
3. Haz clic en el enlace para generar un token
4. Autoriza la aplicación cuando se te solicite
5. Copia el **Token** generado

#### Paso 2.3: Obtener Board ID (Opcional)
1. Abre el tablero de Trello que quieres usar
2. Mira la URL del navegador:
   ```
   https://trello.com/b/XXXXXXXXX/nombre-del-tablero
   ```
3. El **Board ID** es `XXXXXXXXX` (después de `/b/`)

### 3. Configurar Variables de Entorno

Agrega las siguientes variables a tu archivo `.env` en la raíz del proyecto:

```bash
TRELLO_API_KEY=tu-api-key-aqui
TRELLO_TOKEN=tu-token-aqui
TRELLO_BOARD_ID=tu-board-id-aqui
```

### 4. Configurar MCP en Cursor

#### Opción A: Usar script wrapper (Recomendado)

El script `backend/mcp-server-trello/run.sh` ya está configurado para usar las variables de `.env`.

Agrega esta configuración a tu archivo de configuración de MCP de Cursor (`~/.cursor/mcp.json` o similar):

```json
{
  "mcpServers": {
    "trello": {
      "command": "/Users/clementefalcone/Desktop/personal/emotioxV3/backend/mcp-server-trello/run.sh"
    }
  }
}
```

#### Opción B: Configuración directa

Si prefieres no usar el script wrapper:

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

### 5. Reiniciar Cursor

Después de agregar la configuración:
1. Guarda el archivo de configuración de MCP
2. Reinicia Cursor completamente
3. Verifica que el servidor MCP de Trello esté disponible

### 6. Verificar Instalación

Una vez reiniciado Cursor, deberías poder usar herramientas de Trello como:
- `list_boards` - Listar tableros
- `get_lists` - Obtener listas
- `add_card_to_list` - Crear tarjetas
- Y muchas más...

## Solución de Problemas

### Error: "TRELLO_API_KEY is not defined"
- Verifica que las variables estén en tu archivo `.env`
- Asegúrate de que el script `run.sh` esté cargando el `.env` correctamente

### Error: "Unauthorized"
- Verifica que tu API Key y Token sean correctos
- Regenera el token si es necesario desde https://trello.com/app-key

### El servidor MCP no aparece en Cursor
- Verifica la sintaxis JSON en el archivo de configuración
- Asegúrate de haber reiniciado Cursor completamente
- Revisa los logs de Cursor para ver errores

## Recursos

- [Documentación completa del servidor MCP de Trello](https://github.com/delorenj/mcp-server-trello)
- [Obtener credenciales de Trello](https://trello.com/app-key)
- [Documentación de la API de Trello](https://developer.atlassian.com/cloud/trello/rest/api-group-actions/)
