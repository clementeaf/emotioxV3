# cPanel Runbook — EmotioX V3

## Hosting Details
- **Provider:** cPanel shared hosting
- **Domain:** emotio.cx
- **SSH alias:** `cpanel-emotio` (configurado en `~/.ssh/config`)
- **SSH key:** `~/.ssh/cpanel_cursor` (passphrase: ver scripts de deploy)
- **Node.js version:** 24.12.0 (Passenger)
- **cPanel user:** emotvehe

## Domains & Subdomains
| URL | Qué sirve | Document root / app |
|---|---|---|
| `https://emotio.cx/research` | Research Frontend (investigador) | `~/public_html/research/` |
| `https://emotio.cx/participant` | Participant Frontend (encuestado) | `~/public_html/participant/` |
| `https://emotio.cx/api` | Backend API (Express/Passenger) | Código en `~/emotioxv3/backend/`; Passenger montado desde `~/public_html/api/` (ver abajo) |
| `https://dev.emotio.cx/research` | Research Frontend (rama `dev`) | `~/public_html/dev/research/` |
| `https://dev.emotio.cx/participant` | Participant Frontend (rama `dev`) | `~/public_html/dev/participant/` |
| `https://dev.emotio.cx/api` | Backend API dev | Código en `~/emotioxv3/backend-dev/`; Passenger montado desde `~/public_html/dev/api/` |

## Subdominio `dev.emotio.cx` (staging / preproducción)

Usa el mismo patrón que producción pero con host `dev.emotio.cx` y, si aplica, **otra base de datos o `.env`** para no mezclar datos con producción.

### 1. DNS

- En el proveedor del dominio (o zona DNS de cPanel): crea un registro **A** (o **CNAME** al host principal) para `dev.emotio.cx` apuntando al **mismo servidor** que `emotio.cx`.

### 2. Subdominio en cPanel

- **Domains** / **Subdomains** (nombre puede variar): crea `dev.emotio.cx`.
- **Document root** recomendado (ejemplo): `public_html/dev` (o el que te asigne el panel; lo importante es saber la ruta para desplegar).

### 3. Estructura de archivos (espejo de producción)

Bajo el document root del subdominio (`public_html/dev` para `dev.emotio.cx`):

```
~/public_html/dev/
├── api/               # Solo Passenger: .htaccess (+ passenger_wsgi.py vacío) → ~/emotioxv3/backend-dev
├── research/          # dist del research-frontend + runtime-config.json + .htaccess (CI)
├── participant/       # dist del participant-frontend + runtime-config.json + .htaccess (CI)
```

Los workflows de GitHub en la rama `dev` hacen rsync de frontends a `dev/research` y `dev/participant`. El **API** se despliega a `~/emotioxv3/backend-dev/`; el directorio **`dev/api`** no viene del repo: es configuración fija en el servidor (igual que `public_html/api` en producción apunta a `~/emotioxv3/backend`).

Los scripts `deploy-*-cpanel.sh` locales apuntan por defecto a producción; para dev, usa los workflows o rsync manual a las rutas `dev/` anteriores.

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

### 5. Backend API (Passenger): prod vs dev

Apache resuelve **`/api`** con un directorio bajo `public_html` que solo contiene directivas **Passenger** (no el código fuente del monorepo).

| Entorno | Directorio Passenger | `PassengerAppRoot` | Código desplegado por CI/script |
|---------|----------------------|--------------------|----------------------------------|
| Producción | `~/public_html/api/` | `~/emotioxv3/backend` | `deploy-backend-cpanel` / push `main` |
| Dev | `~/public_html/dev/api/` | `~/emotioxv3/backend-dev` | `deploy-backend-cpanel-dev` / push `dev` |

El `.htaccess` debe definir al menos: `PassengerEnabled On`, `PassengerAppType node`, `PassengerStartupFile server-cpanel.js`, `PassengerNodejs` (ruta al binario Node del servidor, p. ej. alt-nodejs20), `PassengerAppRoot` como arriba. Opcional: `SetEnv NODE_ENV production`.

**Reinicio** tras deploy: `touch ~/emotioxv3/backend-dev/tmp/restart.txt` (o el equivalente en `backend/` para prod).

**`.env`:** en dev debe existir `~/emotioxv3/backend-dev/.env` (idealmente BD/credenciales distintas de producción).

**Google OAuth:** en Google Cloud Console, añade `https://dev.emotio.cx/api/auth/google/callback` como redirect URI de dev.

**Subdominio vía SSH (UAPI):** si hace falta crear el subdominio sin UI:  
`uapi SubDomain addsubdomain domain=dev rootdomain=emotio.cx dir=public_html/dev`

### 5.1 HTTPS / certificado para `dev.emotio.cx`

**Síntoma en el navegador:** el research frontend muestra *Initialization failed* y *Failed to fetch* al cargar `/runtime-config.json` o la API, **aunque los archivos existan** en `~/public_html/dev/research/`. Suele deberse a **TLS**: el servidor presenta un certificado cuyo nombre no coincide con `dev.emotio.cx` (p. ej. solo `emotio.cx`), y el navegador bloquea `fetch`.

**Opción recomendada (CA pública):** En cPanel: **SSL/TLS** → **SSL/TLS Status** / **Manage SSL Sites**, instala o renueva un certificado que incluya **`dev.emotio.cx`** (Let's Encrypt u otro DV). Si tu plan no ofrece AutoSSL al usuario, pídelo al hosting o usa el flujo de pedido de certificado del panel.

**Opción desarrollo (autofirmado):** Certificado local con SAN para `dev.emotio.cx`, instalado con UAPI. El navegador mostrará advertencia hasta que el usuario acepte la excepción o sustituyas el cert por uno de una CA.

```bash
# SSH como usuario cPanel (ajusta rutas si hace falta)
cd ~
openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout ssl-dev.key \
  -out ssl-dev.crt \
  -subj "/CN=dev.emotio.cx" \
  -extensions v3_req -config /dev/stdin <<'CNF'
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no
[req_distinguished_name]
CN = dev.emotio.cx
[v3_req]
subjectAltName = DNS:dev.emotio.cx, DNS:www.dev.emotio.cx
CNF

uapi SSL install_ssl domain=dev.emotio.cx cert=@ssl-dev.crt key=@ssl-dev.key cabundle=
chmod 600 ssl-dev.key
```

**Notas:** `curl` sin `-k` fallará contra un cert autofirmado; es esperable. No subas `ssl-dev.key` ni el cert al repositorio. Cuando tengas Let's Encrypt u otro cert válido, sustituye el instalado en **Manage SSL Sites** para el mismo dominio.

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
│   ├── api/                   # Passenger → ~/emotioxv3/backend (solo .htaccess + stub wsgi)
│   ├── research/              # Build research-frontend (Vite dist)
│   ├── participant/         # Build participant-frontend (Vite dist)
│   └── dev/                   # Subdominio dev.emotio.cx (document root)
│       ├── api/               # Passenger → ~/emotioxv3/backend-dev
│       ├── research/          # CI rama dev + runtime-config dev
│       └── participant/
└── emotioxv3/
    ├── backend/               # Producción: código + dist + .env
    └── backend-dev/           # Dev: código + dist + .env (no mezclar BD con prod si es posible)
```

Cada frontend (`research/`, `participant/`, y los análogos bajo `dev/`) incluye `index.html`, `runtime-config.json`, `.htaccess` según deploy.

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
