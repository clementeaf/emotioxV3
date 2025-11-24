# Emotiox Database MCP Server

Servidor MCP (Model Context Protocol) para consultar la base de datos PostgreSQL local de EmotioxV3.

## Instalación

```bash
cd backend/mcp-server
npm install
npm run build
```

## Configuración en Cursor

Para usar este servidor MCP en Cursor, agrega la siguiente configuración en tu archivo de configuración de Cursor:

### Opción 1: Configuración global de Cursor

Edita el archivo de configuración de MCP de Cursor (ubicado en `~/.cursor/mcp.json` o similar):

```json
{
  "mcpServers": {
    "emotiox-database": {
      "command": "node",
      "args": [
        "/Users/clementefalcone/Desktop/personal/emotioxV3/backend/mcp-server/dist/index.js"
      ],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "emotioxv3",
        "DB_USER": "postgres",
        "DB_PASSWORD": "postgres"
      }
    }
  }
}
```

### Opción 2: Usar variables de entorno desde .env

Si prefieres usar el archivo `.env` del proyecto, puedes crear un script wrapper:

```bash
#!/bin/bash
cd /Users/clementefalcone/Desktop/personal/emotioxV3
source .env
export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD
exec node backend/mcp-server/dist/index.js
```

Y en la configuración de Cursor:

```json
{
  "mcpServers": {
    "emotiox-database": {
      "command": "/Users/clementefalcone/Desktop/personal/emotioxV3/backend/mcp-server/run.sh"
    }
  }
}
```

## Herramientas Disponibles

El servidor MCP expone las siguientes herramientas:

### 1. `query`
Ejecuta una consulta SQL genérica en la base de datos.

**Parámetros:**
- `sql` (string, requerido): Consulta SQL a ejecutar

**Ejemplo:**
```json
{
  "sql": "SELECT * FROM researches LIMIT 5"
}
```

### 2. `get_research`
Obtiene información detallada de un research por ID.

**Parámetros:**
- `researchId` (string, requerido): ID del research (UUID)

**Ejemplo:**
```json
{
  "researchId": "c5f810e7-6487-4870-b933-00ba7d476134"
}
```

### 3. `list_researches`
Lista todos los researches activos.

**Parámetros:**
- `limit` (number, opcional): Número máximo de resultados (default: 10)

**Ejemplo:**
```json
{
  "limit": 20
}
```

### 4. `get_research_stages`
Obtiene los stages y módulos de un research.

**Parámetros:**
- `researchId` (string, requerido): ID del research (UUID)

**Ejemplo:**
```json
{
  "researchId": "c5f810e7-6487-4870-b933-00ba7d476134"
}
```

### 5. `get_table_schema`
Obtiene el esquema de una tabla.

**Parámetros:**
- `tableName` (string, requerido): Nombre de la tabla

**Ejemplo:**
```json
{
  "tableName": "researches"
}
```

### 6. `list_tables`
Lista todas las tablas de la base de datos.

**Parámetros:** Ninguno

## Recursos Disponibles

### `postgres://tables`
Recurso que proporciona una lista de todas las tablas en la base de datos en formato JSON.

## Desarrollo

Para ejecutar en modo desarrollo:

```bash
npm run dev
```

Para compilar:

```bash
npm run build
```

## Notas

- El servidor se conecta a la base de datos usando las variables de entorno definidas en el archivo `.env` del proyecto raíz.
- Asegúrate de que PostgreSQL esté corriendo y accesible antes de usar el servidor MCP.
- Las consultas SQL se ejecutan directamente, así que ten cuidado con consultas destructivas.

