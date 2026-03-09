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
