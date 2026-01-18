# Configuración de Desarrollo - Research Frontend

**Puerto:** 12800  
**URL:** http://localhost:12800

---

## 🚀 Inicio Rápido

### 1. Iniciar Backend Local (Opcional)

Si quieres usar el backend local en lugar de AWS:

```bash
cd backend
npm run dev
```

El backend local correrá en: `http://localhost:3000`

### 2. Iniciar Research Frontend

```bash
cd research-frontend
npm run dev
```

El frontend correrá en: **http://localhost:12800**

---

## ⚙️ Configuración de API

### Opción 1: Usar Backend Local (Recomendado para desarrollo)

El archivo `public/runtime-config.json` está configurado para usar el backend local:

```json
{
  "apiBaseUrl": "http://localhost:3000"
}
```

**Requisito:** El backend debe estar corriendo en `http://localhost:3000`

### Opción 2: Usar Backend de AWS

Si prefieres usar el backend de AWS (como está configurado en `.env`):

El archivo `.env` ya tiene:
```bash
VITE_API_URL=https://ro05auvmxc.execute-api.us-east-1.amazonaws.com/dev
```

El código usará esta configuración si el `runtime-config.json` no está disponible o falla.

---

## 🔧 Solución de Problemas

### Error: "Failed to fetch config: 403 Forbidden"

**Causa:** El archivo `runtime-config.json` no está disponible o el backend no está corriendo.

**Soluciones:**

1. **Verificar que `runtime-config.json` existe:**
   ```bash
   ls research-frontend/public/runtime-config.json
   ```

2. **Si usas backend local, verificar que está corriendo:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Si usas backend de AWS, verificar conectividad:**
   ```bash
   curl https://ro05auvmxc.execute-api.us-east-1.amazonaws.com/dev/health
   ```

4. **Crear/actualizar `runtime-config.json`:**
   ```json
   {
     "apiBaseUrl": "http://localhost:3000"
   }
   ```
   O para AWS:
   ```json
   {
     "apiBaseUrl": "https://ro05auvmxc.execute-api.us-east-1.amazonaws.com/dev"
   }
   ```

---

## 📝 Archivos de Configuración

### `public/runtime-config.json`
- Configuración en tiempo de ejecución
- Se carga automáticamente al iniciar la app
- Prioridad: Se usa primero si está disponible

### `.env`
- Variables de entorno de Vite
- `VITE_API_URL`: URL del backend API
- `VITE_PARTICIPANT_FRONTEND_URL`: URL del participant frontend
- `VITE_WEBSOCKET_URL`: URL del WebSocket

---

## 🎯 Orden de Prioridad para API Base URL

1. **En desarrollo (localhost):**
   - `runtime-config.json` (si está disponible)
   - `VITE_API_URL` (de `.env`)
   - `http://localhost:3000` (fallback por defecto)

2. **En producción:**
   - `runtime-config.json` (desde CloudFront)
   - `VITE_API_URL` (de variables de entorno)

---

## ✅ Verificación

Después de iniciar el servidor, verifica:

1. **Consola del navegador (F12):**
   - Debe mostrar: `API configuration loaded: ...`
   - No debe haber errores de 403

2. **Network tab:**
   - Debe haber una petición exitosa a `/config` del backend
   - Status: 200 OK

---

**Estado:** ✅ Configurado para desarrollo local  
**Puerto:** 12800  
**Backend:** http://localhost:3000 (o AWS según configuración)
