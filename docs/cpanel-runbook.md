# cPanel Runbook — EmotioX V3

## Hosting Details
- **Provider:** cPanel shared hosting
- **Domain:** emotio.cx
- **SSH alias:** `cpanel-emotio` (configurado en `~/.ssh/config`)
- **SSH key:** `~/.ssh/cpanel_cursor` (passphrase: ver scripts de deploy)
- **Node.js version:** 24.12.0 (Passenger)
- **cPanel user:** emotvehe

## Domains & Subdomains
| URL | Qué sirve | Document root |
|---|---|---|
| `https://emotio.cx/research` | Research Frontend (investigador) | `~/public_html/research/` |
| `https://emotio.cx/participant` | Participant Frontend (encuestado) | `~/public_html/participant/` |
| `https://emotio.cx/api` | Backend API (Express/Passenger) | `~/emotioxv3/backend/` |

## Subdominio `dev.emotio.cx` (staging / preproducción)

Usa el mismo patrón que producción pero con host `dev.emotio.cx` y, si aplica, **otra base de datos o `.env`** para no mezclar datos con producción.

### 1. DNS

- En el proveedor del dominio (o zona DNS de cPanel): crea un registro **A** (o **CNAME** al host principal) para `dev.emotio.cx` apuntando al **mismo servidor** que `emotio.cx`.

### 2. Subdominio en cPanel

- **Domains** / **Subdomains** (nombre puede variar): crea `dev.emotio.cx`.
- **Document root** recomendado (ejemplo): `public_html/dev` (o el que te asigne el panel; lo importante es saber la ruta para desplegar).

### 3. Estructura de archivos (espejo de producción)

Bajo el document root del subdominio, replica las tres “patas”:

```
~/public_html/dev/
├── research/          # dist del research-frontend + runtime-config.json + .htaccess
├── participant/       # dist del participant-frontend + runtime-config.json + .htaccess
```

Los scripts `deploy-*-cpanel.sh` desplazan por defecto a `~/public_html/research` y `~/public_html/participant`. Para dev, o bien ajustas **destino remoto** en una copia del script, o haces **rsync manual** a `~/public_html/dev/research` y `~/public_html/dev/participant`.

### 4. `runtime-config.json` en dev

- **research** (`~/public_html/dev/research/runtime-config.json`):

```json
{
  "apiBaseUrl": "https://dev.emotio.cx/api",
  "participantBaseUrl": "https://dev.emotio.cx/participant"
}
```

- **participant** (`~/public_html/dev/participant/runtime-config.json`):

```json
{
  "apiBaseUrl": "https://dev.emotio.cx/api"
}
```

### 5. Backend (Passenger) en el subdominio

- En **Applications → Node.js**, crea una **segunda** aplicación cuya **URL base** sea el subdominio (p. ej. `dev.emotio.cx`) y el path de API acorde a cómo montes Express (típicamente `/api` como en producción).
- Usa un **`.env` separado** (o variables distintas) si quieres BD de staging, credenciales distintas, etc.
- **Google OAuth**: en Google Cloud Console, añade el redirect URI de dev, p. ej. `https://dev.emotio.cx/api/auth/google/callback`, y la pantalla de consentimiento si aplica.

### 6. CORS y cookies

El backend en `server-cpanel.ts` ya permite orígenes que contienen `emotio.cx` (incluye subdominios). Para redirects post-login, define `FRONTEND_URL` / `RESEARCH_FRONTEND_URL` en el `.env` del backend de dev apuntando a `https://dev.emotio.cx/research` si no confías solo en el header `Origin`.

### 7. CI/CD (solo rama `dev`)

Los pushes a **`dev`** disparan workflows distintos de los de **`main`**: despliegan solo al entorno del subdominio, sin tocar `~/public_html/research`, `~/public_html/participant` ni `~/emotioxv3/backend` de producción.

| Workflow | Rutas que disparan el job | Destino en cPanel |
|----------|---------------------------|-------------------|
| `deploy-backend-cpanel-dev.yml` | `backend/**` | `~/emotioxv3/backend-dev/` |
| `deploy-research-frontend-cpanel-dev.yml` | `research-frontend/**` | `~/public_html/dev/research/` |
| `deploy-participant-frontend-cpanel-dev.yml` | `participant-frontend/**` | `~/public_html/dev/participant/` |

- **Secrets:** los mismos que producción (`CPANEL_SSH_PRIVATE_KEY`, `CPANEL_SSH_HOST`, `CPANEL_SSH_USER`, `CPANEL_SSH_PORT`).
- **Backend dev:** debe existir `~/emotioxv3/backend-dev/.env` antes del primer deploy (el workflow falla si no está).
- **URLs embebidas en build:** `https://dev.emotio.cx/api` y `https://dev.emotio.cx/participant` en `runtime-config.json` generado en CI.
- **`workflow_dispatch`:** cada workflow dev se puede ejecutar a mano desde GitHub Actions. Elige la rama **`dev`** al lanzarlo; si eliges `main`, el job falla a propósito (no se debe desplegar código de producción a rutas `dev/`).
- **Qué dispara cada job:** cada workflow lista su propio `.yml` en `paths`, además de `backend/**`, `research-frontend/**` o `participant-frontend/**`. Un commit que **solo** cambie documentación u otros paths no dispara estos workflows; un commit que **edite** `deploy-research-frontend-cpanel-dev.yml` sí dispara el deploy del research dev (aunque no haya cambios en `research-frontend/src`).

