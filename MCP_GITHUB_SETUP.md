## GitHub MCP (Cursor) Setup

### Requisitos
- **Un GitHub token** con permisos para leer Actions del repo (scope recomendado: `repo`).
- Tener `npx` disponible (Node instalado).

### Configuración
Este repo incluye el servidor en `backend/mcp-server/.cursor-mcp-config.json` bajo el nombre `github`.

Cursor ejecutará el servidor con:
- `npx --yes @modelcontextprotocol/server-github`

### Token
Por seguridad, el token **no** se guarda en el repo. Definilo como variable de entorno antes de abrir Cursor:

```bash
export GITHUB_TOKEN="ghp_...tu_token..."
```

Luego **reiniciá Cursor** para que cargue el MCP con esa variable.

### Verificación
En Cursor, el MCP debería aparecer como `github`. Si no aparece:
- Confirmá que `GITHUB_TOKEN` está definido en el entorno donde abriste Cursor
- Reiniciá Cursor


