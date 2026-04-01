# Configuración de Despliegues a cPanel vía CI/CD

Este documento explica cómo configurar los workflows de GitHub Actions para desplegar automáticamente a cPanel.

## Workflows Creados

Se han creado 3 workflows para automatizar los despliegues a cPanel (rama **`main`** → producción `emotio.cx`):

1. **`deploy-participant-frontend-cpanel.yml`** - Despliega Participant Frontend
2. **`deploy-research-frontend-cpanel.yml`** - Despliega Research Frontend  
3. **`deploy-backend-cpanel.yml`** - Despliega Backend

Rama **`dev`** (entorno `dev.emotio.cx`, rutas bajo `~/public_html/dev/` y `~/emotioxv3/backend-dev/`):

1. **`deploy-participant-frontend-cpanel-dev.yml`**
2. **`deploy-research-frontend-cpanel-dev.yml`**
3. **`deploy-backend-cpanel-dev.yml`**

Detalle: [docs/cpanel-runbook.md](../docs/cpanel-runbook.md) (sección subdominio dev y CI/CD dev).

## Configuración de Secrets en GitHub

Para que los workflows funcionen, necesitas configurar los siguientes secrets en GitHub:

### 1. Ir a la configuración de secrets

1. Ve a tu repositorio en GitHub
2. Click en **Settings** → **Secrets and variables** → **Actions**
3. Click en **New repository secret**

### 2. Agregar los siguientes secrets

#### `CPANEL_SSH_PRIVATE_KEY`
- **Descripción**: Clave privada SSH para conectarse a cPanel
- **Cómo obtenerla**: 
  ```bash
  # Si ya tienes la clave localmente:
  cat ~/.ssh/cpanel_cursor
  
  # O generar una nueva clave específica para GitHub Actions:
  ssh-keygen -t ed25519 -C "github-actions-cpanel" -f ~/.ssh/github_actions_cpanel
  cat ~/.ssh/github_actions_cpanel
  ```
- **Importante**: Copia TODO el contenido incluyendo `-----BEGIN OPENSSH PRIVATE KEY-----` y `-----END OPENSSH PRIVATE KEY-----`

#### `CPANEL_SSH_HOST`
- **Descripción**: Hostname o IP del servidor cPanel
- **Ejemplo**: `emotio.cx` o `123.456.789.0`
- **Nota**: Debe ser el mismo que usas en tu `~/.ssh/config` si tienes configurado `cpanel-emotio`

#### `CPANEL_SSH_USER`
- **Descripción**: Usuario SSH para conectarse a cPanel
- **Ejemplo**: `emotvehe` o el usuario que uses normalmente

#### `VITE_PARTICIPANT_FRONTEND_URL` (opcional, solo para research-frontend)
- **Descripción**: URL del participant frontend (ya debería estar configurado)
- **Ejemplo**: `https://emotio.cx/participant`

### 3. Configurar la clave pública en el servidor cPanel

Después de agregar la clave privada en GitHub, necesitas agregar la clave pública correspondiente al servidor:

```bash
# Si usaste una clave existente, copia la pública:
cat ~/.ssh/cpanel_cursor.pub

# Si generaste una nueva, copia la pública:
cat ~/.ssh/github_actions_cpanel.pub
```

Luego, en el servidor cPanel:

```bash
ssh tu-usuario@emotio.cx
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "TU_CLAVE_PUBLICA_AQUI" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Configuración Inicial del Backend

El backend requiere configuración manual inicial:

1. **Crear archivo `.env` en el servidor**:
   ```bash
   ssh ${{ secrets.CPANEL_SSH_USER }}@${{ secrets.CPANEL_SSH_HOST }}
   cd ~/emotioxv3/backend
   cp .env.example .env
   nano .env
   ```

2. **Configurar variables de entorno** según tu entorno de producción

3. **Configurar Passenger en cPanel**:
   - Ir a: **Applications** → **Node.js**
   - Crear nueva aplicación
   - Node.js version: `24.12.0` (o la que uses)
   - Application root: `~/emotioxv3/backend`
   - Application URL: `/api` (o subdominio)
   - Application startup file: `server-cpanel.js`

## Cómo Funcionan los Workflows

### Frontends (Participant y Research)

1. **Trigger**: Se ejecutan automáticamente cuando hay cambios en:
   - `participant-frontend/**` o `research-frontend/**`
   - O manualmente desde GitHub Actions

2. **Proceso**:
   - Instala dependencias
   - Configura `runtime-config.json`
   - Construye la aplicación
   - Crea backup del directorio remoto
   - Limpia directorio remoto (excepto `.well-known`)
   - Despliega archivos vía `rsync`
   - Configura `.htaccess` (solo participant-frontend)
   - Verifica el despliegue

### Backend

1. **Trigger**: Se ejecuta cuando hay cambios en `backend/**`

2. **Proceso**:
   - Verifica que `.env` existe (falla si no existe)
   - Transfiere código fuente (excluyendo `node_modules`, `dist`, `.env`)
   - Instala dependencias en el servidor
   - Compila TypeScript en el servidor
   - Verifica archivos de despliegue (`server-cpanel.js`, `passenger_startup.js`)
   - Prueba que el servidor puede iniciar

## Ventajas de Usar CI/CD

✅ **Automatización completa**: No necesitas ejecutar scripts manualmente  
✅ **Historial**: Todos los despliegues quedan registrados en GitHub  
✅ **Consistencia**: Mismo proceso cada vez  
✅ **Rollback fácil**: Puedes re-ejecutar workflows anteriores  
✅ **Notificaciones**: GitHub te notifica del estado de los despliegues  

## Troubleshooting

### Error: "Permission denied (publickey)"
- Verifica que la clave privada esté correctamente configurada en GitHub Secrets
- Verifica que la clave pública esté en `~/.ssh/authorized_keys` del servidor
- Verifica que los permisos del archivo sean correctos: `chmod 600 ~/.ssh/authorized_keys`

### Error: "No se encontró .env en el servidor" (Backend)
- Crea el archivo `.env` manualmente en el servidor antes de desplegar
- El workflow no crea ni modifica el `.env` por seguridad

### Error: "rsync: connection unexpectedly closed"
- Verifica que el servidor permita conexiones SSH desde GitHub Actions
- Algunos servidores pueden tener restricciones de firewall

### Los archivos no se actualizan
- Verifica que el workflow se ejecutó correctamente (revisa los logs)
- Verifica que el directorio remoto tenga los permisos correctos
- Si usas Passenger, reinicia la aplicación desde cPanel

## Migración desde Scripts Manuales

Los scripts manuales (`deploy-*-cpanel.sh`) seguirán funcionando, pero ahora puedes:

1. **Usar solo CI/CD**: Eliminar los scripts si prefieres
2. **Usar ambos**: Scripts para desarrollo local, CI/CD para producción
3. **Migrar gradualmente**: Probar CI/CD primero, luego deprecar scripts

## Próximos Pasos

1. ✅ Configurar secrets en GitHub
2. ✅ Configurar clave pública en servidor
3. ✅ Hacer un push de prueba para verificar que funciona
4. ✅ Configurar `.env` del backend si aún no está
5. ✅ Opcional: Deprecar scripts manuales