## File Manager
```
~/
├── public_html/
│   ├── research/              # Build de research-frontend (Vite dist)
│   │   ├── index.html
│   │   ├── runtime-config.json   # {"apiBaseUrl":"https://emotio.cx/api","participantBaseUrl":"https://emotio.cx/participant"}
│   │   └── .htaccess             # SPA routing + cache busting + security headers + gzip
│   └── participant/           # Build de participant-frontend (Vite dist)
│       ├── index.html
│       ├── runtime-config.json   # {"apiBaseUrl":"https://emotio.cx/api"}
│       └── .htaccess             # SPA routing + cache busting + security headers + gzip
└── emotioxv3/
    └── backend/               # Código fuente + dist compilado
        ├── server-cpanel.js      # Entry point Passenger
        ├── passenger_startup.js
        ├── dist/                 # TypeScript compilado
        ├── .env                  # Variables de entorno (NO en repo)
        └── node_modules/
```

## Databases
- **Engine:** MySQL (cPanel)
- **Database:** `emotvehe_emotiox`
- **Acceso:** phpMyAdmin via cPanel o conexión directa desde backend (.env DB_HOST)
- **Tablas principales:** users, research, stages, modules, questions, responses, research_types, research_techniques, module_templates, stage_templates, enterprises
- **Migraciones:** `database/migrations-mysql/` (001-014)
- **Config flexible:** Columnas JSONB para configs de módulos (ComponentConfig)

## Common Operations

### Deploy Backend
```bash
# Automático (GitHub Actions): push a main con cambios en backend/
# Manual:
./scripts/deploy-backend-cpanel.sh
```
Flujo: rsync src → npm install → tsc build → verificar server-cpanel.js → test startup

### Deploy Research Frontend
```bash
./scripts/deploy-research-frontend-cpanel.sh
```
Flujo: escribir runtime-config.json → npm run build → backup remoto → rsync dist/ → escribir .htaccess → verificar

### Deploy Participant Frontend
```bash
./scripts/deploy-participant-frontend-cpanel.sh
```
Flujo: idéntico al research frontend, destino `~/public_html/participant/`

### Restart Passenger (backend)
```bash
ssh cpanel-emotio
cd ~/emotioxv3/backend
touch tmp/restart.txt
```
O desde cPanel → Applications → Node.js → Restart

### Ejecutar migración en BD
```bash
ssh cpanel-emotio
cd ~/emotioxv3/backend
npx tsx scripts/<migration-script>.ts
```

### Verificar health
```bash
curl https://emotio.cx/api/health
# Esperado: {"status":"healthy",...}
```

### Backup manual del frontend
Los scripts de deploy crean backups automáticos (`~/public_html/research.backup.YYYYMMDD_HHMMSS`). Para backup manual:
```bash
ssh cpanel-emotio
cp -r ~/public_html/research ~/public_html/research.backup.manual
```

## Troubleshooting

### Frontend muestra página en blanco
1. Verificar que `index.html` existe: `ssh cpanel-emotio "ls ~/public_html/research/index.html"`
2. Verificar `.htaccess` (SPA routing): `ssh cpanel-emotio "cat ~/public_html/research/.htaccess"`
3. Verificar `runtime-config.json` tiene las URLs correctas

### QR/URL no se genera
- Causa: falta `participantBaseUrl` en `~/public_html/research/runtime-config.json`
- Fix: `ssh cpanel-emotio` y agregar el campo. Ver [REPORT_URL_QR_ISSUE.md](../REPORT_URL_QR_ISSUE.md)

### Backend 502/503
1. Verificar Passenger: cPanel → Applications → Node.js → ver estado
2. Verificar `.env` existe: `ssh cpanel-emotio "test -f ~/emotioxv3/backend/.env && echo OK"`
3. Verificar logs: cPanel → Errors o `ssh cpanel-emotio "cat ~/emotioxv3/backend/logs/error.log"`
4. Restart: `ssh cpanel-emotio "cd ~/emotioxv3/backend && touch tmp/restart.txt"`

### Media/imágenes no cargan
- Backend resuelve URLs relativas (`/api/media/...`). Si falla en local, verificar `resolveMediaUrl()` en `media.service.ts`
- En producción: verificar que Passenger está corriendo y CORS permite el origen

### Build falla en CI
- Pre-commit hooks requieren 0 errors + 0 warnings
- Verificar: `cd <subproyecto> && npm run build && npm run type-check && npm run lint`
